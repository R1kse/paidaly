import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WsEventsService } from '../websocket/ws-events.service';
import { OrderFlowService } from '../orders/flow/order-flow.service';
import { AuditService } from '../audit/audit.service';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.COOKING,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
];

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly wsEvents: WsEventsService,
    private readonly orderFlow: OrderFlowService,
    private readonly audit: AuditService,
  ) {}

  async assignCourier(orderId: string, courierId: string, actorUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.scheduledFor) {
      this.orderFlow.assertPreorderReady(order);
    }

    const courier = await this.prisma.user.findUnique({ where: { id: courierId } });
    if (!courier || courier.role !== UserRole.COURIER) {
      throw new BadRequestException('Invalid courier');
    }

    const delivery = await this.prisma.delivery.upsert({
      where: { orderId },
      create: {
        orderId,
        courierId,
        assignedAt: new Date(),
      },
      update: {
        courierId,
        assignedAt: new Date(),
      },
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    await this.audit.log({
      actorUserId: actorUserId,
      action: AuditAction.COURIER_ASSIGNED,
      orderId: order.id,
      data: { courierId },
    });

    await this.notifications.notifyUser(
      delivery.courierId,
      'Новый заказ',
      `Вам назначен заказ #${orderId}`,
    );
    await this.notifications.notifyUser(
      order.clientId,
      'Курьер назначен',
      `Курьер назначен для вашего заказа #${orderId}`,
    );

    this.wsEvents.emitOrderStatusChanged({
      orderId,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updatedAt,
      courierId: delivery.courierId,
    });

    return {
      orderId,
      courierId: delivery.courierId,
      assignedAt: delivery.assignedAt,
    };
  }

  async getCouriersWithLastLocation() {
    const couriers = await this.prisma.user.findMany({
      where: { role: UserRole.COURIER },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    });

    const lastLocations = await this.prisma.courierLocation.findMany({
      where: { courierId: { in: couriers.map((c) => c.id) } },
      orderBy: { recordedAt: 'desc' },
      distinct: ['courierId'],
      select: { courierId: true, lat: true, lng: true, recordedAt: true },
    });

    const locationMap = new Map(lastLocations.map((loc) => [loc.courierId, loc]));

    return couriers.map((courier) => ({
      ...courier,
      lastLocation: locationMap.get(courier.id) ?? null,
    }));
  }

  async unassignCourier(orderId: string, actorUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!order.delivery) {
      throw new BadRequestException('No courier assigned to this order');
    }

    const prevCourierId = order.delivery.courierId;

    await this.prisma.delivery.delete({ where: { orderId } });
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CREATED },
    });

    await this.audit.log({
      actorUserId,
      action: AuditAction.COURIER_ASSIGNED,
      orderId,
      data: { unassigned: true, prevCourierId },
    });

    this.wsEvents.emitOrderStatusChanged({
      orderId,
      status: OrderStatus.CREATED,
      updatedAt: new Date(),
      courierId: null,
    });

    return { orderId, unassigned: true };
  }

  async getCourierActiveDeliveries(userId: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        courierId: userId,
        order: {
          status: { in: ACTIVE_STATUSES },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            addressLat: true,
            addressLng: true,
            addressText: true,
            totalAmount: true,
            scheduledFor: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return deliveries.map((delivery) => ({
      deliveryId: delivery.id,
      order: delivery.order,
      assignedAt: delivery.assignedAt,
    }));
  }

  async getLastLocation(courierId: string) {
    return this.prisma.courierLocation.findFirst({
      where: { courierId },
      orderBy: { recordedAt: 'desc' },
      select: { courierId: true, lat: true, lng: true, recordedAt: true },
    });
  }
}
