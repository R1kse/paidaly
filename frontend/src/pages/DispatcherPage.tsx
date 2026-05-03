import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, ArcElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { restaurantIcon, courierIcon, addressIcon } from '../map/markers';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getSocket } from '../ws/socket';
import ChatPanel from '../components/ChatPanel';
import NotificationsToggle from '../components/NotificationsToggle';

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, ArcElement,
  Tooltip, Legend, Filler,
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'orders' | 'couriers' | 'map';

const STATUS_OPTIONS = ['', 'CREATED', 'CONFIRMED', 'COOKING', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELED'];

const STATUS_LABEL: Record<string, string> = {
  CREATED:    'Создан',
  CONFIRMED:  'Подтверждён',
  COOKING:    'Готовится',
  PICKED_UP:  'Забран',
  ON_THE_WAY: 'В пути',
  DELIVERED:  'Доставлен',
  CANCELED:   'Отменён',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  CREATED:    'badge-gray',
  CONFIRMED:  'badge-blue',
  COOKING:    'badge-orange',
  PICKED_UP:  'badge-teal',
  ON_THE_WAY: 'badge-purple',
  DELIVERED:  'badge-green',
  CANCELED:   'badge-red',
};

const CHART_COLORS = {
  primary:   '#6c63ff',
  teal:      '#4ecdc4',
  red:       '#ff6b6b',
  yellow:    '#ffd93d',
  green:     '#4caf50',
  orange:    '#ff9800',
  blue:      '#2196f3',
  border:    'rgba(46,51,80,.8)',
  text:      '#8b92b8',
};

// ─── Chart defaults ────────────────────────────────────────────────────────────

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { color: CHART_COLORS.border },
      ticks: { color: CHART_COLORS.text, font: { size: 11 } },
    },
    y: {
      grid: { color: CHART_COLORS.border },
      ticks: { color: CHART_COLORS.text, font: { size: 11 } },
    },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-KZ') + ' ₸';
}

function getDayOfWeek(d: Date) {
  return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()];
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={STATUS_BADGE_CLASS[status] ?? 'badge-gray'}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeTab: Tab;
  onTab: (t: Tab) => void;
  activeOrderCount: number;
  user: { name: string } | null;
  onLogout: () => void;
}

function Sidebar({ activeTab, onTab, activeOrderCount, user, onLogout }: SidebarProps) {
  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '📊', label: 'Дашборд' },
    { id: 'orders',    icon: '📋', label: 'Заказы' },
    { id: 'couriers',  icon: '🛵', label: 'Курьеры' },
    { id: 'map',       icon: '🗺️', label: 'Карта' },
  ];

  return (
    <nav className="dispatcher-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🥗</div>
        <div>
          <div className="sidebar-logo-text">Paidaly</div>
          <div className="sidebar-logo-sub">Food Delivery</div>
        </div>
      </div>

      <div className="sidebar-section">Диспетчер</div>

      {navItems.map((item) => (
        <button
          key={item.id}
          className={`sidebar-nav-item${activeTab === item.id ? ' active' : ''}`}
          onClick={() => onTab(item.id)}
        >
          <span className="sidebar-nav-icon">{item.icon}</span>
          {item.label}
          {item.id === 'orders' && activeOrderCount > 0 && (
            <span className="sidebar-nav-badge">{activeOrderCount}</span>
          )}
        </button>
      ))}

      <div className="sidebar-bottom">
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">
            {user?.name?.slice(0, 2).toUpperCase() ?? 'ДД'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'Диспетчер'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>DISPATCHER</div>
          </div>
          <button
            className="link-button"
            onClick={onLogout}
            style={{ padding: '4px 8px', fontSize: 11, flexShrink: 0 }}
          >
            Выйти
          </button>
        </div>
        <NotificationsToggle />
      </div>
    </nav>
  );
}

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────

interface DashboardProps {
  orders: any[] | undefined;
  couriers: any[] | undefined;
  onViewOrders: () => void;
}

