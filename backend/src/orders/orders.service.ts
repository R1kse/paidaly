import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DeliveryType, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WsEventsService } from '../websocket/ws-events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

// временная зона для всех расчетов дат
const TIME_ZONE = 'Asia/Almaty';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private wsEvents: WsEventsService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  async createOrder(userId: string, dto: any) {
    const settings = await this.settingsService.getRestaurantSettings();

    let distanceKm: number | null = null;
    let deliveryFeeAmount = 0;

    if (dto.deliveryType === DeliveryType.DELIVERY) {
      if (dto.addressLat == null || dto.addressLng == null) {
        throw new BadRequestException('DELIVERY_ADDRESS_REQUIRED');
      }

      const lat1 = settings.restaurantLat;
      const lng1 = settings.restaurantLng;
      const lat2 = dto.addressLat;
      const lng2 = dto.addressLng;

      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = R * c;

      // если дальше чем бесплатный радиус - берем доп плату
      if (distanceKm > settings.freeDeliveryRadiusKm) {
        deliveryFeeAmount = settings.longDistanceFeeKzt ?? 0;
      }
    }

    const now = DateTime.now().setZone(TIME_ZONE);
    let scheduledFor: DateTime | null = null;

    // обрабатываем предзаказ
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

    // загружаем блюда из бд
    const menuItemIds: string[] = [];
    for (const item of dto.items) {
      menuItemIds.push(item.menuItemId);
    }
    const uniqueMenuItemIds = Array.from(new Set(menuItemIds));

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: uniqueMenuItemIds }, isActive: true },
      include: {
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: true },
            },
          },
        },
      },
    });

    if (menuItems.length !== uniqueMenuItemIds.length) {
      throw new BadRequestException('INVALID_ITEMS');
    }

    // загружаем все модификаторы из бд
    const optionIds: string[] = [];
    for (const item of dto.items) {
      const mods = item.modifierOptionIds ?? [];
      for (const id of mods) {
        optionIds.push(id);
      }
    }
    const uniqueOptionIds = Array.from(new Set(optionIds));

    const optionsFromDb: any[] = uniqueOptionIds.length
      ? await this.prisma.modifierOption.findMany({
          where: { id: { in: uniqueOptionIds }, isActive: true },
          include: { group: true },
        })
      : [];

    const optionMap = new Map<string, any>();
    for (const opt of optionsFromDb) {
      optionMap.set(opt.id, opt);
    }

    if (uniqueOptionIds.length !== optionMap.size) {
      throw new BadRequestException('INVALID_MODIFIERS');
    }

    // считаем стоимость каждой позиции
    const orderItemsData: any[] = [];
    let subtotal = 0;

    for (const itemDto of dto.items) {
      const menuItem = menuItems.find((m: any) => m.id === itemDto.menuItemId);
      if (!menuItem) {
        throw new BadRequestException('INVALID_ITEMS');
      }

      const selectedOptions: any[] = [];
      for (const optId of itemDto.modifierOptionIds ?? []) {
        const opt = optionMap.get(optId);
        if (!opt) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }
        selectedOptions.push(opt);
      }

      const groupsForItem = menuItem.modifierGroups.map((rel: any) => rel.modifierGroup);
      const allowedGroupIds = new Set(groupsForItem.map((g: any) => g.id));

      const selectedByGroup = new Map<string, any[]>();
      for (const opt of selectedOptions) {
        if (!allowedGroupIds.has(opt.groupId)) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }
        const existing = selectedByGroup.get(opt.groupId) ?? [];
        existing.push(opt);
        selectedByGroup.set(opt.groupId, existing);
      }

      for (const group of groupsForItem) {
        const selections = selectedByGroup.get(group.id) ?? [];
        const count = selections.length;

        if (group.type === 'SINGLE' && count > 1) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }
        if (count > group.maxSelected) {
          throw new BadRequestException('INVALID_MODIFIERS');
        }
      }

      // считаем итоговую цену позиции с модификаторами
      let optionsTotal = 0;
      for (const opt of selectedOptions) {
        optionsTotal += opt.priceDelta;
      }

      const unitPrice = menuItem.price + optionsTotal;
      const lineTotal = unitPrice * itemDto.quantity;
      subtotal += lineTotal;

      const modifiers: any[] = [];
      for (const opt of selectedOptions) {
        modifiers.push({
          modifierOptionId: opt.id,
          titleSnapshot: opt.title,
          priceDeltaSnapshot: opt.priceDelta,
        });
      }

      orderItemsData.push({
        menuItemId: menuItem.id,
        titleSnapshot: menuItem.title,
        unitPrice: unitPrice,
        quantity: itemDto.quantity,
        lineTotal: lineTotal,
        modifiers: modifiers,
      });
    }

    // проверяем минимальную сумму заказа
    if (subtotal < settings.minOrderAmount) {
      throw new BadRequestException('MIN_ORDER_NOT_MET');
    }

    const totalAmount = subtotal + deliveryFeeAmount;

    // создаем заказ в транзакции
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
          distanceKm: distanceKm,
          subtotalAmount: subtotal,
          deliveryFeeAmount: deliveryFeeAmount,
          totalAmount: totalAmount,
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
            data: item.modifiers.map((mod: any) => ({
              orderItemId: orderItem.id,
              modifierOptionId: mod.modifierOptionId,
              titleSnapshot: mod.titleSnapshot,
              priceDeltaSnapshot: mod.priceDeltaSnapshot,
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

    console.log('[ORDER] created order:', created.id, 'total:', created.totalAmount);

    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.ORDER_CREATED,
      orderId: created.id,
      data: { totalAmount: created.totalAmount },
    });

    // уведомляем диспетчеров и клиента
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
        distanceKm: distanceKm,
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
        review: { select: { rating: true, comment: true } },
      },
    });
  }

  async getOrders(status?: OrderStatus) {
    const whereClause = status ? { status: status } : undefined;
    return this.prisma.order.findMany({
      where: whereClause,
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
        payment: {
          select: { method: true, status: true },
        },
      },
    });
  }

  async getOrderById(orderId: string, userId: string, role: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        orderItems: {
          include: {
            menuItem: { select: { id: true, title: true } },
            modifiers: true,
          },
        },
        payment: true,
        delivery: {
          include: {
            courier: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // клиент может смотреть только свои заказы
    if (role !== UserRole.DISPATCHER && order.clientId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    const settings = await this.settingsService.getRestaurantSettings();

    // вычисляем breakdown стоимости доставки
    let surcharge = 0;
    if (order.deliveryType === DeliveryType.DELIVERY) {
      if (order.distanceKm != null && order.distanceKm > settings.freeDeliveryRadiusKm) {
        surcharge = settings.longDistanceFeeKzt ?? 0;
      }
    }

    const deliveryFee = {
      base: 0,
      surcharge: surcharge,
      total: order.deliveryFeeAmount,
      distanceKm: order.distanceKm ?? null,
    };

    return { ...order, deliveryFee: deliveryFee };
  }

  async updateStatus(orderId: string, userId: string, role: UserRole, dto: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // клиент может менять только свой заказ
    if (role === UserRole.CLIENT && order.clientId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    // курьер должен быть назначен на этот заказ
    if (role === UserRole.COURIER) {
      if (!order.delivery || order.delivery.courierId !== userId) {
        throw new ForbiddenException('FORBIDDEN');
      }
    }

    // нельзя менять статус завершенного/отмененного заказа
    if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('FORBIDDEN_STATUS_CHANGE');
    }

    // проверяем права роли на конкретный статус
    if (role === UserRole.DISPATCHER) {
      const allowedForDispatcher = [OrderStatus.CONFIRMED, OrderStatus.COOKING, OrderStatus.CANCELED];
      let ok = false;
      for (const s of allowedForDispatcher) {
        if (s === dto.status) { ok = true; break; }
      }
      if (!ok) throw new ForbiddenException('FORBIDDEN_STATUS_CHANGE');
    }

    if (role === UserRole.COURIER) {
      const allowedForCourier = [OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED];
      let ok = false;
      for (const s of allowedForCourier) {
        if (s === dto.status) { ok = true; break; }
      }
      if (!ok) throw new ForbiddenException('FORBIDDEN_STATUS_CHANGE');
    }

    if (role === UserRole.CLIENT) {
      if (dto.status !== OrderStatus.CANCELED) {
        throw new ForbiddenException('FORBIDDEN_STATUS_CHANGE');
      }
    }

    // проверяем переходы между статусами
    if (dto.status === OrderStatus.DELIVERED && !order.delivery) {
      throw new BadRequestException('DELIVERY_REQUIRED');
    }

    if (dto.status === OrderStatus.ON_THE_WAY && order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException('FORBIDDEN_STATUS_CHANGE');
    }

    // если это предзаказ - проверяем что время пришло
    if (order.scheduledFor != null) {
      const isLateStatus =
        dto.status === OrderStatus.PICKED_UP ||
        dto.status === OrderStatus.ON_THE_WAY ||
        dto.status === OrderStatus.DELIVERED;

      if (isLateStatus) {
        const now = DateTime.now().setZone(TIME_ZONE);
        const scheduled = DateTime.fromJSDate(order.scheduledFor).setZone(TIME_ZONE);
        if (now < scheduled) {
          throw new BadRequestException('PREORDER_NOT_READY');
        }
      }
    }

    // обновляем статус заказа
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        cancelReason: dto.status === OrderStatus.CANCELED ? dto.cancelReason : null,
      },
    });

    // обновляем статус платежа
    if (dto.status === OrderStatus.DELIVERED) {
      await this.prisma.payment.updateMany({
        where: { orderId: orderId },
        data: { status: PaymentStatus.PAID },
      });
      await this.audit.log({
        actorUserId: userId,
        action: AuditAction.PAYMENT_STATUS_CHANGED,
        orderId: orderId,
        data: { paymentStatus: PaymentStatus.PAID },
      });
    } else if (dto.status === OrderStatus.CANCELED) {
      await this.prisma.payment.updateMany({
        where: { orderId: orderId },
        data: { status: PaymentStatus.REFUNDED },
      });
      await this.audit.log({
        actorUserId: userId,
        action: AuditAction.PAYMENT_STATUS_CHANGED,
        orderId: orderId,
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });
    }

    const auditAction =
      dto.status === OrderStatus.CANCELED
        ? AuditAction.ORDER_CANCELED
        : AuditAction.ORDER_STATUS_CHANGED;

    await this.audit.log({
      actorUserId: userId,
      action: auditAction,
      orderId: order.id,
      data: {
        fromStatus: order.status,
        toStatus: dto.status,
        cancelReason: dto.cancelReason ?? undefined,
      },
    });

    // шлем ws событие
    this.wsEvents.emitOrderStatusChanged({
      orderId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
      courierId: order.delivery?.courierId ?? null,
    });

    // push уведомления клиенту
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

    // push уведомления диспетчерам
    if (dto.status === OrderStatus.DELIVERED || dto.status === OrderStatus.CANCELED) {
      await this.notifications.notifyRole(
        UserRole.DISPATCHER,
        'Статус заказа',
        `Заказ #${order.id}: ${dto.status}`,
      );
    }

    console.log('[ORDER] status changed:', orderId, '->', dto.status);

    return updated;
  }

  async createReview(orderId: string, userId: string, rating: number, comment?: string) {
    // проверяем что заказ существует и принадлежит пользователю
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.clientId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('ORDER_NOT_DELIVERED');
    }

    // upsert - обновляем если уже есть, создаем если нет
    return this.prisma.orderReview.upsert({
      where: { orderId: orderId },
      update: { rating: rating, comment: comment },
      create: { orderId: orderId, rating: rating, comment: comment },
    });
  }
}
