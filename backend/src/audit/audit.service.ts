import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: {
    actorUserId: string;
    action: AuditAction;
    orderId?: string;
    data?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        orderId: input.orderId,
        data: input.data ?? undefined,
      },
    });
  }

  async list(orderId?: string, page = 1, limit = 50) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: orderId ? { orderId } : undefined,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({
        where: orderId ? { orderId } : undefined,
      }),
    ]);

    return { items, total, page, limit: take };
  }
}
