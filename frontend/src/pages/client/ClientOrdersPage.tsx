import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import './client-orders.css';

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
    <div className="review-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="review-star-btn"
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
      <div className="review-existing">
        <span className="review-existing__stars">{'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)}</span>
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
    <div className="review-form">
      <div className="review-form__title">Оцените заказ</div>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
        rows={2}
        className="review-textarea"
      />
      <div className="review-form__buttons">
        <button
          onClick={() => mutate()}
          disabled={rating === 0 || isPending}
          className={`review-form__submit-btn ${rating > 0 ? 'review-form__submit-btn--active' : 'review-form__submit-btn--disabled'}`}
        >
          {isPending ? 'Сохраняем...' : 'Сохранить'}
        </button>
        <button onClick={() => setOpen(false)} className="review-form__cancel-btn">Отмена</button>
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
    <div className="orders-list">
      {(!data || data.length === 0) && (
        <div className="card orders-empty">
          <div className="orders-empty__icon">📦</div>
          <p className="small-text">Заказов пока нет</p>
        </div>
      )}
      {data?.map((order) => (
        <div key={order.id} className="card order-card">
          <div className="order-card__header">
            <div>
              <div className="order-card__id">Заказ #{order.id.slice(-6).toUpperCase()}</div>
              <div className="order-card__date">
                {new Date(order.createdAt).toLocaleString('ru', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="order-card__right">
              <span className={`status ${order.status}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
              <div className="order-card__amount">{order.totalAmount.toLocaleString('ru')} ₸</div>
            </div>
          </div>

          <div className="order-card__actions">
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
