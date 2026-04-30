import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config';

let socket: Socket | null = null;
const subscribedOrders = new Set<string>();

function ensureReconnectHandler() {
  if (!socket) return;
  socket.off('connect');
  socket.on('connect', () => {
    for (const orderId of subscribedOrders) {
      socket?.emit('subscribe.order', { orderId });
    }
  });
}

export function getSocket(token: string) {
  if (!socket) {
    socket = io(`${WS_URL}/ws`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 8000,
    });
    ensureReconnectHandler();
  } else if (socket.disconnected) {
    socket.auth = { token };
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  subscribedOrders.clear();
}

export function subscribeOrder(orderId: string) {
  subscribedOrders.add(orderId);
  if (!socket) return;
  socket.emit('subscribe.order', { orderId });
}

export function unsubscribeOrder(orderId: string) {
  subscribedOrders.delete(orderId);
}