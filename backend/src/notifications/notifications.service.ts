import { BadRequestException, Injectable } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  getPublicKey() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new BadRequestException('VAPID_PUBLIC_KEY_NOT_SET');
    }
    return publicKey;
  }

  async upsertSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
    });
  }

  async removeSubscription(endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async notifyUser(userId: string, title: string, body: string) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await this.sendToSubscriptions(subs, title, body);
  }

  async notifyRole(role: UserRole, title: string, body: string) {
    const users = await this.prisma.user.findMany({ where: { role }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
    await this.sendToSubscriptions(subs, title, body);
  }

  private async sendToSubscriptions(
    subs: { endpoint: string; p256dh: string; auth: string }[],
    title: string,
    body: string,
  ) {
    const payload = JSON.stringify({ title, body });

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
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          await this.removeSubscription(sub.endpoint);
        }
      }
    }
  }
}
