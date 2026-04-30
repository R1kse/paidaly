import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

function nextId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      const modifierOptionIds = (item.modifiers || [])
        .map((m: any) => m.modifierOptionId)
        .sort();
      const modifiersLabel = (item.modifiers || [])
        .map((m: any) => m.titleSnapshot)
        .join(', ');

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

  if (isLoading) return <p>Загрузка заказов...</p>;

  return (
    <div className="card">
      <h3>Мои заказы</h3>
      {data?.length === 0 && <p>Заказов пока нет</p>}
      {data?.map((order) => (
        <div key={order.id} className="order-row">
          <div>
            <span className={`status ${order.status}`}>{order.status}</span>
            <div className="small-text">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div>{order.totalAmount} ₸</div>
          <div className="inline">
            <Link to={`/client/orders/${order.id}`}>Отслеживать</Link>
            <button onClick={() => repeatOrder(order.id)}>Повторить</button>
          </div>
        </div>
      ))}
    </div>
  );
}