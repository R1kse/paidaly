import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WsEventsService } from '../websocket/ws-events.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  private get merchantId() { return process.env.PAYBOX_MERCHANT_ID!; }
  private get secretKey()  { return process.env.PAYBOX_SECRET_KEY!; }
  private get testMode()   { return process.env.PAYBOX_TEST_MODE === '1'; }
  private get backendUrl() { return process.env.BACKEND_URL || 'https://paidaly.up.railway.app'; }
  private get frontendUrl(){ return process.env.FRONTEND_URL || 'https://sbaisarenov.github.io/paidaly'; }

  constructor(
    private prisma: PrismaService,
    private wsEvents: WsEventsService,
  ) {}

  // PayBox signature: MD5("script_name;val1;val2;...;secret_key") — params sorted by key
  private sign(scriptName: string, params: Record<string, string>): string {
    const values = Object.keys(params).sort().map((k) => params[k]);
    const raw = [scriptName, ...values, this.secretKey].join(';');
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  private xmlTag(xml: string, tag: string): string {
    const m = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
    return m ? m[1] : '';
  }

  private xmlResponse(status: 'ok' | 'error', description: string): string {
    const salt = crypto.randomBytes(8).toString('hex');
    return (
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<response>` +
      `<pg_status>${status}</pg_status>` +
      `<pg_description>${description}</pg_description>` +
      `<pg_salt>${salt}</pg_salt>` +
      `</response>`
    );
  }

  async createPayboxPayment(orderId: string, requestingUserId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.clientId !== requestingUserId) throw new ForbiddenException('FORBIDDEN');

    const salt = crypto.randomBytes(8).toString('hex');

    const params: Record<string, string> = {
      pg_merchant_id:   this.merchantId,
      pg_amount:        order.totalAmount.toFixed(2),
      pg_currency:      'KZT',
      pg_description:   `Заказ Paidaly #${orderId.slice(-6).toUpperCase()}`,
      pg_order_id:      orderId,
      pg_salt:          salt,
      pg_result_url:    `${this.backendUrl}/payments/paybox/webhook`,
      pg_success_url:   `${this.frontendUrl}/client/orders/${orderId}?payment=success`,
      pg_failure_url:   `${this.frontendUrl}/client/orders/${orderId}?payment=failed`,
      pg_testing_mode:  this.testMode ? '1' : '0',
      pg_request_method:'POST',
    };

    params.pg_sig = this.sign('payment.php', params);

    const body = new URLSearchParams(params).toString();
    const response = await fetch('https://api.paybox.money/payment.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const xml = await response.text();
    this.logger.log(`PayBox init response: ${xml}`);

    const pgStatus = this.xmlTag(xml, 'pg_status');
    if (pgStatus !== 'ok') {
      const errDesc = this.xmlTag(xml, 'pg_error_description');
      throw new Error(`PayBox error: ${errDesc || 'unknown'}`);
    }

    const paymentId  = this.xmlTag(xml, 'pg_payment_id');
    const redirectUrl = this.xmlTag(xml, 'pg_redirect_url');

    // store PayBox payment ID so we can reference it later
    await this.prisma.payment.update({
      where: { orderId },
      data: { providerRef: paymentId },
    });

    return redirectUrl;
  }

  // Клиент нажал «Я оплатил» — помечаем оплату как PAID, заказ остаётся CREATED до подтверждения диспетчера
  async confirmKaspiPayment(orderId: string, requestingUserId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.clientId !== requestingUserId) throw new ForbiddenException('FORBIDDEN');

    await this.prisma.payment.updateMany({
      where: { orderId },
      data: { status: PaymentStatus.PAID },
    });

    // Уведомляем диспетчеров о поступившей оплате через WS
    this.wsEvents.emitOrderStatusChanged({
      orderId: order.id,
      status: order.status,
      updatedAt: new Date(),
      courierId: null,
    });

    this.logger.log(`Kaspi QR payment claimed by client for order ${orderId} — awaiting dispatcher confirmation`);
  }

  // Called by PayBox via POST to /payments/paybox/webhook
  async handleWebhook(body: Record<string, string>): Promise<string> {
    const { pg_sig, ...rest } = body;

    // Verify signature from PayBox
    const expected = this.sign('webhook', rest);
    if (pg_sig && pg_sig !== expected) {
      this.logger.warn(`PayBox webhook signature mismatch. Got: ${pg_sig}, expected: ${expected}`);
      // In production: return this.xmlResponse('error', 'Invalid signature');
    }

    const orderId   = body.pg_order_id;
    const paymentId = body.pg_payment_id;
    const result    = body.pg_result; // '1' = paid, '0' = failed

    if (!orderId) return this.xmlResponse('error', 'Missing order ID');

    try {
      if (result === '1') {
        await this.prisma.payment.updateMany({
          where: { orderId },
          data: { status: PaymentStatus.PAID, providerRef: paymentId },
        });

        const updated = await this.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CONFIRMED },
          include: { delivery: true },
        });

        this.wsEvents.emitOrderStatusChanged({
          orderId: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt,
          courierId: updated.delivery?.courierId ?? null,
        });

        this.logger.log(`PayBox payment confirmed for order ${orderId}`);
      } else {
        await this.prisma.payment.updateMany({
          where: { orderId },
          data: { status: PaymentStatus.FAILED },
        });
        this.logger.warn(`PayBox payment failed for order ${orderId}`);
      }

      return this.xmlResponse('ok', 'Success');
    } catch (err) {
      this.logger.error(`Webhook processing error for order ${orderId}:`, err);
      return this.xmlResponse('error', 'Internal error');
    }
  }
}
