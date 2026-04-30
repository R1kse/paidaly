import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { courierIcon, addressIcon, restaurantIcon } from '../map/markers';
import { RouteLine } from '../map/RouteLine';
import { useRoute, formatEta } from '../map/useRoute';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getSocket } from '../ws/socket';
import NotificationsToggle from '../components/NotificationsToggle';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

const STATUS_LABEL: Record<string, string> = {
  CREATED:    'Создан',
  CONFIRMED:  'Подтверждён',
  COOKING:    'Готовится',
  PICKED_UP:  'Курьер забрал',
  ON_THE_WAY: 'В пути',
  DELIVERED:  'Доставлен',
  CANCELED:   'Отменён',
};

const PICKUP_STATUSES = new Set(['CONFIRMED', 'COOKING']);
const FALLBACK: [number, number] = [43.238949, 76.889709];

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─── Delivery card ────────────────────────────────────────────────────────────

interface CardConfig {
  delivery: any;
  routeFrom: [number, number] | null;
  routeTo: [number, number] | null;
  etaLabel: string;
  isPickup: boolean;
  orderIndex: number;
}

function DeliveryCard({
  delivery,
  routeFrom,
  routeTo,
  etaLabel,
  isPickup,
  orderIndex,
  courierPos,
  restaurantPos,
  onStatusChange,
}: CardConfig & {
  courierPos: [number, number] | null;
  restaurantPos: [number, number] | null;
  onStatusChange: (orderId: string, status: string) => void;
}) {
  const clientPos: [number, number] | null =
    delivery.order.addressLat && delivery.order.addressLng
      ? [delivery.order.addressLat, delivery.order.addressLng]
      : null;

  const route = useRoute(routeFrom, routeTo);
  const center: [number, number] = routeTo ?? routeFrom ?? courierPos ?? FALLBACK;

  const STATUS_LABEL_RU: Record<string, string> = {
    CONFIRMED:  'Подтверждён',
    COOKING:    'Готовится',
    PICKED_UP:  'Забран',
    ON_THE_WAY: 'В пути',
    DELIVERED:  'Доставлен',
  };

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: `3px solid var(--accent)` }}>
      {/* Header row */}
      <div className="tracking-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="delivery-badge">{orderIndex + 1}</span>
            <h3 style={{ margin: 0, fontSize: 16 }}>Заказ #{delivery.order.id.slice(-6)}</h3>
            <span className={`status ${delivery.order.status}`}>
              {STATUS_LABEL[delivery.order.status] ?? delivery.order.status}
            </span>
          </div>
          {delivery.order.addressText && (
            <div className="small-text" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📍</span> {delivery.order.addressText}
            </div>
          )}
          {isPickup && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--accent2)', fontWeight: 500 }}>
              🏪 {orderIndex === 0 ? 'Едем в ресторан за заказом' : 'Заберёте вместе в ресторане'}
            </div>
          )}
          {!isPickup && orderIndex > 0 && (
            <div className="small-text" style={{ marginTop: 4 }}>
              После предыдущего заказа
            </div>
          )}
        </div>

        {route && etaLabel && (
          <div className="eta-block">
            <div className="eta-value">{formatEta(route.durationMin)}</div>
            <div className="eta-label">{etaLabel} · {route.distanceKm} км</div>
          </div>
        )}
      </div>

      {/* Mini info row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💰 {delivery.order.totalAmount?.toLocaleString()} ₸
        </div>
        {delivery.order.paymentMethod && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            💳 {delivery.order.paymentMethod}
          </div>
        )}
        {delivery.order.comment && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            💬 {delivery.order.comment}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map" style={{ marginBottom: 14, height: 300 }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            subdomains='abcd'
            maxZoom={20}
          />
          {route && <RouteLine coords={route.coords} />}
          {courierPos && <Marker position={courierPos} icon={courierIcon} />}
          {isPickup && restaurantPos && <Marker position={restaurantPos} icon={restaurantIcon} />}
          {!isPickup && clientPos && <Marker position={clientPos} icon={addressIcon} />}
          {!isPickup && orderIndex > 0 && routeFrom && (
            <Marker position={routeFrom} icon={addressIcon} />
          )}
        </MapContainer>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PICKUP_STATUSES.has(delivery.order.status) && (
          <button className="primary" style={{ flex: 1 }} onClick={() => onStatusChange(delivery.order.id, 'PICKED_UP')}>
            ✓ Забрал заказ
          </button>
        )}
        {delivery.order.status === 'PICKED_UP' && (
          <button className="primary" style={{ flex: 1 }} onClick={() => onStatusChange(delivery.order.id, 'ON_THE_WAY')}>
            🛵 В пути к клиенту
          </button>
        )}
        {(delivery.order.status === 'PICKED_UP' || delivery.order.status === 'ON_THE_WAY') && (
          <button className="primary" style={{ flex: 1 }} onClick={() => onStatusChange(delivery.order.id, 'DELIVERED')}>
            ✅ Доставлено
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourierPage() {
  const { data, refetch } = useQuery({
    queryKey: ['courier', 'active'],
    queryFn: async () => (await api.get('/courier/deliveries/active')).data,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/restaurant')).data,
  });

  const token = useAuthStore((s) => s.token);
  const [lastPos, setLastPos] = useState<[number, number] | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [geoError, setGeoError] = useState('');

  // Web-mode refs
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  // Native-mode ref
  const bgWatcherIdRef = useRef<string | null>(null);

  const restaurantPos: [number, number] | null = settings
    ? [settings.restaurantLat, settings.restaurantLng]
    : null;

  // ─── Geolocation: native (Capacitor) or web ──────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // ── Native: BackgroundGeolocation plugin ─────────────────────────────
      // Runs in foreground service — survives screen lock
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Передаём ваше местоположение диспетчеру',
          backgroundTitle: 'Доставка активна',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10,
        },
        (position?: { latitude: number; longitude: number }, error?: { code?: string }) => {
          if (error) {
            setGeoError('Нет доступа к геолокации. Разрешите в настройках.');
            return;
          }
          if (position) {
            const next = { lat: position.latitude, lng: position.longitude };
            lastPosRef.current = next;
            setLastPos([next.lat, next.lng]);
            setGeoError('');
            socket.emit('courier.location.update', next);
            setLastSentAt(new Date().toLocaleTimeString());
          }
        },
      ).then((id) => {
        bgWatcherIdRef.current = id;
      });

    } else {
      // ── Web: standard Geolocation API ────────────────────────────────────
      if (!navigator.geolocation) {
        setGeoError('Геолокация не поддерживается браузером');
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          lastPosRef.current = next;
          setLastPos([next.lat, next.lng]);
          setGeoError('');
        },
        () => setGeoError('Нет доступа к геолокации. Разрешите в настройках браузера.'),
        { enableHighAccuracy: true },
      );

      intervalIdRef.current = window.setInterval(() => {
        if (lastPosRef.current) {
          socket.emit('courier.location.update', lastPosRef.current);
          setLastSentAt(new Date().toLocaleTimeString());
        }
      }, 5000);
    }

    return () => {
      if (bgWatcherIdRef.current) {
        BackgroundGeolocation.removeWatcher({ id: bgWatcherIdRef.current });
        bgWatcherIdRef.current = null;
      }
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalIdRef.current != null) {
        window.clearInterval(intervalIdRef.current);
      }
    };
  }, [token]);

  const setStatus = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    refetch();
  };

  // ─── Sort: COOKING/CONFIRMED first, then PICKED_UP by nearest-neighbor ───
  const sortedDeliveries: any[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    const posOf = (d: any): [number, number] | null =>
      d.order.addressLat && d.order.addressLng
        ? [d.order.addressLat, d.order.addressLng]
        : null;

    const toPickup = data.filter((d: any) => PICKUP_STATUSES.has(d.order.status));
    const toDeliver = data.filter((d: any) => !PICKUP_STATUSES.has(d.order.status));

    const startPos: [number, number] = restaurantPos ?? lastPos ?? FALLBACK;
    const remaining = [...toDeliver];
    const sortedDeliver: any[] = [];
    let current = startPos;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const pos = posOf(remaining[i]);
        if (!pos) continue;
        const d = haversineKm(current, pos);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      const next = remaining.splice(nearestIdx, 1)[0];
      sortedDeliver.push(next);
      current = posOf(next) ?? current;
    }

    return [...toPickup, ...sortedDeliver];
  }, [data, lastPos, restaurantPos]);

  // ─── Build routing chain ─────────────────────────────────────────────────
  const cardConfigs: CardConfig[] = useMemo(() => {
    let prevDest: [number, number] | null = null;

    return sortedDeliveries.map((delivery, idx) => {
      const isPickup = PICKUP_STATUSES.has(delivery.order.status);
      const clientPos: [number, number] | null =
        delivery.order.addressLat && delivery.order.addressLng
          ? [delivery.order.addressLat, delivery.order.addressLng]
          : null;

      let routeFrom: [number, number] | null;
      let routeTo: [number, number] | null;
      let etaLabel: string;

      if (isPickup) {
        const isFirstPickup =
          idx === 0 || !PICKUP_STATUSES.has(sortedDeliveries[idx - 1]?.order.status);
        routeFrom = isFirstPickup ? lastPos : null;
        routeTo   = restaurantPos;
        etaLabel  = isFirstPickup ? 'до ресторана' : '';
        prevDest  = restaurantPos;
      } else {
        routeFrom = prevDest ?? lastPos;
        routeTo   = clientPos;
        etaLabel  = 'до клиента';
        prevDest  = clientPos ?? prevDest;
      }

      return { delivery, routeFrom, routeTo, etaLabel, isPickup, orderIndex: idx };
    });
  }, [sortedDeliveries, lastPos, restaurantPos]);

  const totalToday = cardConfigs.length;

  return (
    <section>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Мои доставки</h2>
          <p className="small-text">
            {totalToday > 0
              ? `${totalToday} ${totalToday === 1 ? 'активная доставка' : 'активных доставки'}`
              : 'Нет активных доставок'}
          </p>
        </div>
        <NotificationsToggle />
      </div>

      {/* Geo status */}
      {geoError && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--danger)' }}>
          <p className="error">📵 {geoError}</p>
        </div>
      )}
      {!geoError && lastSentAt && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          background: 'rgba(76,175,80,.12)',
          border: '1px solid rgba(76,175,80,.25)',
          borderRadius: 'var(--radius-pill)',
          marginBottom: 16,
          fontSize: 12,
          color: 'var(--green)',
          fontWeight: 500,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          Геолокация активна · {lastSentAt}
        </div>
      )}
      {!geoError && !lastPos && (
        <p className="small-text" style={{ marginBottom: 16 }}>⏳ Определяем координаты...</p>
      )}

      {/* Delivery cards */}
      {cardConfigs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛵</div>
          <h3 style={{ marginBottom: 8 }}>Нет активных доставок</h3>
          <p>Ожидайте назначения от диспетчера</p>
        </div>
      ) : (
        cardConfigs.map((cfg) => (
          <DeliveryCard
            key={cfg.delivery.deliveryId}
            {...cfg}
            courierPos={lastPos}
            restaurantPos={restaurantPos}
            onStatusChange={setStatus}
          />
        ))
      )}
    </section>
  );
}
