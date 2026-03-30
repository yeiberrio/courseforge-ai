import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [PrismaModule, AgentsModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
