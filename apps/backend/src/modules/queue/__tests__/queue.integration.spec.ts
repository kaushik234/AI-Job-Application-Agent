/**
 * @file src/modules/queue/__tests__/queue.integration.spec.ts
 * @description Integration test suite for NestJS Queue Module REST endpoints (/enqueue, /metrics, /dlq, /pause, /resume).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from '../queue.controller';
import { QueueService } from '../queue.service';

describe('NestJS Queue Module Integration Suite', () => {
  let controller: QueueController;
  let service: QueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [QueueService],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    service = module.get<QueueService>(QueueService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onApplicationShutdown();
  });

  it('should enqueue a task into job_search queue', async () => {
    const res = await controller.enqueue({
      type: 'CRAWL_TARGET',
      queueName: 'job_search',
      payload: { country: 'AU' },
      priority: 1,
      maxRetries: 3,
    });

    expect(res).toBeDefined();
    expect(res.jobId).toBeDefined();
    expect(res.queueName).toBe('job_search');
    expect(res.status).toBe('ENQUEUED');
  });

  it('should return dashboard metrics across all queues', async () => {
    const metrics = await controller.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.queues.length).toBe(8);
    expect(metrics.redisStatus).toBeDefined();
  });

  it('should pause and resume queue via controller endpoints', async () => {
    const pauseRes = await controller.pauseQueue({ queueName: 'ai_matching' });
    expect(pauseRes.success).toBe(true);

    const metrics = await controller.getMetrics();
    const q = metrics.queues.find((item) => item.queueName === 'ai_matching');
    expect(q?.paused).toBe(true);

    const resumeRes = await controller.resumeQueue({ queueName: 'ai_matching' });
    expect(resumeRes.success).toBe(true);
  });

  it('should manage Dead Letter Queue items', async () => {
    const dlq = await controller.getDeadLetterQueue();
    expect(dlq).toBeDefined();

    const clearRes = await controller.clearDlq();
    expect(clearRes.success).toBe(true);
  });
});
