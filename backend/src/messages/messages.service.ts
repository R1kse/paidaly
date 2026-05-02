import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SENDER_SELECT = { id: true, name: true, role: true };

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  getByOrder(orderId: string) {
    return this.prisma.chatMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: SENDER_SELECT } },
    });
  }

  create(senderId: string, orderId: string, text: string) {
    return this.prisma.chatMessage.create({
      data: { orderId, senderId, text },
      include: { sender: { select: SENDER_SELECT } },
    });
  }
}
