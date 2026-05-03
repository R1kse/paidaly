import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  review?: { rating: number; comment?: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Создан', CONFIRMED: 'Подтверждён', COOKING: 'Готовится',
  PICKED_UP: 'Курьер забрал', ON_THE_WAY: 'В пути',
  DELIVERED: 'Доставлен', CANCELED: 'Отменён',
};

function nextId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 22, lineHeight: 1 }}
        >
          <span style={{ color: star <= (hovered || value) ? '#F59E0B' : '#D1D5DB' }}>★</span>
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ orderId, existing }: { orderId: string; existing?: Order['review'] }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/review`, { rating, comment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders', 'my'] }); setOpen(false); },
  });

  if (existing && !open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#F59E0B', fontSize: 14 }}>{'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)}</span>
        <button className="sm" onClick={() => setOpen(true)} style={{ fontSize: 11 }}>Изменить</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="sm" onClick={() => setOpen(true)}>⭐ Оставить отзыв</button>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg-tint)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 13 }}>Оцените заказ</div>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
        rows={2}
        style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--line)', background: '#fff', fontSize: 13, fontFamily: 'Nunito, sans-serif', resize: 'none', outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => mutate()}
          disabled={rating === 0 || isPending}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: rating > 0 ? 'var(--green)' : 'var(--line)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: rating > 0 ? 'pointer' : 'default', fontFamily: 'Nunito, sans-serif' }}
        >
          {isPending ? 'Сохраняем...' : 'Сохранить'}
        </button>
        <button onClick={() => setOpen(false)} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--line)', background: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>Отмена</button>
      </div>
    </div>
  );
}

export default function ClientOrdersPage() {
  const { data, isLoading } = useQuery<Order[]>({
    queryKey: ['orders', 'my'],
    queryFn: async () => (await api.get('/orders/my')).data,
  });
  const cart = useCartStore();
  const navigate = useNavigate();

  const repeatOrder = async (orderId: string) => {
    const { data: order } = await api.get(`/orders/${orderId}`);
    cart.clear();
    for (const item of order.orderItems || []) {
      const modifierOptionIds = (item.modifiers || []).map((m: any) => m.modifierOptionId).sort();
      const modifiersLabel = (item.modifiers || []).map((m: any) => m.titleSnapshot).join(', ');
      cart.addLine({
        lineId: nextId(),
        menuItemId: item.menuItemId,
        title: item.titleSnapshot,
        basePrice: item.unitPrice,
        quantity: item.quantity,
        modifierOptionIds,
        modifiersLabel,
      });
    }
    navigate('/client/checkout');
  };

  if (isLoading) return <div className="card" style={{ textAlign: 'center', padding: 40 }}><p className="small-text">Загрузка заказов...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(!data || data.length === 0) && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <p className="small-text">Заказов пока нет</p>
        </div>
      )}
      {data?.map((order) => (
        <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Заказ #{order.id.slice(-6).toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {new Date(order.createdAt).toLocaleString('ru', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`status ${order.status}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
              <div style={{ fontWeight: 900, fontSize: 16, marginTop: 4, color: 'var(--green)' }}>{order.totalAmount.toLocaleString('ru')} ₸</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!['DELIVERED', 'CANCELED'].includes(order.status) && (
              <Link to={`/client/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                <button className="sm primary">📍 Отслеживать</button>
              </Link>
            )}
            <button className="sm" onClick={() => repeatOrder(order.id)}>🔄 Повторить</button>
          </div>

          {order.status === 'DELIVERED' && (
            <ReviewForm orderId={order.id} existing={order.review} />
          )}
        </div>
      ))}
    </div>
  );
}
