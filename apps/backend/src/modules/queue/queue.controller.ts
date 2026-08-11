import { Controller, Post, Get, Delete, Body, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { EnqueueJobDto, QueueJobResponseDto, PauseQueueDto, ResumeQueueDto, RetryDlqDto, QueueControlResponseDto } from './dto/queue.dto';
import { QueueExceptionFilter } from './filters/queue.filter';
import { QueueInterceptor } from './interceptors/queue.interceptor';

@ApiTags('Queue')
@Controller('queue')
@UseFilters(QueueExceptionFilter)
@UseInterceptors(QueueInterceptor)
export class QueueController {
  constructor(@Inject(QueueService) private readonly queueService: QueueService) {}

  @Post('enqueue')
  @ApiOperation({ summary: 'Enqueue async background task into target BullMQ queue' })
  @ApiResponse({ status: 201, type: QueueJobResponseDto })
  async enqueue(@Body() dto: EnqueueJobDto): Promise<QueueJobResponseDto> {
    return this.queueService.enqueue(dto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get background queue processing metrics and Redis connection status' })
  async getMetrics() {
    return this.queueService.getQueueMetrics();
  }

  @Get('dlq')
  @ApiOperation({ summary: 'Get Dead Letter Queue captured failed jobs' })
  async getDeadLetterQueue() {
    return this.queueService.getDeadLetterQueue();
  }

  @Post('dlq/retry')
  @ApiOperation({ summary: 'Replay failed job from Dead Letter Queue back to target queue' })
  async retryDlqJob(@Body() dto: RetryDlqDto): Promise<QueueControlResponseDto> {
    return this.queueService.retryDlqJob(dto);
  }

  @Delete('dlq')
  @ApiOperation({ summary: 'Clear all items in Dead Letter Queue' })
  async clearDlq(): Promise<QueueControlResponseDto> {
    return this.queueService.clearDlq();
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause a specific background processing queue' })
  async pauseQueue(@Body() dto: PauseQueueDto): Promise<QueueControlResponseDto> {
    return this.queueService.pauseQueue(dto);
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume processing for a paused queue' })
  async resumeQueue(@Body() dto: ResumeQueueDto): Promise<QueueControlResponseDto> {
    return this.queueService.resumeQueue(dto);
  }
}
