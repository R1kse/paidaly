import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { WsEventsService } from '../websocket/ws-events.service';

interface AuthRequest extends Request {
  user: { id: string; role: UserRole; name: string };
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly wsEvents: WsEventsService,
  ) {}

  @Get(':orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.messages.getByOrder(orderId);
  }

  @Post(':orderId')
  async send(
    @Req() req: AuthRequest,
    @Param('orderId') orderId: string,
    @Body('text') text: string,
  ) {
    const msg = await this.messages.create(req.user.id, orderId, text);
    this.wsEvents.emitChatMessage({ orderId, message: msg });
    return msg;
  }
}
