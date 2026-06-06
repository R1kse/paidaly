import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(input: {
    actorUserId: string;
    action: AuditAction;
    orderId?: string;
    data?: any;
  }) {
    console.log('[AUDIT]', input.action, 'by', input.actorUserId);

    const record = await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        orderId: input.orderId,
        data: input.data ?? undefined,
      },
    });

    return record;
  }

  async list(orderId?: string, page = 1, limit = 50) {
    // максимум 100 записей на страницу
    let take = limit;
    if (take > 100) take = 100;
    const skip = (page - 1) * take;

    const whereClause = orderId ? { orderId: orderId } : undefined;

    const items = await this.prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: take,
    });

    const total = await this.prisma.auditLog.count({
      where: whereClause,
    });

    return {
      items: items,
      total: total,
      page: page,
      limit: take,
    };
  }
}
