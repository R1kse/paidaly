import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WsEventsService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitOrderStatusChanged(payload: {
    orderId: string;
    status: string;
    updatedAt: Date;
    courierId?: string | null;
  }) {
    if (!this.server) return;
    this.server.to('dispatchers').emit('order.status.changed', {
      orderId: payload.orderId,
      status: payload.status,
      updatedAt: payload.updatedAt,
      courierId: payload.courierId ?? null,
    });
    this.server.to(`order:${payload.orderId}`).emit('order.status.changed', {
      orderId: payload.orderId,
      status: payload.status,
      updatedAt: payload.updatedAt,
      courierId: payload.courierId ?? null,
    });
    if (payload.courierId) {
      this.server.to(`courier:${payload.courierId}`).emit('order.status.changed', {
        orderId: payload.orderId,
        status: payload.status,
        updatedAt: payload.updatedAt,
        courierId: payload.courierId,
      });
    }
  }

  emitChatMessage(payload: {
    orderId: string;
    message: { id: string; text: string; createdAt: Date; sender: { id: string; name: string; role: string } };
    courierId?: string | null;
  }) {
    if (!this.server) return;
    const data = { ...payload.message, orderId: payload.orderId };
    this.server.to(`order:${payload.orderId}`).emit('chat.message', data);
    this.server.to('dispatchers').emit('chat.message', data);
    if (payload.courierId) {
      this.server.to(`courier:${payload.courierId}`).emit('chat.message', data);
    }
  }

  emitCourierLocationUpdated(payload: {
    courierId: string;
    lat: number;
    lng: number;
    recordedAt: Date;
    orderIds: string[];
  }) {
    if (!this.server) return;
    this.server.to('dispatchers').emit('courier.location.updated', {
      courierId: payload.courierId,
      lat: payload.lat,
      lng: payload.lng,
      recordedAt: payload.recordedAt,
    });

    for (const orderId of payload.orderIds) {
      this.server.to(`order:${orderId}`).emit('courier.location.updated', {
        courierId: payload.courierId,
        lat: payload.lat,
        lng: payload.lng,
        recordedAt: payload.recordedAt,
      });
    }
  }
}
