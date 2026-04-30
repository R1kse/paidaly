import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppGateway } from './app.gateway';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { WebsocketModule } from './websocket/websocket.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfileModule } from './profile/profile.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    MenuModule,
    OrdersModule,
    DeliveriesModule,
    WebsocketModule,
    NotificationsModule,
    ProfileModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppGateway],
})
export class AppModule {}
