import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AuditModule } from '../audit/audit.module';
import { OrderFlowService } from '../orders/flow/order-flow.service';

@Module({
  imports: [NotificationsModule, WebsocketModule, AuditModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, OrderFlowService],
})
export class DeliveriesModule {}
