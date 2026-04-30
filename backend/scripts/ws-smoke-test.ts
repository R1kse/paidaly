import { io } from 'socket.io-client';

const baseUrl = 'http://localhost:3000';
const wsUrl = 'http://localhost:3000/ws';

async function login(email: string, password: string) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`login failed ${email}`);
  }
  return res.json();
}

function almatyTomorrowAt(hour: number) {
  const tz = 'Asia/Almaty';
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1;
  const day = Number(parts.find((p) => p.type === 'day')?.value) + 1;
  const local = new Date(Date.UTC(year, month, day, hour, 0, 0));
  return local.toISOString();
}

async function createOrder(token: string) {
  const settingsRes = await fetch(`${baseUrl}/settings/restaurant`);
  const settings = await settingsRes.json();
  const menuRes = await fetch(`${baseUrl}/menu`);
  const menu = await menuRes.json();
  const firstItem = menu[0].items[0];
  const optionIds = firstItem.modifierGroups?.[0]?.options?.[0]
    ? [firstItem.modifierGroups[0].options[0].id]
    : [];

  const body = {
    deliveryType: 'DELIVERY',
    paymentMethod: 'CASH',
    comment: 'ws test order',
    scheduledFor: almatyTomorrowAt(10),
    addressText: 'Test Address',
    addressLat: settings.restaurantLat,
    addressLng: settings.restaurantLng,
    items: [{ menuItemId: firstItem.id, quantity: 2, modifierOptionIds: optionIds }],
  };

  const res = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`create order failed ${res.status} ${text}`);
  }
  return res.json();
}

async function assignCourier(orderId: string, courierId: string, token: string) {
  const res = await fetch(`${baseUrl}/dispatcher/orders/${orderId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ courierId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`assign failed ${res.status} ${text}`);
  }
  return res.json();
}

async function updateStatus(orderId: string, status: string, token: string) {
  const res = await fetch(`${baseUrl}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`status failed ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  const dispatcher = await login('dispatcher@demo.kz', '123456');
  const client = await login('client@demo.kz', '123456');
  const courier = await login('courier1@demo.kz', '123456');

  const order = await createOrder(client.accessToken);

  const dispatcherSocket = io(wsUrl, { auth: { token: dispatcher.accessToken } });
  const clientSocket = io(wsUrl, { auth: { token: client.accessToken } });
  const courierSocket = io(wsUrl, { auth: { token: courier.accessToken } });

  const events: string[] = [];

  dispatcherSocket.on('order.status.changed', (payload) => {
    events.push(`dispatcher:order.status.changed:${payload.status}`);
  });
  dispatcherSocket.on('courier.location.updated', () => {
    events.push('dispatcher:courier.location.updated');
  });

  clientSocket.on('order.status.changed', (payload) => {
    events.push(`client:order.status.changed:${payload.status}`);
  });
  clientSocket.on('courier.location.updated', () => {
    events.push('client:courier.location.updated');
  });

  courierSocket.on('order.status.changed', (payload) => {
    events.push(`courier:order.status.changed:${payload.status}`);
  });

  await new Promise<void>((resolve) => {
    clientSocket.emit('subscribe.order', { orderId: order.orderId }, () => resolve());
  });

  await assignCourier(order.orderId, courier.user.id, dispatcher.accessToken);
  await updateStatus(order.orderId, 'ON_THE_WAY', courier.accessToken);

  courierSocket.emit('courier.location.update', { lat: 43.24, lng: 76.89 });

  await new Promise((r) => setTimeout(r, 1000));

  dispatcherSocket.disconnect();
  clientSocket.disconnect();
  courierSocket.disconnect();

  console.log(JSON.stringify({ orderId: order.orderId, events }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
