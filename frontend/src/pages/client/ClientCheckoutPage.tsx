import { useMemo, useState } from 'react';
import { MapContainer, Marker, Circle, TileLayer, useMapEvents } from 'react-leaflet';
import { restaurantIcon, addressIcon } from '../../map/markers';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import { Link, useNavigate } from 'react-router-dom';

const defaultCenter: [number, number] = [43.238949, 76.889709];

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function ClickMarker({
  onSelect,
}: {
  onSelect: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
      onSelect(pos);
    },
  });
  return null;
}

export default function ClientCheckoutPage() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/restaurant')).data,
  });

  const { data: savedAddresses, refetch } = useQuery({
    queryKey: ['saved-addresses'],
    queryFn: async () => (await api.get('/profile/addresses')).data,
  });

  const cart = useCartStore();
  const [addressText, setAddressText] = useState('');
  const [address, setAddress] = useState<[number, number] | null>(null);
  const [preorder, setPreorder] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();

  const center: [number, number] = settings
    ? [settings.restaurantLat, settings.restaurantLng]
    : defaultCenter;

  const distanceKm = useMemo(() => {
    if (cart.deliveryType !== 'DELIVERY' || !address || !settings) return 0;
    return haversineKm(center, address);
  }, [address, settings, cart.deliveryType]);

  const freeRadius = settings?.freeDeliveryRadiusKm ?? 4;
  const longDistanceFee = settings?.longDistanceFeeKzt ?? 1500;
  const deliveryFee =
    cart.deliveryType === 'DELIVERY' && distanceKm > freeRadius ? longDistanceFee : 0;

  const handleCreate = async () => {
    setError('');
    if (cart.lines.length === 0) {
      setError('Корзина пуста');
      return;
    }

    if (cart.deliveryType === 'DELIVERY' && !address) {
      setError('Выберите адрес доставки');
      return;
    }

    try {
      const payload = {
        deliveryType: cart.deliveryType,
        paymentMethod: cart.paymentMethod,
        comment: cart.comment,
        scheduledFor: preorder && scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        addressText: cart.deliveryType === 'DELIVERY' ? addressText : undefined,
        addressLat: cart.deliveryType === 'DELIVERY' && address ? address[0] : undefined,
        addressLng: cart.deliveryType === 'DELIVERY' && address ? address[1] : undefined,
        items: cart.lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          modifierOptionIds: line.modifierOptionIds,
        })),
      };

      const { data } = await api.post('/orders', payload);
      cart.clear();
      navigate(`/client/orders/${data.orderId}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Ошибка создания заказа';
      setError(message);
    }
  };

  const search = async () => {
    setSearchError('');
    if (!query.trim()) return;
    try {
      // viewbox = bbox Алматы, bounded=1 — искать только внутри bbox, countrycodes=kz
      const params = new URLSearchParams({
        format: 'json',
        limit: '5',
        q: `${query.trim()}, Алматы`,
        countrycodes: 'kz',
        viewbox: '76.6,43.1,77.2,43.45',
        bounded: '1',
      });
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
      );
      const data = await resp.json();
      setResults(data);
      if (data.length === 0) {
        setSearchError('Адрес не найден в Алматы');
      }
    } catch {
      setSearchError('Не удалось выполнить поиск');
    }
  };

  const selectResult = (item: any) => {
    const pos: [number, number] = [Number(item.lat), Number(item.lon)];
    setAddress(pos);
    setAddressText(item.display_name);
    setResults([]);
  };

  const saveAddress = async (label: string) => {
    if (!address) return;
    await api.post('/profile/addresses', {
      label,
      addressText,
      lat: address[0],
      lng: address[1],
    });
    refetch();
  };

  const totalPrice = cart.lines.reduce((s, l) => s + l.basePrice * l.quantity, 0);

  return (
    <div className="checkout">
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/client/menu" style={{
            width: 40, height: 40, borderRadius: 12, background: 'var(--card)',
            display: 'grid', placeItems: 'center', border: '1.5px solid var(--line)',
            color: 'var(--ink)', fontSize: 18, textDecoration: 'none', boxShadow: 'var(--shadow-sm)',
          }}>←</Link>
          <div>
            <h3 style={{ margin: 0, fontSize: 20 }}>Оформление заказа</h3>
            <p className="small-text" style={{ margin: 0 }}>{cart.lines.length} позиций в корзине</p>
          </div>
        </div>

        {/* Delivery type */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
            Тип доставки
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['DELIVERY', 'PICKUP'] as const).map((t) => (
              <button
                key={t}
                onClick={() => cart.setDeliveryType(t)}
                style={{
                  padding: '14px',
                  borderRadius: 14,
                  border: `2px solid ${cart.deliveryType === t ? 'var(--green)' : 'var(--line)'}`,
                  background: cart.deliveryType === t ? 'var(--accent-bg)' : 'var(--bg-tint)',
                  color: cart.deliveryType === t ? 'var(--green-deep)' : 'var(--ink)',
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {t === 'DELIVERY' ? '🚴 Доставка' : '🏃 Самовывоз'}
              </button>
            ))}
          </div>
        </div>

        {/* Address search */}
        {cart.deliveryType === 'DELIVERY' && (
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
              Адрес доставки
            </div>
            <div className="inline" style={{ marginBottom: 8 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск адреса в Алматы..."
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && search()}
              />
              <button className="primary" onClick={search} style={{ flexShrink: 0, padding: '11px 16px', borderRadius: 12 }}>
                Найти
              </button>
            </div>
            {searchError && <div style={{ background: '#FBE4E4', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#8A2E2E', fontWeight: 700 }}>{searchError}</div>}
            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {results.map((r) => (
                  <button key={r.place_id} onClick={() => selectResult(r)} style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 12, padding: '8px 12px', borderRadius: 10 }}>
                    📍 {r.display_name}
                  </button>
                ))}
              </div>
            )}
            {address && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--accent-bg)', borderRadius: 12, fontSize: 13, color: 'var(--green-deep)', fontWeight: 700, border: '1.5px solid rgba(58,158,95,.3)' }}>
                ✓ {addressText}
              </div>
            )}
            {savedAddresses?.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 14, marginBottom: 8 }}>
                  Сохранённые адреса
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {savedAddresses.map((a: any) => (
                    <button key={a.id} onClick={() => { setAddress([a.lat, a.lng]); setAddressText(a.addressText); }} style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 12, padding: '8px 12px', borderRadius: 10 }}>
                      📍 {a.label}: {a.addressText}
                    </button>
                  ))}
                </div>
                {address && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => saveAddress('Дом')} style={{ fontSize: 12, padding: '7px 12px', borderRadius: 10 }}>💾 Дом</button>
                    <button onClick={() => saveAddress('Работа')} style={{ fontSize: 12, padding: '7px 12px', borderRadius: 10 }}>💾 Работа</button>
                  </div>
                )}
              </>
            )}
            {address && cart.deliveryType === 'DELIVERY' && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                Расстояние: {distanceKm.toFixed(2)} км · Доставка: <span style={{ color: deliveryFee > 0 ? 'var(--danger)' : 'var(--green)', fontWeight: 800 }}>{deliveryFee > 0 ? `${deliveryFee} ₸` : 'Бесплатно'}</span>
              </div>
            )}
          </div>
        )}

        {/* Payment */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
            Оплата
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              { v: 'KASPI', label: 'Kaspi Pay', icon: '💳' },
              { v: 'CARD', label: 'Банковская карта', icon: '🏦' },
              { v: 'CASH', label: 'Наличными курьеру', icon: '💵' },
            ] as const).map((p) => (
              <div
                key={p.v}
                onClick={() => cart.setPaymentMethod(p.v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--bg-tint)', borderRadius: 14, cursor: 'pointer',
                  border: `2px solid ${cart.paymentMethod === p.v ? 'var(--green)' : 'transparent'}`,
                }}
              >
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>{p.label}</span>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${cart.paymentMethod === p.v ? 'var(--green)' : 'var(--line)'}`,
                  display: 'grid', placeItems: 'center',
                }}>
                  {cart.paymentMethod === p.v && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preorder */}
        {settings?.allowPreorder && (
          <div className="card">
            <label className="inline">
              <input
                type="checkbox"
                checked={preorder}
                onChange={(e) => setPreorder(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span style={{ fontWeight: 700, fontSize: 14 }}>⏰ Предзаказ ко времени</span>
            </label>
            {preorder && (
              <label style={{ marginTop: 10 }}>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </label>
            )}
          </div>
        )}

        {/* Comment */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
            Комментарий курьеру
          </div>
          <textarea
            value={cart.comment}
            onChange={(e) => cart.setComment(e.target.value)}
            placeholder="Оставьте у двери, код домофона..."
            rows={2}
            style={{ resize: 'none' }}
          />
        </div>

        {/* Cart summary */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
            Ваш заказ
          </div>
          {cart.lines.length === 0 && (
            <p className="small-text" style={{ textAlign: 'center', padding: '12px 0' }}>Корзина пуста</p>
          )}
          {cart.lines.map((line) => (
            <div key={line.lineId} className="cart-item">
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13, fontWeight: 800 }}>{line.title}</strong>
                {line.modifiersLabel && <div className="small-text">{line.modifiersLabel}</div>}
              </div>
              <div className="qty">
                <button onClick={() => cart.decrement(line.lineId)}>−</button>
                <span>{line.quantity}</span>
                <button onClick={() => cart.increment(line.lineId)}>+</button>
              </div>
            </div>
          ))}
          {cart.lines.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1.5px solid var(--line)' }}>
                <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Подытог</span>
                <span style={{ fontWeight: 800 }}>{totalPrice} ₸</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Доставка</span>
                <span style={{ fontWeight: 800, color: deliveryFee > 0 ? 'var(--danger)' : 'var(--green)' }}>
                  {deliveryFee > 0 ? `${deliveryFee} ₸` : 'Бесплатно'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1.5px solid var(--line)' }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>К оплате</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{totalPrice + deliveryFee} ₸</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={{ background: '#FBE4E4', borderRadius: 14, padding: '12px 16px', fontSize: 13, color: '#8A2E2E', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <button
          className="primary"
          onClick={handleCreate}
          style={{ width: '100%', padding: '15px', fontWeight: 800, fontSize: 15, borderRadius: 16 }}
        >
          Оплатить и заказать — {totalPrice + deliveryFee} ₸
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>📍 Карта доставки</h3>
          <div className="map">
            <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                subdomains='abcd'
                maxZoom={20}
              />
              {settings && (
                <Circle
                  center={center}
                  radius={freeRadius * 1000}
                  pathOptions={{ color: '#3A9E5F', fillColor: '#3A9E5F', fillOpacity: 0.06, weight: 1.5, dashArray: '6 4' }}
                />
              )}
              <Marker position={center} icon={restaurantIcon} />
              {address && <Marker position={address} icon={addressIcon} />}
              <ClickMarker onSelect={setAddress} />
            </MapContainer>
          </div>
          {cart.deliveryType === 'DELIVERY' && (
            <p className="small-text" style={{ marginTop: 10 }}>
              Нажмите на карту, чтобы выбрать адрес. Бесплатно до {freeRadius} км.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
