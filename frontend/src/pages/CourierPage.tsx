import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { courierIcon, addressIcon, restaurantIcon } from '../map/markers';
import { RouteLine } from '../map/RouteLine';
import { useRoute, formatEta } from '../map/useRoute';
import ChatPanel from '../components/ChatPanel';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getSocket } from '../ws/socket';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

// ─── Design tokens ─────────────────────────────────────────────────────────
const BG    = '#0E1814';
const CARD  = '#172521';
const GREEN = '#3A9E5F';
const LIME  = '#8BC34A';
const TEXT  = '#E8F3EC';
const MUTED = '#8FA69A';
const BORD  = 'rgba(255,255,255,0.06)';

// ─── SVG icon ───────────────────────────────────────────────────────────────
const IC = {
  list:  'M4 6h16M4 12h16M4 18h16',
  map:   'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v16M15 6v16',
  chart: 'M3 21h18M7 17v-5M12 17V8M17 17v-9',
  user:  'M20 21c-1-4.5-4.5-7-8-7s-7 2.5-8 7M12 11a4 4 0 100-8 4 4 0 000 8z',
  chevL: 'M15 6l-6 6 6 6',
  pin:   'M12 22s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z',
  route: 'M6 8.5V14a4 4 0 004 4h5.5',
  clock: 'M12 3a9 9 0 100 18A9 9 0 0012 3zM12 7v5l3 2',
  check: 'M4 12l5 5L20 6',
  phone: 'M22 17v3a2 2 0 01-2.2 2 19 19 0 01-8.3-3 19 19 0 01-6-6A19 19 0 012.5 4.8 2 2 0 014.5 3h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2L8.2 10.8a16 16 0 006 6l1.4-1.4a2 2 0 012-.5c.9.3 1.8.5 2.7.6A2 2 0 0122 17z',
  bag:   'M4 8h16l-1.2 12.1a1 1 0 01-1 .9H6.2a1 1 0 01-1-.9L4 8zM8 8V6a4 4 0 018 0v2',
};