function DashboardTab({ orders, couriers, onViewOrders }: DashboardProps) {
  // ── KPI computation ──────────────────────────────────────────────────────────
  const { todayOrders, revenue, activeCount, onlineCouriers } = useMemo(() => {
    const all = orders ?? [];
    const todayOrders = all.filter((o) => isToday(new Date(o.createdAt)));
    const revenue = todayOrders.reduce((s: number, o: any) => s + (o.totalAmount ?? 0), 0);
    const activeCount = all.filter((o) => !['DELIVERED', 'CANCELED'].includes(o.status)).length;
    const onlineCouriers = (couriers ?? []).filter((c: any) => c.lastLocation).length;
    return { todayOrders, revenue, activeCount, onlineCouriers };
  }, [orders, couriers]);

  // ── Hourly chart (today) ──────────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const hours = Array(10).fill(0); // 09–18
    (orders ?? []).forEach((o: any) => {
      const d = new Date(o.createdAt);
      if (isToday(d)) {
        const h = d.getHours() - 9;
        if (h >= 0 && h < 10) hours[h]++;
      }
    });
    return hours;
  }, [orders]);

  // ── Status breakdown ─────────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (orders ?? []).forEach((o: any) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    return counts;
  }, [orders]);

  const statusKeys   = ['CREATED', 'CONFIRMED', 'COOKING', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELED'];
  const statusColors = [CHART_COLORS.text, CHART_COLORS.blue, CHART_COLORS.orange, CHART_COLORS.yellow, CHART_COLORS.primary, CHART_COLORS.green, CHART_COLORS.red];

  // ── Weekly revenue (computed from orders, padded) ────────────────────────────
  const weeklyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      map[key] = 0;
      labels.push(getDayOfWeek(d));
    }
    (orders ?? []).forEach((o: any) => {
      const key = new Date(o.createdAt).toDateString();
      if (key in map) map[key] += o.totalAmount ?? 0;
    });
    return { labels, data: Object.values(map).map((v) => Math.round(v / 1000)) };
  }, [orders]);

  const activeOrders = (orders ?? []).filter((o: any) => !['DELIVERED', 'CANCELED'].includes(o.status));

  return (
    <>
      {/* KPI row */}
      <div className="kpi-grid">
        <div className="kpi-card c1">
          <div className="kpi-label">Заказов сегодня</div>
          <div className="kpi-value">{todayOrders.length}</div>
          <div className="kpi-delta up">● Активных: {activeCount}</div>
          <div className="kpi-icon">📋</div>
        </div>
        <div className="kpi-card c2">
          <div className="kpi-label">Выручка (₸)</div>
          <div className="kpi-value" style={{ fontSize: revenue > 99999 ? 20 : 28 }}>
            {fmtMoney(revenue)}
          </div>
          <div className="kpi-delta up">за сегодня</div>
          <div className="kpi-icon">💰</div>
        </div>
        <div className="kpi-card c3">
          <div className="kpi-label">Активных курьеров</div>
          <div className="kpi-value">{onlineCouriers} / {(couriers ?? []).length}</div>
          <div className={`kpi-delta ${onlineCouriers > 0 ? 'up' : 'down'}`}>
            {onlineCouriers > 0 ? '● Онлайн' : '● Нет онлайн'}
          </div>
          <div className="kpi-icon">🛵</div>
        </div>
        <div className="kpi-card c4">
          <div className="kpi-label">Всего заказов</div>
          <div className="kpi-value">{(orders ?? []).length}</div>
          <div className="kpi-delta up">в базе</div>
          <div className="kpi-icon">📦</div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-card-title">
            Заказы по часам <span>сегодня (09:00–18:00)</span>
          </div>
          <Line
            height={80}
            data={{
              labels: ['09','10','11','12','13','14','15','16','17','18'],
              datasets: [{
                label: 'Заказы',
                data: hourlyData,
                borderColor: CHART_COLORS.primary,
                backgroundColor: 'rgba(108,99,255,.12)',
                fill: true,
                tension: .4,
                pointRadius: 4,
                pointBackgroundColor: CHART_COLORS.primary,
              }],
            }}
            options={chartDefaults}
          />
        </div>

        <div className="chart-card">
          <div className="chart-card-title">
            По статусам <span>сейчас</span>
          </div>
          <Doughnut
            height={160}
            data={{
              labels: statusKeys.map((s) => STATUS_LABEL[s]),
              datasets: [{
                data: statusKeys.map((s) => statusCounts[s] ?? 0),
                backgroundColor: statusColors,
                borderWidth: 0,
              }],
            }}
            options={{
              cutout: '62%',
              plugins: { legend: { display: false } },
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {statusKeys.map((s, i) => {
              const count = statusCounts[s] ?? 0;
              const total = (orders ?? []).length || 1;
              return (
                <div key={s} className="stat-row">
                  <div className="stat-label">{STATUS_LABEL[s]}</div>
                  <div className="stat-bar-wrap">
                    <div className="stat-bar" style={{ width: `${(count / total) * 100}%`, background: statusColors[i] }} />
                  </div>
                  <div className="stat-value">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="charts-row-2">
        <div className="chart-card">
          <div className="chart-card-title">
            Выручка за 7 дней <span>(тыс. ₸)</span>
          </div>
          <Bar
            height={100}
            data={{
              labels: weeklyRevenue.labels,
              datasets: [{
                label: 'Выручка',
                data: weeklyRevenue.data,
                backgroundColor: 'rgba(108,99,255,.7)',
                borderRadius: 6,
                borderSkipped: false as const,
              }],
            }}
            options={{
              ...chartDefaults,
              scales: {
                ...chartDefaults.scales,
                y: {
                  ...chartDefaults.scales.y,
                  ticks: {
                    ...chartDefaults.scales.y.ticks,
                    callback: (v: any) => v + 'к',
                  },
                },
              },
            }}
          />
        </div>

        <div className="chart-card">
          <div className="chart-card-title">
            Активные заказы <span>по статусам</span>
          </div>
          <Bar
            height={100}
            data={{
              labels: ['CREATED','CONFIRMED','COOKING','PICKED_UP','ON_THE_WAY'].map((s) => STATUS_LABEL[s]),
              datasets: [{
                data: ['CREATED','CONFIRMED','COOKING','PICKED_UP','ON_THE_WAY'].map((s) => statusCounts[s] ?? 0),
                backgroundColor: [CHART_COLORS.text, CHART_COLORS.blue, CHART_COLORS.orange, CHART_COLORS.yellow, CHART_COLORS.primary],
                borderRadius: 4,
              }],
            }}
            options={{ ...chartDefaults, indexAxis: 'y' as const }}
          />
        </div>
      </div>

      {/* Live orders table */}
      <div className="chart-card">
        <div className="chart-card-title">
          Активные заказы
          <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={onViewOrders}>
            Все заказы →
          </span>
        </div>
        {activeOrders.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>Нет активных заказов</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Адрес / Тип</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Курьер</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.slice(0, 8).map((order: any) => (
                  <tr key={order.id}>
                    <td><span className="order-id-cell">#{order.id.slice(-6)}</span></td>
                    <td>{order.addressText ?? <span className="badge-teal">Самовывоз</span>}</td>
                    <td>{fmtMoney(order.totalAmount)}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{order.delivery?.courier?.name ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(order.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Orders Tab ────────────────────────────────────────────────────────────────

interface OrdersTabProps {
  orders: any[] | undefined;
  couriers: any[] | undefined;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
  onSetStatus: (orderId: string, status: string) => void;
  onAssign: (orderId: string, courierId: string) => void;
  onUnassign: (orderId: string) => void;
}

function OrdersTab({ orders, couriers, statusFilter, onStatusFilter, onSetStatus, onAssign, onUnassign }: OrdersTabProps) {
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'chat'>('details');

  const { data: selectedOrder } = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: async () => (await api.get(`/orders/${selectedOrderId}`)).data,
    enabled: !!selectedOrderId,
  });

  const filtered = useMemo(() => {
    let list = orders ?? [];
    if (statusFilter) list = list.filter((o: any) => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o: any) =>
        o.id.toLowerCase().includes(q) ||
        (o.addressText ?? '').toLowerCase().includes(q) ||
        (o.client?.name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const currentStatus = useCurrentOrderStatus(orders);

  return (
    <>
      {/* Status flow */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-card-title">Флоу заказа</div>
        <div className="flow-container">
          {['CREATED','CONFIRMED','COOKING','PICKED_UP','ON_THE_WAY','DELIVERED'].map((s, i, arr) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div className={`flow-step${currentStatus === s ? ' active' : ''}`}>
                <div className="flow-circle">{i + 1}</div>
                <div className="flow-label">{STATUS_LABEL[s]}</div>
              </div>
              {i < arr.length - 1 && <div className="flow-line" style={{ flex: 1 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <button
          className={`filter-btn${statusFilter === '' ? ' active' : ''}`}
          onClick={() => onStatusFilter('')}
        >
          Все ({(orders ?? []).length})
        </button>
        {STATUS_OPTIONS.filter(Boolean).map((s) => {
          const count = (orders ?? []).filter((o: any) => o.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              className={`filter-btn${statusFilter === s ? ' active' : ''}`}
              onClick={() => onStatusFilter(s)}
            >
              {STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
        <input
          className="search-input-sm"
          placeholder="🔍 Поиск по ID или адресу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {/* Table */}
      <div className="chart-card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Клиент</th>
                <th>Адрес / Тип</th>
                <th>Сумма</th>
                <th>Оплата</th>
                <th>Статус</th>
                <th>Курьер</th>
                <th>Создан</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                    Нет заказов
                  </td>
                </tr>
              )}
              {filtered.map((order: any) => (
                <tr
                  key={order.id}
                  onClick={() => { setSelectedOrderId(order.id); setDetailTab('details'); }}
                  style={{ cursor: 'pointer' }}
                >
                  <td><span className="order-id-cell">#{order.id.slice(-6)}</span></td>
                  <td style={{ fontSize: 12 }}>{order.client?.name ?? '—'}</td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.addressText ?? <span className="badge-teal">Самовывоз</span>}
                  </td>
                  <td>{fmtMoney(order.totalAmount)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.paymentMethod ?? '—'}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td style={{ fontSize: 12 }}>
                    {order.delivery?.courier ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{order.delivery.courier.name}</span>
                        <button className="sm" onClick={() => onUnassign(order.id)} style={{ fontSize: 10, padding: '2px 6px' }}>×</button>
                      </div>
                    ) : (
                      <select
                        style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) onAssign(order.id, e.target.value); }}
                      >
                        <option value="" disabled>Назначить</option>
                        {(couriers ?? []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(order.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {order.status === 'CREATED' && (
                        <button className="sm primary" onClick={() => onSetStatus(order.id, 'CONFIRMED')}>Подтвердить</button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <button className="sm primary" onClick={() => onSetStatus(order.id, 'COOKING')}>Готовится</button>
                      )}
                      {!['DELIVERED', 'CANCELED'].includes(order.status) && (
                        <button className="sm danger" onClick={() => onSetStatus(order.id, 'CANCELED')}>✕</button>
                      )}
                      <button className="sm" onClick={() => { setSelectedOrderId(order.id); setDetailTab('chat'); }} title="Чат">💬</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail drawer */}
      {selectedOrderId && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 420,
          background: '#fff', boxShadow: '-4px 0 24px rgba(27,58,45,0.12)',
          borderLeft: '1.5px solid var(--line)', display: 'flex', flexDirection: 'column', zIndex: 300,
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Заказ #{selectedOrderId.slice(-6).toUpperCase()}</div>
              {selectedOrder && <div style={{ marginTop: 4 }}><StatusBadge status={selectedOrder.status} /></div>}
            </div>
            <button onClick={() => setSelectedOrderId(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-tint)', cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid var(--line)', flexShrink: 0 }}>
            {(['details', 'chat'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDetailTab(t)}
                style={{
                  flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: 800, fontSize: 13,
                  color: detailTab === t ? 'var(--green)' : 'var(--muted)',
                  borderBottom: detailTab === t ? '2px solid var(--green)' : '2px solid transparent',
                  marginBottom: -1.5,
                }}
              >
                {t === 'details' ? '📋 Детали' : '💬 Чат'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minHeight: 0, overflowY: detailTab === 'details' ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column' }}>
            {detailTab === 'details' && selectedOrder && (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Client */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Клиент</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedOrder.client?.name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{selectedOrder.client?.phone ?? selectedOrder.client?.email ?? ''}</div>
                </div>

                {/* Address */}
                {selectedOrder.addressText && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Адрес доставки</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedOrder.addressText}</div>
                  </div>
                )}

                {/* Courier */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Курьер</div>
                  {selectedOrder.delivery?.courier ? (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedOrder.delivery.courier.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{selectedOrder.delivery.courier.phone ?? selectedOrder.delivery.courier.email ?? ''}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Не назначен</div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Состав заказа</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(selectedOrder.orderItems ?? []).map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-tint)', borderRadius: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{item.menuItem?.title ?? item.titleSnapshot ?? '—'}</div>
                          {item.comment && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{item.comment}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>×{item.quantity}</span>
                          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--green)' }}>{fmtMoney(item.unitPrice * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#F7FAF5', borderRadius: 12, border: '1.5px solid var(--line)' }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>Итого</span>
                  <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--green)' }}>{fmtMoney(selectedOrder.totalAmount)}</span>
                </div>

                {/* Payment */}
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                  Оплата: {selectedOrder.payment?.method ?? '—'} · Создан: {new Date(selectedOrder.createdAt).toLocaleString('ru')}
                </div>
              </div>
            )}
            {detailTab === 'details' && !selectedOrder && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Загрузка...</div>
            )}
            {detailTab === 'chat' && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <ChatPanel orderId={selectedOrderId} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Couriers Tab ──────────────────────────────────────────────────────────────

interface CouriersTabProps {
  couriers: any[] | undefined;
  orders: any[] | undefined;
}

function CouriersTab({ couriers, orders }: CouriersTabProps) {
  const courierStats = useMemo(() => {
    const stats: Record<string, { delivered: number; active: number }> = {};
    (orders ?? []).forEach((o: any) => {
      const id = o.delivery?.courier?.id;
      if (!id) return;
      if (!stats[id]) stats[id] = { delivered: 0, active: 0 };
      if (o.status === 'DELIVERED') stats[id].delivered++;
      else if (!['CANCELED', 'CREATED', 'CONFIRMED', 'COOKING'].includes(o.status)) stats[id].active++;
    });
    return stats;
  }, [orders]);

  const totalDelivered = Object.values(courierStats).reduce((s, c) => s + c.delivered, 0);

  return (
    <>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="kpi-card c1">
          <div className="kpi-label">Всего курьеров</div>
          <div className="kpi-value">{(couriers ?? []).length}</div>
          <div className="kpi-icon">🛵</div>
        </div>
        <div className="kpi-card c2">
          <div className="kpi-label">Онлайн</div>
          <div className="kpi-value">{(couriers ?? []).filter((c: any) => c.lastLocation).length}</div>
          <div className="kpi-delta up">● с геолокацией</div>
          <div className="kpi-icon">📍</div>
        </div>
        <div className="kpi-card c3">
          <div className="kpi-label">Доставлено всего</div>
          <div className="kpi-value">{totalDelivered}</div>
          <div className="kpi-icon">✅</div>
        </div>
      </div>

      <div className="courier-grid">
        {(couriers ?? []).length === 0 && (
          <p className="muted">Нет курьеров</p>
        )}
        {(couriers ?? []).map((courier: any, idx: number) => {
          const online = !!courier.lastLocation;
          const stats = courierStats[courier.id] ?? { delivered: 0, active: 0 };
          const colors = ['#6c63ff33', '#4ecdc433', '#ff6b6b33'];
          const textColors = ['var(--accent)', 'var(--accent2)', 'var(--accent3)'];
          const bg   = colors[idx % colors.length];
          const fg   = textColors[idx % textColors.length];
          const initials = courier.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

          return (
            <div key={courier.id} className="courier-card">
              <div className="courier-card-header">
                <div className="courier-avatar" style={{ background: bg, color: fg }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{courier.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span className={online ? 'online-dot' : 'offline-dot'} />
                    {online ? 'Онлайн' : 'Офлайн'}
                    {stats.active > 0 && ' · В доставке'}
                  </div>
                </div>
                {stats.active > 0
                  ? <span className="badge-blue">В пути</span>
                  : online
                  ? <span className="badge-green">Свободен</span>
                  : <span className="badge-gray">Офлайн</span>
                }
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div className="stat-tile">
                  <div className="stat-tile-value" style={{ color: 'var(--accent2)' }}>{stats.delivered}</div>
                  <div className="stat-tile-label">Доставлено</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-value" style={{ color: 'var(--accent4)' }}>{stats.active}</div>
                  <div className="stat-tile-label">Активных</div>
                </div>
              </div>

              {courier.lastLocation && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  📍 {courier.lastLocation.lat.toFixed(4)}, {courier.lastLocation.lng.toFixed(4)}
                </div>
              )}

              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${Math.min(100, stats.delivered * 5)}%`,
                  background: fg,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Couriers overview table */}
      <div className="chart-card">
        <div className="chart-card-title">Назначенные заказы</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Заказ</th><th>Курьер</th><th>Адрес</th><th>Статус</th><th>Назначен</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).filter((o: any) => o.delivery?.courier).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                    Нет назначенных заказов
                  </td>
                </tr>
              )}
              {(orders ?? [])
                .filter((o: any) => o.delivery?.courier)
                .map((o: any) => (
                  <tr key={o.id}>
                    <td><span className="order-id-cell">#{o.id.slice(-6)}</span></td>
                    <td>{o.delivery.courier.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.addressText ?? 'Самовывоз'}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {o.delivery.assignedAt
                        ? new Date(o.delivery.assignedAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Map Tab ───────────────────────────────────────────────────────────────────

interface MapTabProps {
  orders: any[] | undefined;
  couriers: any[] | undefined;
  courierPositions: Record<string, [number, number]>;
  settings: any;
}

function MapTab({ orders, couriers, courierPositions, settings }: MapTabProps) {
  const center: [number, number] = settings
    ? [settings.restaurantLat, settings.restaurantLng]
    : [43.238949, 76.889709];

  const freeRadius = (settings?.freeDeliveryRadiusKm ?? 4) * 1000;

  const orderMarkers = useMemo(
    () => (orders ?? []).filter((o: any) => o.addressLat && o.addressLng),
    [orders],
  );

  return (
    <>
      <div className="section-header">
        <div className="section-title">Карта доставок — Алматы</div>
      </div>
      <div className="chart-card">
        <div style={{ height: 500, borderRadius: 10, overflow: 'hidden' }}>
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              subdomains='abcd'
              maxZoom={20}
            />
            {/* Free delivery zone */}
            <Circle
              center={center}
              radius={freeRadius}
              pathOptions={{ color: '#4caf50', fillColor: '#4caf50', fillOpacity: 0.05, weight: 1.5, dashArray: '6 4' }}
            />
            <Marker position={center} icon={restaurantIcon}>
              <Popup>Ресторан</Popup>
            </Marker>
            {(couriers ?? []).map((courier: any) => {
              const pos = courierPositions[courier.id];
              if (!pos) return null;
              return (
                <Marker key={courier.id} position={pos} icon={courierIcon}>
                  <Popup><strong>{courier.name}</strong></Popup>
                </Marker>
              );
            })}
            {orderMarkers.map((order: any) => (
              <Marker key={order.id} position={[order.addressLat, order.addressLng]} icon={addressIcon}>
                <Popup>
                  <div>
                    <strong>#{order.id.slice(-6)}</strong><br />
                    <StatusBadge status={order.status} /><br />
                    {order.totalAmount.toLocaleString()} ₸
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="map-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent)' }} />Ресторан</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} />Курьер онлайн</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--blue)' }} />Адрес заказа</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)', opacity: .3, border: '1px dashed var(--green)' }} />Бесплатная зона ({settings?.freeDeliveryRadiusKm ?? 4} км)</div>
        </div>
      </div>
    </>
  );
}

// ─── Helper hook ───────────────────────────────────────────────────────────────

function useCurrentOrderStatus(orders: any[] | undefined): string {
  // Most recent non-delivered order status
  const active = (orders ?? []).filter((o: any) => !['DELIVERED', 'CANCELED'].includes(o.status));
  if (active.length === 0) return '';
  const statusOrder = ['CREATED', 'CONFIRMED', 'COOKING', 'PICKED_UP', 'ON_THE_WAY'];
  for (let i = statusOrder.length - 1; i >= 0; i--) {
    if (active.some((o: any) => o.status === statusOrder[i])) return statusOrder[i];
  }
  return active[0]?.status ?? '';
}

// ─── Tab title map ─────────────────────────────────────────────────────────────

const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'Дашборд',
  orders:    'Заказы',
  couriers:  'Курьеры',
  map:       'Карта доставок',
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DispatcherPage() {
  const token   = useAuthStore((s) => s.token);
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const [activeTab,    setActiveTab]    = useState<Tab>('dashboard');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: orders, refetch } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: async () =>
      (await api.get('/orders', { params: statusFilter ? { status: statusFilter } : undefined })).data,
  });

  const { data: couriers } = useQuery({
    queryKey: ['couriers'],
    queryFn: async () => (await api.get('/dispatcher/couriers')).data,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings/restaurant')).data,
  });

  const [courierPositions, setCourierPositions] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    if (!couriers) return;
    const initial: Record<string, [number, number]> = {};
    for (const courier of couriers) {
      if (courier.lastLocation) {
        initial[courier.id] = [courier.lastLocation.lat, courier.lastLocation.lng];
      }
    }
    setCourierPositions((prev) => ({ ...initial, ...prev }));
  }, [couriers]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on('courier.location.updated', (payload: any) => {
      setCourierPositions((prev) => ({
        ...prev,
        [payload.courierId]: [payload.lat, payload.lng],
      }));
    });

    socket.on('order.status.changed', () => { refetch(); });

    return () => {
      socket.off('courier.location.updated');
      socket.off('order.status.changed');
    };
  }, [token, refetch]);

  const assignCourier = async (orderId: string, courierId: string) => {
    if (!courierId) return;
    await api.post(`/dispatcher/orders/${orderId}/assign`, { courierId });
    refetch();
  };

  const unassignCourier = async (orderId: string) => {
    await api.delete(`/dispatcher/orders/${orderId}/assign`);
    refetch();
  };

  const setStatus = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    refetch();
  };

  const activeOrderCount = (orders ?? []).filter(
    (o: any) => !['DELIVERED', 'CANCELED'].includes(o.status),
  ).length;

  const today = new Date().toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="dispatcher-layout">
      <Sidebar
        activeTab={activeTab}
        onTab={setActiveTab}
        activeOrderCount={activeOrderCount}
        user={user}
        onLogout={logout}
      />

      <div className="dispatcher-main">
        {/* Topbar */}
        <div className="dispatcher-topbar">
          <div>
            <div className="topbar-title">{TAB_TITLES[activeTab]}</div>
            <div className="topbar-sub">{today}</div>
          </div>
          <div className="topbar-right">
            <button className="ghost-button" onClick={() => refetch()} style={{ fontSize: 12 }}>
              ↺ Обновить
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="dispatcher-content">
          {activeTab === 'dashboard' && (
            <DashboardTab
              orders={orders}
              couriers={couriers}
              onViewOrders={() => setActiveTab('orders')}
            />
          )}
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              couriers={couriers}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
              onSetStatus={setStatus}
              onAssign={assignCourier}
              onUnassign={unassignCourier}
            />
          )}
          {activeTab === 'couriers' && (
            <CouriersTab orders={orders} couriers={couriers} />
          )}
          {activeTab === 'map' && (
            <MapTab
              orders={orders}
              couriers={couriers}
              courierPositions={courierPositions}
              settings={settings}
            />
          )}
        </div>
      </div>
    </div>
  );
}
