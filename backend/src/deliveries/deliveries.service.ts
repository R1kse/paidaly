import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WsEventsService } from '../websocket/ws-events.service';
import { AuditService } from '../audit/audit.service';
import { DateTime } from 'luxon';

// статусы активных заказов
const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.COOKING,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
];

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private wsEvents: WsEventsService,
    private audit: AuditService,
  ) {}

  async assignCourier(orderId: string, courierId: string, actorUserId: string) {
    // проверяем что заказ существует
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // если это предзаказ - проверяем что время уже пришло
    if (order.scheduledFor != null) {
      const now = DateTime.now().setZone('Asia/Almaty');
      const scheduled = DateTime.fromJSDate(order.scheduledFor).setZone('Asia/Almaty');
      if (now < scheduled) {
        throw new BadRequestException('PREORDER_NOT_READY');
      }
    }

    // проверяем что курьер существует и у него правильная роль
    const courier = await this.prisma.user.findUnique({ where: { id: courierId } });
    if (!courier) {
      throw new BadRequestException('Invalid courier');
    }
    if (courier.role !== UserRole.COURIER) {
      throw new BadRequestException('Invalid courier');
    }

    const delivery = await this.prisma.delivery.upsert({
      where: { orderId: orderId },
      create: {
        orderId: orderId,
        courierId: courierId,
        assignedAt: new Date(),
      },
      update: {
        courierId: courierId,
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
      data: { courierId: courierId },
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

    // отправляем событие через websocket
    this.wsEvents.emitOrderStatusChanged({
      orderId: orderId,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updatedAt,
      courierId: delivery.courierId,
    });

    return {
      orderId: orderId,
      courierId: delivery.courierId,
      assignedAt: delivery.assignedAt,
    };
  }

  async getCouriersWithLastLocation() {
    // получаем всех курьеров
    const couriers = await this.prisma.user.findMany({
      where: { role: UserRole.COURIER },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    });

    // получаем последние локации для каждого курьера
    const lastLocations = await this.prisma.courierLocation.findMany({
      where: { courierId: { in: couriers.map((c: any) => c.id) } },
      orderBy: { recordedAt: 'desc' },
      distinct: ['courierId'],
      select: { courierId: true, lat: true, lng: true, recordedAt: true },
    });

    // делаем map для быстрого поиска по courierId
    const locationMap = new Map<string, any>();
    for (const loc of lastLocations) {
      locationMap.set(loc.courierId, loc);
    }

    const result = [];
    for (const courier of couriers) {
      result.push({
        ...courier,
        lastLocation: locationMap.get(courier.id) ?? null,
      });
    }

    return result;
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

    // удаляем назначение курьера
    await this.prisma.delivery.delete({ where: { orderId: orderId } });

    // возвращаем заказ в статус CREATED
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CREATED },
    });

    await this.audit.log({
      actorUserId: actorUserId,
      action: AuditAction.COURIER_ASSIGNED,
      orderId: orderId,
      data: { unassigned: true, prevCourierId: prevCourierId },
    });

    this.wsEvents.emitOrderStatusChanged({
      orderId: orderId,
      status: OrderStatus.CREATED,
      updatedAt: new Date(),
      courierId: null,
    });

    return { orderId: orderId, unassigned: true };
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

    const result = [];
    for (const d of deliveries) {
      result.push({
        deliveryId: d.id,
        order: d.order,
        assignedAt: d.assignedAt,
      });
    }

    return result;
  }

  async getLastLocation(courierId: string) {
    const loc = await this.prisma.courierLocation.findFirst({
      where: { courierId: courierId },
      orderBy: { recordedAt: 'desc' },
      select: { courierId: true, lat: true, lng: true, recordedAt: true },
    });
    return loc;
  }
}
