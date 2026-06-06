import { Controller, Param, Post, Req, Res, Body, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // Клиент нажал «Я оплатил» — подтверждение Kaspi QR оплаты
  @UseGuards(JwtAuthGuard)
  @Post('kaspi/confirm/:orderId')
  async confirmKaspi(@Param('orderId') orderId: string, @Req() req: any) {
    await this.paymentsService.confirmKaspiPayment(orderId, req.user.id);
    return { ok: true };
  }

  // Клиент вызывает после создания заказа с методом KASPI (PayBox — резерв)
  @UseGuards(JwtAuthGuard)
  @Post('paybox/create/:orderId')
  async createPayment(@Param('orderId') orderId: string, @Req() req: any) {
    const paymentUrl = await this.paymentsService.createPayboxPayment(orderId, req.user.id);
    return { paymentUrl };
  }

  // Webhook от PayBox — без JWT, PayBox шлёт сам
  @Post('paybox/webhook')
  async webhook(@Body() body: Record<string, string>, @Res() res: Response) {
    const xml = await this.paymentsService.handleWebhook(body);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  }
}
