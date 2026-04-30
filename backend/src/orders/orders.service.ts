import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DeliveryType, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { WsEventsService } from '../websocket/ws-events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderFlowService } from './flow/order-flow.service';
import { AuditService } from '../audit/audit.service';

const TIME_ZONE = 'Asia/Almaty';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly wsEvents: WsEventsService,
    private readonly notifications: NotificationsService,
    private readonly orderFlow: OrderFlowService,
    private readonly audit: AuditService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const settings = await this.settingsService.getRestaurantSettings();

    let distanceKm: number | null = null;
    let deliveryFeeAmount = 0;

    if (dto.deliveryType === DeliveryType.DELIVERY) {
      if (dto.addressLat == null || dto.addressLng == null) {
        throw new BadRequestException('DELIVERY_ADDRESS_REQUIRED');
      }

      distanceKm = this.getDistanceKm(
        settings.restaurantLat,
        settings.restaurantLng,
        dto.addressLat,
        dto.addressLng,
      );
      deliveryFeeAmount =
        distanceKm > settings.freeDeliveryRadiusKm ? settings.longDistanceFeeKzt ?? 0 : 0;
    }

    const now = DateTime.now().setZone(TIME_ZONE);
    let scheduledFor: DateTime | null = null;

    if (dto.scheduledFor) {
      if (!settings.allowPreorder) {
        throw new BadRequestException('PREORDER_NOT_ALLOWED');
      }

      scheduledFor = DateTime.fromISO(dto.scheduledFor, { zone: TIME_ZONE });
      if (!scheduledFor.isValid) {
        throw new BadRequestException('INVALID_SCHEDULED_FOR');
      }

      if (scheduledFor <= now) {
        throw new BadRequestException('SCHEDULED_FOR_PAST');
      }
    }

    const menuItemIds = dto.items.map((item) => item.menuItemId);
    const uniqueMenuItemIds = Array.from(new Set(menuItemIds));
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: uniqueMenuItemIds }, isActive: true },
      include: {
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (menuItems.length !== uniqueMenuItemIds.length) {
      throw new BadRequestException('INVALID_ITEMS');
    }

    const optionIds = dto.items.flatMap((item) => item.modifierOptionIds ?? []);
    const uniqueOptionIds = Array.from(new Set(optionIds));

    const optionsById = uniqueOptionIds.length
      ? await this.prisma.modifierOption.findMany({
          where: { id: { in: uniqueOptionIds }, isActive: true },
          include: { group: true },
        })
      : [];

    const optionMap = new Map(optionsById.map((option) => [option.id, option]));
    if (uniqueOptionIds.length !== optionMap.size) {
      throw new BadRequestException('INVALID_MODIFIERS');
    }

    const orderItemsData: {
      menuItemId: string;
      titleSnapshot: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
      modifiers: {
        modifierOptionId: string;
        titleSnapshot: string;
        priceDeltaSnapshot: number;
      }[];
    }[] = [];

    let subtotal = 0;

    for (const itemDto of dto.items) {
      const menuItem = menuItems.find((item) => item.id === itemDto.menuItemId);
      if (!menuItem) {
        throw new BadRequestException('INVALID_ITEMS');
      }

      const selectedOptions = (itemDto.modifierOptionIds ?? []).map((id) => {
        const option = optionMap.get(id);
        if (!option) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }
        return option;
      });

      const groupsForItem = menuItem.modifierGroups.map((relation) => relation.modifierGroup);
      const allowedGroupIds = new Set(groupsForItem.map((group) => group.id));

      const selectedByGroup = new Map<string, typeof selectedOptions>();
      for (const option of selectedOptions) {
        if (!allowedGroupIds.has(option.groupId)) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }

        const groupSelections = selectedByGroup.get(option.groupId) ?? [];
        groupSelections.push(option);
        selectedByGroup.set(option.groupId, groupSelections);
      }

      for (const group of groupsForItem) {
        const selections = selectedByGroup.get(group.id) ?? [];
        const count = selections.length;

        // Only enforce upper bounds — required/minSelected are advisory (frontend pre-selects defaults)
        if (group.type === 'SINGLE' && count > 1) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }

        if (count > group.maxSelected) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }
      }

      const optionsTotal = selectedOptions.reduce(
        (sum, option) => sum + option.priceDelta,
        0,
      );

      const unitPrice = menuItem.price + optionsTotal;
      const lineTotal = unitPrice * itemDto.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        menuItemId: menuItem.id,
        titleSnapshot: menuItem.title,
        unitPrice,
        quantity: itemDto.quantity,
        lineTotal,
        modifiers: selectedOptions.map((option) => ({
          modifierOptionId: option.id,
          titleSnapshot: option.title,
          priceDeltaSnapshot: option.priceDelta,
        })),
      });
    }

    if (subtotal < settings.minOrderAmount) {
      throw new BadRequestException('MIN_ORDER_NOT_MET');
    }

    const totalAmount = subtotal + deliveryFeeAmount;

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          clientId: userId,
          status: OrderStatus.CREATED,
          deliveryType: dto.deliveryType,
          comment: dto.comment,
          scheduledFor: scheduledFor ? scheduledFor.toJSDate() : null,
          addressText: dto.addressText,
          addressLat: dto.addressLat,
          addressLng: dto.addressLng,
          distanceKm,
          subtotalAmount: subtotal,
          deliveryFeeAmount,
          totalAmount,
        },
      });

      for (const item of orderItemsData) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: item.menuItemId,
            titleSnapshot: item.titleSnapshot,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          },
        });

        if (item.modifiers.length > 0) {
          await tx.orderItemModifier.createMany({
            data: item.modifiers.map((modifier) => ({
              orderItemId: orderItem.id,
              modifierOptionId: modifier.modifierOptionId,
              titleSnapshot: modifier.titleSnapshot,
              priceDeltaSnapshot: modifier.priceDeltaSnapshot,
            })),
          });
        }
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: dto.paymentMethod,
          status: PaymentStatus.PENDING,
          amount: totalAmount,
        },
      });

      return order;
    });

    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.ORDER_CREATED,
      orderId: created.id,
      data: { totalAmount: created.totalAmount },
    });

    await this.notifications.notifyRole(
      UserRole.DISPATCHER,
      'Новый заказ',
      `Новый заказ #${created.id}`,
    );
    await this.notifications.notifyUser(userId, 'Заказ создан', `Заказ #${created.id} создан`);

    return {
      orderId: created.id,
      status: created.status,
      totalAmount: created.totalAmount,
      createdAt: created.createdAt,
      deliveryFee: {
        base: 0,
        surcharge: deliveryFeeAmount,
        total: deliveryFeeAmount,
        distanceKm,
      },
    };
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        deliveryFeeAmount: true,
        distanceKm: true,
        createdAt: true,
        addressText: true,
        addressLat: true,
        addressLng: true,
      },
    });
  }

  async getOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        deliveryFeeAmount: true,
        distanceKm: true,
        createdAt: true,
        addressText: true,
        addressLat: true,
        addressLng: true,
        client: {
          select: { id: true, name: true, email: true },
        },
        delivery: {
          select: {
            courierId: true,
            assignedAt: true,
            courier: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async getOrderById(orderId: string, userId: string, role: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            modifiers: true,
          },
        },
        payment: true,
        delivery: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role !== UserRole.DISPATCHER && order.clientId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    const settings = await this.settingsService.getRestaurantSettings();
    const deliveryFee = this.getDeliveryFeeBreakdown(order, settings);

    return {
      ...order,
      deliveryFee,
    };
  }

  async updateStatus(orderId: string, userId: string, role: UserRole, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role === UserRole.CLIENT && order.clientId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (role === UserRole.COURIER) {
      if (!order.delivery || order.delivery.courierId !== userId) {
        throw new ForbiddenException('FORBIDDEN');
      }
    }

    this.orderFlow.assertCanChangeStatus(role, order.status, dto.status);
    this.orderFlow.assertTransitions(order, dto.status, !!order.delivery);

    if (
      order.scheduledFor &&
      (dto.status === OrderStatus.PICKED_UP ||
        dto.status === OrderStatus.ON_THE_WAY ||
        dto.status === OrderStatus.DELIVERED)
    ) {
      this.orderFlow.assertPreorderReady(order);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        cancelReason: dto.status === OrderStatus.CANCELED ? dto.cancelReason : null,
      },
    });

    if (dto.status === OrderStatus.DELIVERED) {
      await this.prisma.payment.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.PAID },
      });
      await this.audit.log({
        actorUserId: userId,
        action: AuditAction.PAYMENT_STATUS_CHANGED,
        orderId,
        data: { paymentStatus: PaymentStatus.PAID },
      });
    } else if (dto.status === OrderStatus.CANCELED) {
      await this.prisma.payment.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.REFUNDED },
      });
      await this.audit.log({
        actorUserId: userId,
        action: AuditAction.PAYMENT_STATUS_CHANGED,
        orderId,
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });
    }

    await this.audit.log({
      actorUserId: userId,
      action:
        dto.status === OrderStatus.CANCELED
          ? AuditAction.ORDER_CANCELED
          : AuditAction.ORDER_STATUS_CHANGED,
      orderId: order.id,
      data: {
        fromStatus: order.status,
        toStatus: dto.status,
        cancelReason: dto.cancelReason ?? undefined,
      },
    });

    this.wsEvents.emitOrderStatusChanged({
      orderId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
      courierId: order.delivery?.courierId ?? null,
    });

    if (
      dto.status === OrderStatus.ON_THE_WAY ||
      dto.status === OrderStatus.DELIVERED ||
      dto.status === OrderStatus.CANCELED
    ) {
      await this.notifications.notifyUser(
        order.clientId,
        'Статус заказа',
        `Заказ #${order.id}: ${dto.status}`,
      );
    }

    if (dto.status === OrderStatus.DELIVERED || dto.status === OrderStatus.CANCELED) {
      await this.notifications.notifyRole(
        UserRole.DISPATCHER,
        'Статус заказа',
        `Заказ #${order.id}: ${dto.status}`,
      );
    }

    return updated;
  }
  private isWithinWorkingHours(date: DateTime, openMinutes: number, closeMinutes: number) {
    const minutes = date.hour * 60 + date.minute;
    return minutes >= openMinutes && minutes <= closeMinutes;
  }

  private getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private getDeliveryFeeBreakdown(
    order: { deliveryType: DeliveryType; distanceKm: number | null; deliveryFeeAmount: number },
    settings: { longDistanceFeeKzt: number; freeDeliveryRadiusKm: number },
  ) {
    if (order.deliveryType !== DeliveryType.DELIVERY) {
      return {
        base: 0,
        surcharge: 0,
        total: 0,
        distanceKm: order.distanceKm ?? null,
      };
    }

    const surcharge =
      order.distanceKm != null && order.distanceKm > settings.freeDeliveryRadiusKm
        ? settings.longDistanceFeeKzt ?? 0
        : 0;

    return {
      base: 0,
      surcharge,
      total: order.deliveryFeeAmount,
      distanceKm: order.distanceKm ?? null,
    };
  }
}

