import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { TelegramTicketService } from './telegram-ticket.service';

@Module({
  controllers: [SupportController],
  providers: [TelegramTicketService],
  exports: [TelegramTicketService],
})
export class SupportModule {}
