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

type AuthPayload = {
  sub: string;
  role: UserRole;
};

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: true, credentials: true },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly wsEvents: WsEventsService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthPayload>(token, {
        secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      });

      client.data.userId = payload.sub;
      client.data.role = payload.role;

      if (payload.role === UserRole.DISPATCHER) {
        client.join('dispatchers');
      }

      if (payload.role === UserRole.COURIER) {
        client.join(`courier:${payload.sub}`);
      }
    } catch {
      client.disconnect();
      return;
    }

    this.wsEvents.setServer(this.server);
  }

  handleDisconnect() {
    return;
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() payload: unknown) {
    return { event: 'pong', data: payload ?? 'pong' };
  }

  @SubscribeMessage('subscribe.order')
  async subscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    const role = client.data.role as UserRole | undefined;
    if (!userId || !role) {
      return { ok: false };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
    });

    if (!order) {
      return { ok: false };
    }

    if (role === UserRole.CLIENT && order.clientId !== userId) {
      return { ok: false };
    }

    if (role === UserRole.COURIER) {
      const delivery = await this.prisma.delivery.findUnique({
        where: { orderId: order.id },
      });

      if (!delivery || delivery.courierId !== userId) {
        return { ok: false };
      }
    }

    client.join(`order:${order.id}`);
    return { ok: true };
  }

  @SubscribeMessage('courier.location.update')
  async updateCourierLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      lat: number;
      lng: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
    },
  ) {
    const userId = client.data.userId as string | undefined;
    const role = client.data.role as UserRole | undefined;

    if (!userId || role !== UserRole.COURIER) {
      return { ok: false };
    }

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

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        courierId: userId,
        order: {
          status: { in: ACTIVE_STATUSES },
        },
      },
      select: { orderId: true },
    });

    this.wsEvents.emitCourierLocationUpdated({
      courierId: userId,
      lat: location.lat,
      lng: location.lng,
      recordedAt: location.recordedAt,
      orderIds: deliveries.map((delivery) => delivery.orderId),
    });

    return { ok: true };
  }
}
