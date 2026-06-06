import { BadRequestException, Injectable } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

// сервис для отправки пуш уведомлений через web-push / VAPID
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    // настраиваем vapid если есть ключи
    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      console.log('[PUSH] VAPID keys not set, push notifications disabled');
    }
  }

  getPublicKey() {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
      throw new BadRequestException('VAPID_PUBLIC_KEY_NOT_SET');
    }
    return key;
  }

  async upsertSubscription(userId: string, subscription: any, userAgent?: string) {
    const result = await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent,
      },
      create: {
        userId: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent,
      },
    });
    return result;
  }

  async removeSubscription(endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { endpoint: endpoint } });
  }

  // отправляем уведомление конкретному пользователю
  async notifyUser(userId: string, title: string, body: string) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId: userId } });
    if (subs.length === 0) {
      return;
    }
    await this.sendPushToAll(subs, title, body);
  }

  // отправляем уведомление всем пользователям с указанной ролью
  async notifyRole(role: UserRole, title: string, body: string) {
    const users = await this.prisma.user.findMany({
      where: { role: role },
      select: { id: true },
    });

    const userIds: string[] = [];
    for (const u of users) {
      userIds.push(u.id);
    }

    if (userIds.length === 0) {
      return;
    }

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    await this.sendPushToAll(subs, title, body);
  }

  // приватный метод - шлем пуш всем подпискам
  private async sendPushToAll(subs: any[], title: string, body: string) {
    const payload = JSON.stringify({ title: title, body: body });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (err: any) {
        console.error('[PUSH] failed to send:', err?.statusCode);
        // если подписка протухла - удаляем её
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await this.removeSubscription(sub.endpoint);
        }
      }
    }
  }
}
