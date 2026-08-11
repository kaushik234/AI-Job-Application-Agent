import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { EnqueueJobDto, QueueJobResponseDto, PauseQueueDto, ResumeQueueDto, RetryDlqDto, QueueControlResponseDto } from './dto/queue.dto';
import { queueManager, QueueManager, QueueName } from '../../queue/QueueManager';
import { QueueProcessorRegistry } from '../../queue/QueueProcessorRegistry';

@Injectable()
export class QueueService implements OnModuleInit, OnApplicationShutdown {
  private manager: QueueManager;
  private registry: QueueProcessorRegistry;

  constructor() {
    this.manager = queueManager;
    this.registry = new QueueProcessorRegistry(this.manager);
  }

  onModuleInit() {
    this.registry.registerAllProcessors();
  }

  async enqueue(dto: EnqueueJobDto): Promise<QueueJobResponseDto> {
    const targetQueue = (dto.queueName as QueueName) || QueueName.JOB_SEARCH;
    const res = await this.manager.addJob(targetQueue, dto.type || 'TASK', dto.payload || dto, {
      priority: dto.priority,
      maxRetries: dto.maxRetries,
    });

    return {
      jobId: res.jobId,
      queueName: res.queueName,
      status: res.status,
    };
  }

  async getQueueMetrics() {
    return this.manager.getDashboardMetrics();
  }

  async getDeadLetterQueue() {
    return this.manager.getDeadLetterQueue();
  }

  async pauseQueue(dto: PauseQueueDto): Promise<QueueControlResponseDto> {
    const paused = await this.manager.pauseQueue(dto.queueName as QueueName);
    return {
      success: paused,
      message: `Successfully paused queue: ${dto.queueName}`,
    };
  }

  async resumeQueue(dto: ResumeQueueDto): Promise<QueueControlResponseDto> {
    const resumed = await this.manager.resumeQueue(dto.queueName as QueueName);
    return {
      success: resumed,
      message: `Successfully resumed queue: ${dto.queueName}`,
    };
  }

  async retryDlqJob(dto: RetryDlqDto): Promise<QueueControlResponseDto> {
    const retried = await this.manager.retryDeadLetterJob(dto.jobId);
    return {
      success: retried,
      message: retried ? `Successfully replayed DLQ job ${dto.jobId}` : `DLQ job ${dto.jobId} not found`,
    };
  }

  async clearDlq(): Promise<QueueControlResponseDto> {
    const cleared = await this.manager.clearDeadLetterQueue();
    return {
      success: cleared,
      message: 'Successfully cleared Dead Letter Queue',
    };
  }

  async onApplicationShutdown() {
    await this.manager.shutdown();
  }
}
