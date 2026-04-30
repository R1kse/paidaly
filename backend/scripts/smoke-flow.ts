import { setTimeout as delay } from 'node:timers/promises';

type LoginResponse = { accessToken: string; user: { id: string; role: string } };

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method || 'GET'} ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function login(email: string, password: string): Promise<LoginResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function buildOrderItem(menu: any[]) {
  for (const category of menu) {
    for (const item of category.items || []) {
      const modifierGroups = item.modifierGroups || [];
      const selected: string[] = [];
      for (const group of modifierGroups) {
        if (group.required || (group.minSelected ?? 0) > 0) {
          const first = group.options?.[0];
          if (first) selected.push(first.id);
        }
      }
      return { menuItemId: item.id, quantity: 1, modifierOptionIds: selected };
    }
  }
  throw new Error('Menu is empty');
}

async function main() {
  console.log('Smoke: login client');
  const client = await login('client@demo.kz', '123456');

  console.log('Smoke: fetch menu');
  const menu = await request('/menu');
  const orderItem = buildOrderItem(menu);

  console.log('Smoke: create order');
  const order = await request('/orders', {
    method: 'POST',
    headers: authHeader(client.accessToken),
    body: JSON.stringify({
      deliveryType: 'PICKUP',
      paymentMethod: 'CASH',
      items: [orderItem],
    }),
  });

  console.log('Smoke: login dispatcher');
  const dispatcher = await login('dispatcher@demo.kz', '123456');

  console.log('Smoke: get couriers');
  const couriers = await request('/dispatcher/couriers', {
    headers: authHeader(dispatcher.accessToken),
  });
  if (!couriers.length) throw new Error('No couriers in DB');

  console.log('Smoke: assign courier');
  await request(`/dispatcher/orders/${order.orderId}/assign`, {
    method: 'POST',
    headers: authHeader(dispatcher.accessToken),
    body: JSON.stringify({ courierId: couriers[0].id }),
  });

  console.log('Smoke: login courier');
  const courier = await login('courier1@demo.kz', '123456');

  console.log('Smoke: set status PICKED_UP');
  await request(`/orders/${order.orderId}/status`, {
    method: 'PATCH',
    headers: authHeader(courier.accessToken),
    body: JSON.stringify({ status: 'PICKED_UP' }),
  });

  console.log('Smoke: set status ON_THE_WAY');
  await request(`/orders/${order.orderId}/status`, {
    method: 'PATCH',
    headers: authHeader(courier.accessToken),
    body: JSON.stringify({ status: 'ON_THE_WAY' }),
  });

  console.log('Smoke: set status DELIVERED');
  await request(`/orders/${order.orderId}/status`, {
    method: 'PATCH',
    headers: authHeader(courier.accessToken),
    body: JSON.stringify({ status: 'DELIVERED' }),
  });

  console.log('Smoke: get final order');
  const finalOrder = await request(`/orders/${order.orderId}`, {
    headers: authHeader(dispatcher.accessToken),
  });

  console.log(`Final status: ${finalOrder.status}`);
  console.log('Smoke: done');

  await delay(100);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});