function Ico({ d, size = 20, color = TEXT, sw = 1.8 }: { d: string; size?: number; color?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ─── Constants ──────────────────────────────────────────────────────────────
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

// ─── Haversine ──────────────────────────────────────────────────────────────
function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

interface CardConfig {
  delivery: any;
  routeFrom: [number, number] | null;
  routeTo: [number, number] | null;
  etaLabel: string;
  isPickup: boolean;
  orderIndex: number;
}

function nextAction(status: string): { label: string; next: string } | null {
  if (PICKUP_STATUSES.has(status)) return { label: '✓ Я забрал из ресторана', next: 'PICKED_UP' };
  if (status === 'PICKED_UP')      return { label: '🛵 В пути к клиенту',      next: 'ON_THE_WAY' };
  if (status === 'ON_THE_WAY')     return { label: '✅ Доставил',              next: 'DELIVERED' };
  return null;
}

// ─── Active order card (calls useRoute) ─────────────────────────────────────
function ActiveOrderCard({ cfg, onStatusChange, onSelect }: {
  cfg: CardConfig;
  onStatusChange: (id: string, s: string) => void;
  onSelect: (d: any) => void;
}) {
  const route = useRoute(cfg.routeFrom, cfg.routeTo);
  const { delivery } = cfg;
  const order = delivery.order;
  const act = nextAction(order.status);

  return (
    <div
      onClick={() => onSelect(delivery)}
      style={{ background: `linear-gradient(135deg,${GREEN},${LIME})`, borderRadius: 20, padding: 16, color: '#fff', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>ЗАКАЗ #{order.id.slice(-6).toUpperCase()}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {route ? `${route.distanceKm} км · ${formatEta(route.durationMin)}` : '...'}
          </div>
        </div>
        <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
          {(STATUS_LABEL[order.status] ?? order.status).toUpperCase()}
        </span>
      </div>

      {order.addressText && (
        <div style={{ marginTop: 12, padding: 10, background: 'rgba(0,0,0,0.15)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Ico d={IC.pin} size={16} color="#fff" />
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
            {order.addressText}
            {order.comment && <><br /><span style={{ opacity: 0.7, fontWeight: 500 }}>{order.comment}</span></>}
          </div>
        </div>
      )}

      {act && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, act.next); }}
          style={{ width: '100%', marginTop: 12, padding: 14, border: 0, borderRadius: 14, background: '#fff', color: '#1B3A2D', fontWeight: 800, fontSize: 14, fontFamily: 'Nunito,sans-serif', cursor: 'pointer' }}
        >
          {act.label}
        </button>
      )}
    </div>
  );
}

// ─── Queue item (calls useRoute) ─────────────────────────────────────────────
function QueueItem({ cfg, onSelect }: { cfg: CardConfig; onSelect: (d: any) => void }) {
  const route = useRoute(cfg.routeFrom, cfg.routeTo);
  const order = cfg.delivery.order;

  return (
    <div
      onClick={() => onSelect(cfg.delivery)}
      style={{ background: CARD, borderRadius: 16, padding: 14, marginBottom: 10, border: `1px solid ${BORD}`, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>ЗАКАЗ #{order.id.slice(-6).toUpperCase()}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 3, color: TEXT }}>{order.addressText ?? 'Самовывоз'}</div>
        </div>
        <span style={{ padding: '3px 8px', background: 'rgba(139,195,74,0.12)', color: LIME, borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
          {(STATUS_LABEL[order.status] ?? order.status).toUpperCase()}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Ico d={IC.route} size={12} color={LIME} />{route ? `${route.distanceKm} км` : '...'}
        </span>
        <span style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Ico d={IC.clock} size={12} color={LIME} />{route ? formatEta(route.durationMin) : '...'}
        </span>
        <span style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Ico d={IC.bag} size={12} color={LIME} />{order.orderItems?.length ?? '?'} поз.
        </span>
      </div>
    </div>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────────
function DetailView({ delivery, onBack, onStatusChange }: {
  delivery: any;
  onBack: () => void;
  onStatusChange: (id: string, s: string) => void;
}) {
  const order = delivery.order;
  const act = nextAction(order.status);
  const initials = (order.client?.name ?? 'КЛ').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const [showChat, setShowChat] = useState(false);

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 140 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 12, background: CARD, border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Ico d={IC.chevL} size={18} color={TEXT} />
        </button>
        <div>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 800 }}>ЗАКАЗ #{order.id.slice(-6).toUpperCase()}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: TEXT }}>Детали</div>
        </div>
      </div>

      {/* Pickup section */}
      {PICKUP_STATUSES.has(order.status) && (
        <div style={{ padding: '10px 20px' }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>Забрать</div>
          <div style={{ background: CARD, borderRadius: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,195,74,0.15)', display: 'grid', placeItems: 'center', fontSize: 22 }}>🏬</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: TEXT }}>Кухня Paidaly</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Адрес ресторана</div>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      {order.orderItems && order.orderItems.length > 0 && (
        <div style={{ padding: '10px 20px' }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
            Состав · {order.orderItems.length} {order.orderItems.length === 1 ? 'блюдо' : 'блюда'}
          </div>
          <div style={{ background: CARD, borderRadius: 16, padding: 4 }}>
            {order.orderItems.map((item: any, i: number, a: any[]) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: i < a.length - 1 ? `1px solid ${BORD}` : 'none' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(139,195,74,0.1)', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>🥗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.titleSnapshot}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>×{item.quantity} · {item.lineTotal.toLocaleString()}₸</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: GREEN, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Ico d={IC.check} size={12} color="#fff" sw={3} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliver to client */}
      <div style={{ padding: '10px 20px' }}>
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>Доставить</div>
        <div style={{ background: CARD, borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${LIME},${GREEN})`, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 14, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: TEXT }}>{order.client?.name ?? 'Клиент'}</div>
              <div style={{ fontSize: 11, color: MUTED }}>{order.client?.phone ?? ''}</div>
            </div>
          </div>
          {order.comment && (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(74,189,232,0.08)', borderRadius: 12, fontSize: 12, color: '#B4DCEC', lineHeight: 1.4 }}>
              💬 «{order.comment}»
            </div>
          )}
          {order.addressText && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: '1px dashed rgba(139,195,74,0.3)' }}>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>АДРЕС</div>
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 2, color: TEXT }}>{order.addressText}</div>
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>
            Итого: <span style={{ color: TEXT, fontWeight: 800 }}>{order.totalAmount?.toLocaleString()}₸</span>
          </div>
        </div>
      </div>

      {/* Chat section */}
      <div style={{ padding: '10px 20px 160px' }}>
        <button
          onClick={() => setShowChat(v => !v)}
          style={{ width: '100%', padding: '12px 16px', border: `1px solid ${BORD}`, borderRadius: 14, background: CARD, color: TEXT, fontWeight: 700, fontSize: 13, fontFamily: 'Nunito,sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span>💬 Чат с диспетчером</span>
          <span style={{ color: MUTED, fontSize: 18, lineHeight: 1 }}>{showChat ? '▲' : '▼'}</span>
        </button>
        {showChat && (
          <div style={{ marginTop: 8, borderRadius: 16, overflow: 'hidden', border: `1px solid ${BORD}`, height: 320 }}>
            <ChatPanel orderId={order.id} dark />
          </div>
        )}
      </div>

      {/* Fixed action bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px 24px', background: `linear-gradient(to top,${BG} 70%,transparent)`, zIndex: 200 }}>
        {act && (
          <button
            onClick={() => { onStatusChange(order.id, act.next); onBack(); }}
            style={{ width: '100%', padding: 16, border: 0, borderRadius: 14, background: `linear-gradient(135deg,${GREEN},${LIME})`, color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: 'Nunito,sans-serif', marginBottom: 8, cursor: 'pointer' }}
          >
            {act.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Map tab ─────────────────────────────────────────────────────────────────
function MapTab({ cfg, courierPos, restaurantPos, onStatusChange }: {
  cfg: CardConfig | null;
  courierPos: [number, number] | null;
  restaurantPos: [number, number] | null;
  onStatusChange: (id: string, s: string) => void;
}) {
  const route = useRoute(cfg?.routeFrom ?? null, cfg?.routeTo ?? null);
  const center: [number, number] = cfg?.routeTo ?? cfg?.routeFrom ?? courierPos ?? FALLBACK;

  if (!cfg) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🗺️</div>
        <div style={{ color: MUTED, fontSize: 14, fontWeight: 700 }}>Нет активных доставок</div>
      </div>
    );
  }

  const { delivery, isPickup } = cfg;
  const order = delivery.order;
  const clientPos: [number, number] | null = order.addressLat && order.addressLng
    ? [order.addressLat, order.addressLng] : null;
  const act = nextAction(order.status);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
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
      </MapContainer>

      {/* Top overlay */}
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, zIndex: 500 }}>
        <div style={{ background: CARD, borderRadius: 14, padding: '10px 14px', border: `1px solid ${BORD}` }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 800 }}>СЛЕДУЮЩАЯ ТОЧКА</div>
          <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2, color: TEXT }}>
            {isPickup ? 'Ресторан Paidaly' : (order.addressText ?? 'Клиент')}
            {route ? ` · ${route.distanceKm} км · ${formatEta(route.durationMin)}` : ''}
          </div>
        </div>
      </div>

      {/* Bottom card */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, background: CARD, borderRadius: '24px 24px 0 0', padding: 16, borderTop: `1px solid ${BORD}` }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: act ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 800 }}>ЗАКАЗ #{order.id.slice(-6).toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: TEXT }}>
              {route ? `~${formatEta(route.durationMin)} до ${isPickup ? 'ресторана' : 'клиента'}` : '...'}
            </div>
          </div>
        </div>
        {act && (
          <button
            onClick={() => onStatusChange(order.id, act.next)}
            style={{ width: '100%', padding: 14, border: 0, borderRadius: 14, background: `linear-gradient(135deg,${GREEN},${LIME})`, color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'Nunito,sans-serif', cursor: 'pointer' }}
          >
            {act.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Stats tab ───────────────────────────────────────────────────────────────
function StatsTab({ deliveries }: { deliveries: any[] }) {
  const active = deliveries.length;
  const total  = deliveries.reduce((s, d) => s + (d.order.totalAmount ?? 0), 0);

  const metrics = [
    { l: 'Заказов',   v: String(active),              d: 'активных',    c: LIME },
    { l: 'Сумма',     v: `${total.toLocaleString()}₸`, d: 'к получению', c: '#4ABDE8' },
    { l: 'Рейтинг',   v: '4.9 ⭐',                    d: 'средний',     c: '#F9C74F' },
    { l: 'Статус',     v: 'НА ЛИНИИ',                  d: 'активна',     c: TEXT },
  ];

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>Статистика смены</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
          {new Date().toLocaleDateString('ru', { day: 'numeric', month: 'long' })} · активная смена
        </div>
      </div>

      {/* Hero earnings */}
      <div style={{ margin: '14px 20px', background: `linear-gradient(135deg,#1A2620,${BG})`, borderRadius: 24, padding: 20, border: '1px solid rgba(139,195,74,0.15)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,195,74,0.25),transparent 70%)' }} />
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 1 }}>К ПОЛУЧЕНИЮ СЕГОДНЯ</div>
        <div style={{ fontSize: 42, fontWeight: 700, marginTop: 6, background: `linear-gradient(135deg,${LIME},${GREEN})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {total.toLocaleString()}₸
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
          <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(139,195,74,0.15)', color: LIME, fontSize: 11, fontWeight: 800 }}>
            {active} {active === 1 ? 'заказ' : 'заказа'}
          </span>
        </div>
        {/* Bar chart */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
          {[35, 55, 40, 70, 45, 85, 100, 60].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? `linear-gradient(180deg,${LIME},${GREEN})` : 'rgba(139,195,74,0.25)', borderRadius: 4 }} />
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {metrics.map(m => (
          <div key={m.l} style={{ background: CARD, borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 800, letterSpacing: 0.5 }}>{m.l.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: m.c }}>{m.v}</div>
            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 4 }}>{m.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────
function ProfileTab({ geoError, lastSentAt }: { geoError: string; lastSentAt: string | null }) {
  const user   = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const initials = (user?.name ?? '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>Профиль</div>
      </div>

      {/* Avatar card */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ background: CARD, borderRadius: 20, padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${LIME},${GREEN})`, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 24, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: TEXT }}>{user?.name ?? '—'}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{user?.email ?? ''}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px 4px 8px', background: 'rgba(139,195,74,0.15)', borderRadius: 999 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: LIME, display: 'inline-block' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: LIME }}>НА ЛИНИИ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Geo status */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ background: CARD, borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 0.5, marginBottom: 8 }}>ГЕОЛОКАЦИЯ</div>
          {geoError
            ? <div style={{ color: '#E07070', fontSize: 13, fontWeight: 600 }}>📵 {geoError}</div>
            : <div style={{ color: LIME, fontSize: 13, fontWeight: 700 }}>✅ {lastSentAt ? `Активна · ${lastSentAt}` : 'Определяем...'}</div>
          }
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '16px 20px' }}>
        <button
          onClick={logout}
          style={{ width: '100%', padding: 16, border: '1px solid rgba(224,112,112,0.3)', borderRadius: 14, background: 'transparent', color: '#E07070', fontWeight: 800, fontSize: 15, fontFamily: 'Nunito,sans-serif', cursor: 'pointer' }}
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

// ─── Bottom tab bar ──────────────────────────────────────────────────────────
const TABS = [
  { k: 'orders'  as const, d: IC.list,  l: 'Заказы'  },
  { k: 'map'     as const, d: IC.map,   l: 'Карта'   },
  { k: 'stats'   as const, d: IC.chart, l: 'Смена'   },
  { k: 'profile' as const, d: IC.user,  l: 'Профиль' },
];

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CourierPage() {
  const { data, refetch } = useQuery({
    queryKey: ['courier', 'active'],
    queryFn: async () => (await api.get('/courier/deliveries/active')).data,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/restaurant')).data,
  });

  const token = useAuthStore(s => s.token);
  const user  = useAuthStore(s => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'Курьер';

  const [tab, setTab]                   = useState<'orders' | 'map' | 'stats' | 'profile'>('orders');
  const [selectedDelivery, setSelected] = useState<any | null>(null);
  const [lastPos, setLastPos]           = useState<[number, number] | null>(null);
  const [lastSentAt, setLastSentAt]     = useState<string | null>(null);
  const [geoError, setGeoError]         = useState('');

  const lastPosRef      = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef      = useRef<number | null>(null);
  const intervalIdRef   = useRef<number | null>(null);
  const bgWatcherIdRef  = useRef<string | null>(null);

  const restaurantPos: [number, number] | null = settings
    ? [settings.restaurantLat, settings.restaurantLng] : null;

  // ─── Geolocation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket   = getSocket(token);
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      BackgroundGeolocation.addWatcher(
        { backgroundMessage: 'Передаём ваше местоположение диспетчеру', backgroundTitle: 'Доставка активна', requestPermissions: true, stale: false, distanceFilter: 10 },
        (position?: { latitude: number; longitude: number }, error?: { code?: string }) => {
          if (error) { setGeoError('Нет доступа к геолокации. Разрешите в настройках.'); return; }
          if (position) {
            const next = { lat: position.latitude, lng: position.longitude };
            lastPosRef.current = next;
            setLastPos([next.lat, next.lng]);
            setGeoError('');
            socket.emit('courier.location.update', next);
            setLastSentAt(new Date().toLocaleTimeString());
          }
        },
      ).then(id => { bgWatcherIdRef.current = id; });
    } else {
      if (!navigator.geolocation) { setGeoError('Геолокация не поддерживается браузером'); return; }
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => {
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
      if (bgWatcherIdRef.current) { BackgroundGeolocation.removeWatcher({ id: bgWatcherIdRef.current }); bgWatcherIdRef.current = null; }
      if (watchIdRef.current   != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalIdRef.current != null) window.clearInterval(intervalIdRef.current);
    };
  }, [token]);

  const setStatus = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    refetch();
  };

  // ─── Sort deliveries ───────────────────────────────────────────────────────
  const sortedDeliveries: any[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    const posOf = (d: any): [number, number] | null =>
      d.order.addressLat && d.order.addressLng ? [d.order.addressLat, d.order.addressLng] : null;
    const toPickup  = data.filter((d: any) =>  PICKUP_STATUSES.has(d.order.status));
    const toDeliver = data.filter((d: any) => !PICKUP_STATUSES.has(d.order.status));
    const startPos: [number, number] = restaurantPos ?? lastPos ?? FALLBACK;
    const remaining = [...toDeliver];
    const sorted: any[] = [];
    let cur = startPos;
    while (remaining.length > 0) {
      let ni = 0, nd = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const pos = posOf(remaining[i]);
        if (!pos) continue;
        const d = haversineKm(cur, pos);
        if (d < nd) { nd = d; ni = i; }
      }
      const next = remaining.splice(ni, 1)[0];
      sorted.push(next);
      cur = posOf(next) ?? cur;
    }
    return [...toPickup, ...sorted];
  }, [data, lastPos, restaurantPos]);

  // ─── Build routing chain ───────────────────────────────────────────────────
  const cardConfigs: CardConfig[] = useMemo(() => {
    let prevDest: [number, number] | null = null;
    return sortedDeliveries.map((delivery, idx) => {
      const isPickup  = PICKUP_STATUSES.has(delivery.order.status);
      const clientPos: [number, number] | null = delivery.order.addressLat && delivery.order.addressLng
        ? [delivery.order.addressLat, delivery.order.addressLng] : null;
      let routeFrom: [number, number] | null, routeTo: [number, number] | null, etaLabel: string;
      if (isPickup) {
        const first = idx === 0 || !PICKUP_STATUSES.has(sortedDeliveries[idx - 1]?.order.status);
        routeFrom = first ? lastPos : null;
        routeTo   = restaurantPos;
        etaLabel  = first ? 'до ресторана' : '';
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

  const [firstCfg, ...queueCfgs] = cardConfigs;
  const showTabBar = !selectedDelivery;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: BG, fontFamily: 'Nunito,sans-serif', color: TEXT, overflow: 'hidden' }}>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: 'env(safe-area-inset-top)' }}>

        {/* Detail view overlays orders tab */}
        {selectedDelivery ? (
          <DetailView
            delivery={selectedDelivery}
            onBack={() => setSelected(null)}
            onStatusChange={setStatus}
          />

        ) : tab === 'orders' ? (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Смена</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Привет, {firstName}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 8px', background: 'rgba(139,195,74,0.15)', borderRadius: 999 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: LIME, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: LIME }}>НА ЛИНИИ</span>
                </div>
              </div>

              {/* Stats tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
                {[
                  { v: String(cardConfigs.length), l: 'заказов' },
                  { v: sortedDeliveries.reduce((s, d) => s + (d.order.totalAmount ?? 0), 0).toLocaleString() + '₸', l: 'сумма' },
                  { v: geoError ? '❌' : lastSentAt ? '✅' : '⏳', l: 'геолокация' },
                ].map((s, i) => (
                  <div key={i} style={{ background: CARD, borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2, fontWeight: 700 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Empty state */}
            {cardConfigs.length === 0 ? (
              <div style={{ margin: '20px', background: CARD, borderRadius: 20, padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🛵</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Нет активных доставок</div>
                <div style={{ color: MUTED, fontSize: 13 }}>Ожидайте назначения от диспетчера</div>
              </div>
            ) : (
              <>
                {/* Active order */}
                <div style={{ padding: '4px 20px' }}>
                  <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', margin: '8px 0' }}>
                    Активный заказ
                  </div>
                  <ActiveOrderCard cfg={firstCfg} onStatusChange={setStatus} onSelect={setSelected} />
                </div>

                {/* Queue */}
                {queueCfgs.length > 0 && (
                  <div style={{ padding: '14px 20px 90px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        Очередь · {queueCfgs.length}
                      </div>
                    </div>
                    {queueCfgs.map(cfg => (
                      <QueueItem key={cfg.delivery.deliveryId} cfg={cfg} onSelect={setSelected} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        ) : tab === 'map' ? (
          <MapTab cfg={firstCfg ?? null} courierPos={lastPos} restaurantPos={restaurantPos} onStatusChange={setStatus} />

        ) : tab === 'stats' ? (
          <StatsTab deliveries={sortedDeliveries} />

        ) : (
          <ProfileTab geoError={geoError} lastSentAt={lastSentAt} />
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      {showTabBar && (
        <div style={{ background: 'rgba(14,24,20,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${BORD}`, padding: '10px 8px calc(10px + env(safe-area-inset-bottom,0px))', display: 'flex', justifyContent: 'space-around', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: tab === t.k ? LIME : MUTED, fontWeight: tab === t.k ? 800 : 600, fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px', fontFamily: 'Nunito,sans-serif' }}
            >
              <Ico d={t.d} size={22} color={tab === t.k ? LIME : MUTED} />
              {t.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
