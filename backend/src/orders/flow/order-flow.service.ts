import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Order, OrderStatus, UserRole } from '@prisma/client';

const TIME_ZONE = 'Asia/Almaty';
const DEFAULT_OPEN_MINUTES = 540;
const DEFAULT_CLOSE_MINUTES = 1080;

@Injectable()
export class OrderFlowService {
  assertCanChangeStatus(
    role: UserRole,
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ) {
    if (currentStatus === OrderStatus.CANCELED || currentStatus === OrderStatus.DELIVERED) {
      throw new BadRequestException('FORBIDDEN_STATUS_CHANGE');
    }

    if (role === UserRole.DISPATCHER) {
      const allowed: OrderStatus[] = [
        OrderStatus.CONFIRMED,
        OrderStatus.COOKING,
        OrderStatus.CANCELED,
      ];
      if (!allowed.includes(nextStatus)) {
        throw new ForbiddenException('FORBIDDEN_STATUS_CHANGE');
      }
      return;
    }

    if (role === UserRole.COURIER) {
      const allowed: OrderStatus[] = [
        OrderStatus.PICKED_UP,
        OrderStatus.ON_THE_WAY,
        OrderStatus.DELIVERED,
      ];
      if (!allowed.includes(nextStatus)) {
        throw new ForbiddenException('FORBIDDEN_STATUS_CHANGE');
      }
      return;
    }

    if (role === UserRole.CLIENT) {
      if (nextStatus !== OrderStatus.CANCELED) {
        throw new ForbiddenException('FORBIDDEN_STATUS_CHANGE');
      }
      return;
    }
  }

  assertTransitions(order: Order, nextStatus: OrderStatus, hasDelivery: boolean) {
    if (nextStatus === OrderStatus.DELIVERED && !hasDelivery) {
      throw new BadRequestException('DELIVERY_REQUIRED');
    }

    if (nextStatus === OrderStatus.ON_THE_WAY && order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException('FORBIDDEN_STATUS_CHANGE');
    }
  }

  assertPreorderReady(order: { scheduledFor: Date | null }) {
    if (!order.scheduledFor) return;
    const now = DateTime.now().setZone(TIME_ZONE);
    const scheduled = DateTime.fromJSDate(order.scheduledFor).setZone(TIME_ZONE);
    if (now < scheduled) {
      throw new BadRequestException('PREORDER_NOT_READY');
    }
  }

  assertWithinWorkingHours(
    openMinutes = DEFAULT_OPEN_MINUTES,
    closeMinutes = DEFAULT_CLOSE_MINUTES,
  ) {
    const now = DateTime.now().setZone(TIME_ZONE);
    const minutes = now.hour * 60 + now.minute;
    if (minutes < openMinutes || minutes > closeMinutes) {
      throw new BadRequestException('OUT_OF_WORKING_HOURS');
    }
  }

  assertStatusWithinWorkingHours(
    nextStatus: OrderStatus,
    openMinutes = DEFAULT_OPEN_MINUTES,
    closeMinutes = DEFAULT_CLOSE_MINUTES,
  ) {
    const guarded: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.COOKING,
      OrderStatus.PICKED_UP,
    ];
    if (!guarded.includes(nextStatus)) return;
    this.assertWithinWorkingHours(openMinutes, closeMinutes);
  }
}
