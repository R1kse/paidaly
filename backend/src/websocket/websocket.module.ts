import { Module } from '@nestjs/common';
import { WsEventsService } from './ws-events.service';

@Module({
  providers: [WsEventsService],
  exports: [WsEventsService],
})
export class WebsocketModule {}
