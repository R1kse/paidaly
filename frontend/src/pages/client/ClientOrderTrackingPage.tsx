import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { restaurantIcon, addressIcon, courierIcon } from '../../map/markers';
import { RouteLine } from '../../map/RouteLine';
import { useRoute, formatEta } from '../../map/useRoute';
import ChatPanel from '../../components/ChatPanel';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { getSocket, subscribeOrder, unsubscribeOrder } from '../../ws/socket';

const fallbackCenter: [number, number] = [43.238949, 76.889709];

const STATUS_LABEL: Record<string, string> = {
  CREATED:    'Создан',
  CONFIRMED:  'Подтверждён',
  COOKING:    'Готовится',
  PICKED_UP:  'Курьер забрал',
  ON_THE_WAY: 'В пути',
  DELIVERED:  'Доставлен',
  CANCELED:   'Отменён',
};

export default function ClientOrderTrackingPage() {
  const { orderId } = useParams();
  const token = useAuthStore((s) => s.token);
  const [order, setOrder] = useState<any>(null);
  const [courierPos, setCourierPos] = useState<[number, number] | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/restaurant')).data,
  });

  useEffect(() => {
    if (!orderId) return;
    api.get(`/orders/${orderId}`).then((res) => setOrder(res.data));
  }, [orderId]);

  useEffect(() => {
    if (!token || !orderId) return;
    const socket = getSocket(token);
    subscribeOrder(orderId);

    socket.on('order.status.changed', (payload) => {
      if (payload.orderId === orderId) {
        setOrder((prev: any) => (prev ? { ...prev, status: payload.status } : prev));
      }
    });

    socket.on('courier.location.updated', (payload) => {
      setCourierPos([payload.lat, payload.lng]);
    });

    return () => {
      socket.off('order.status.changed');
      socket.off('courier.location.updated');
      unsubscribeOrder(orderId);
    };
  }, [token, orderId]);

  const restaurantPos: [number, number] | null = settings
    ? [settings.restaurantLat, settings.restaurantLng]
    : null;

  const deliveryPos: [number, number] | null =
    order?.addressLat && order?.addressLng
      ? [order.addressLat, order.addressLng]
      : null;

  // ETA = курьер→ресторан + ресторан→клиент (пока не забрал), курьер→клиент (после)
  const pickedUp = ['PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELED'].includes(order?.status ?? '');
  const legToRestaurant = useRoute(courierPos, restaurantPos);
  const legToClient = useRoute(
    pickedUp ? (courierPos ?? restaurantPos) : restaurantPos,
    deliveryPos,
  );
  const etaDuration: number | null = !legToClient ? null
    : (!pickedUp && legToRestaurant) ? legToRestaurant.durationMin + legToClient.durationMin
    : legToClient.durationMin;

  const center: [number, number] = useMemo(() => {
    if (deliveryPos) return deliveryPos;
    if (restaurantPos) return restaurantPos;
    return fallbackCenter;
  }, [deliveryPos, restaurantPos]);

  if (!order) return (
    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <p className="small-text">Загрузка заказа...</p>
    </div>
  );

  const isActive = !['DELIVERED', 'CANCELED'].includes(order.status);

  const STEPS = [
    { key: 'CREATED',    label: 'Принят' },
    { key: 'CONFIRMED',  label: 'Подтверждён' },
    { key: 'COOKING',    label: 'Готовится' },
    { key: 'PICKED_UP',  label: 'Курьер забрал' },
    { key: 'ON_THE_WAY', label: 'В пути' },
    { key: 'DELIVERED',  label: 'Доставлен' },
  ];
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 760, margin: '0 auto' }}>
      {/* Status card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Заказ #{orderId?.slice(-6)}
            </div>
            <h3 style={{ margin: '4px 0 6px', fontSize: 22 }}>
              {order.status === 'ON_THE_WAY' ? 'В пути к вам' :
               order.status === 'DELIVERED' ? 'Доставлен!' :
               order.status === 'CANCELED' ? 'Отменён' :
               STATUS_LABEL[order.status] ?? order.status}
            </h3>
            <span className={`status ${order.status}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
          {etaDuration !== null && isActive && (
            <div className="eta-block">
              <div className="eta-value">{formatEta(etaDuration)}</div>
              <div className="eta-label">до доставки · {legToClient?.distanceKm} км</div>
            </div>
          )}
        </div>

        {/* Progress steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.filter((s) => s.key !== 'CANCELED').map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const last = idx === STEPS.filter((s) => s.key !== 'CANCELED').length - 1;
            return (
              <div key={step.key} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: last ? 0 : 14 }}>
                {!last && (
                  <div style={{
                    position: 'absolute', left: 9, top: 22, bottom: 0,
                    width: 2, background: done ? 'var(--green)' : 'var(--line)',
                  }} />
                )}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: active ? '#fff' : done ? 'var(--green)' : 'var(--line)',
                  border: active ? '3px solid var(--green)' : 'none',
                  display: 'grid', placeItems: 'center',
                  boxShadow: active ? '0 0 0 5px rgba(58,158,95,.2)' : 'none',
                  zIndex: 1,
                }}>
                  {done && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <path d="M4 12l5 5L20 6"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, paddingTop: 1 }}>
                  <div style={{ fontWeight: active ? 800 : 700, fontSize: 14, color: (done || active) ? 'var(--ink)' : 'var(--muted)' }}>
                    {step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!order.delivery && isActive && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-tint)', borderRadius: 12, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            ⏳ Ожидаем назначения курьера...
          </div>
        )}
      </div>

      {/* Map */}
      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>📍 Отслеживание на карте</h3>
        <div className="map">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
              subdomains='abcd'
              maxZoom={20}
            />
            {legToRestaurant && !pickedUp && courierPos && <RouteLine coords={legToRestaurant.coords} color="#f59e0b" />}
            {legToClient && <RouteLine coords={legToClient.coords} />}
            {restaurantPos && <Marker position={restaurantPos} icon={restaurantIcon} />}
            {deliveryPos && <Marker position={deliveryPos} icon={addressIcon} />}
            {courierPos && <Marker position={courierPos} icon={courierIcon} />}
          </MapContainer>
        </div>
        {isActive && !courierPos && order.delivery && (
          <p className="small-text" style={{ marginTop: 10 }}>
            Ожидаем геолокацию курьера...
          </p>
        )}
      </div>

      {/* Chat */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1.5px solid var(--line)', fontWeight: 800, fontSize: 15 }}>
          💬 Чат с рестораном
        </div>
        <div style={{ height: 320 }}>
          <ChatPanel orderId={orderId!} />
        </div>
      </div>
    </div>
  );
}
