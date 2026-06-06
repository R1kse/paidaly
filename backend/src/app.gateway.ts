import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from './prisma/prisma.service';
import { WsEventsService } from './websocket/ws-events.service';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.COOKING,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
];

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: true, credentials: true },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private wsEvents: WsEventsService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      console.log('[WS] client connected without token, disconnecting');
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<any>(token, {
        secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      });

      client.data.userId = payload.sub;
      client.data.role = payload.role;

      console.log('[WS] user connected:', payload.sub, 'role:', payload.role);

      // диспетчеры подписываются на комнату dispatchers
      if (payload.role === UserRole.DISPATCHER) {
        client.join('dispatchers');
      }

      // курьеры подписываются на свою комнату
      if (payload.role === UserRole.COURIER) {
        client.join(`courier:${payload.sub}`);
      }
    } catch (err) {
      console.log('[WS] invalid token, disconnecting');
      client.disconnect();
      return;
    }

    this.wsEvents.setServer(this.server);
  }

  handleDisconnect(client: Socket) {
    console.log('[WS] client disconnected:', client.data?.userId ?? 'unknown');
    return;
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() payload: any) {
    return { event: 'pong', data: payload ?? 'pong' };
  }

  // клиент подписывается на конкретный заказ чтобы получать обновления
  @SubscribeMessage('subscribe.order')
  async subscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const userId = client.data.userId as string | undefined;
    const role = client.data.role as UserRole | undefined;

    if (!userId) {
      return { ok: false };
    }
    if (!role) {
      return { ok: false };
    }

    // ищем заказ в бд
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
    });

    if (!order) {
      console.log('[WS] order not found:', payload.orderId);
      return { ok: false };
    }

    // клиент может подписаться только на свой заказ
    if (role === UserRole.CLIENT && order.clientId !== userId) {
      return { ok: false };
    }

    // курьер может подписаться только если назначен на этот заказ
    if (role === UserRole.COURIER) {
      const delivery = await this.prisma.delivery.findUnique({
        where: { orderId: order.id },
      });

      if (!delivery) {
        return { ok: false };
      }
      if (delivery.courierId !== userId) {
        return { ok: false };
      }
    }

    client.join(`order:${order.id}`);
    console.log('[WS] user', userId, 'subscribed to order', order.id);
    return { ok: true };
  }

  // курьер отправляет свою геопозицию
  @SubscribeMessage('courier.location.update')
  async updateCourierLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const userId = client.data.userId as string | undefined;
    const role = client.data.role as UserRole | undefined;

    if (!userId) {
      return { ok: false };
    }

    if (role !== UserRole.COURIER) {
      return { ok: false };
    }

    // сохраняем геопозицию в бд
    const location = await this.prisma.courierLocation.create({
      data: {
        courierId: userId,
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
      },
    });

    // находим активные доставки курьера чтобы уведомить клиентов
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        courierId: userId,
        order: {
          status: { in: ACTIVE_STATUSES },
        },
      },
      select: { orderId: true },
    });

    const orderIds: string[] = [];
    for (const d of deliveries) {
      orderIds.push(d.orderId);
    }

    this.wsEvents.emitCourierLocationUpdated({
      courierId: userId,
      lat: location.lat,
      lng: location.lng,
      recordedAt: location.recordedAt,
      orderIds: orderIds,
    });

    return { ok: true };
  }
}
