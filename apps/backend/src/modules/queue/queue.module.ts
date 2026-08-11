import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueValidator } from './validators/queue.validator';

@Module({
  controllers: [QueueController],
  providers: [QueueService, QueueValidator],
  exports: [QueueService],
})
export class QueueModule {}
