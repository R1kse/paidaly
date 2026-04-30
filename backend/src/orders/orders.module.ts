import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SettingsModule } from '../settings/settings.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { OrderFlowService } from './flow/order-flow.service';

@Module({
  imports: [SettingsModule, WebsocketModule, NotificationsModule, AuditModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderFlowService],
})
export class OrdersModule {}
