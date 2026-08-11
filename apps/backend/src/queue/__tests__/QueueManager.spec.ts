/**
 * @file src/queue/__tests__/QueueManager.spec.ts
 * @description Phase 9 BullMQ Queue Manager Unit & Integration Test Suite.
 */

import { QueueManager, QueueName } from '../QueueManager';

describe('Phase 9 BullMQ Queue Engine Suite', () => {
  let queueManager: QueueManager;

  beforeEach(() => {
    queueManager = new QueueManager({
      concurrencyMap: {
        [QueueName.JOB_SEARCH]: 2,
        [QueueName.AI_MATCHING]: 3,
        [QueueName.BROWSER_AUTOMATION]: 1,
      },
    });
  });

  afterEach(async () => {
    await queueManager.shutdown();
  });

  describe('1. Queue Initialization', () => {
    it('should initialize all 7 standard queues plus Dead Letter Queue', async () => {
      const metrics = await queueManager.getDashboardMetrics();
      expect(metrics.queues).toBeDefined();
      expect(metrics.queues.length).toBe(8); // 7 + DLQ

      const queueNames = metrics.queues.map((q) => q.queueName);
      expect(queueNames).toContain(QueueName.JOB_SEARCH);
      expect(queueNames).toContain(QueueName.AI_MATCHING);
      expect(queueNames).toContain(QueueName.RESUME_GENERATION);
      expect(queueNames).toContain(QueueName.COVER_LETTER);
      expect(queueNames).toContain(QueueName.BROWSER_AUTOMATION);
      expect(queueNames).toContain(QueueName.EMAIL_PROCESSING);
      expect(queueNames).toContain(QueueName.NOTIFICATIONS);
      expect(queueNames).toContain(QueueName.DEAD_LETTER_QUEUE);
    });
  });

  describe('2. Job Enqueueing & Priority', () => {
    it('should enqueue jobs with priority and retry policies across queues', async () => {
      const job1 = await queueManager.addJob(QueueName.JOB_SEARCH, 'CRAWL_AU', { country: 'AU' }, { priority: 1, maxRetries: 3 });
      const job2 = await queueManager.addJob(QueueName.AI_MATCHING, 'EVALUATE', { jobId: '101' }, { priority: 2 });
      const job3 = await queueManager.addJob(QueueName.BROWSER_AUTOMATION, 'APPLY', { company: 'Atlassian' }, { priority: 1 });

      expect(job1.jobId).toBeDefined();
      expect(job1.status).toBe('ENQUEUED');
      expect(job2.jobId).toBeDefined();
      expect(job3.jobId).toBeDefined();

      const metrics = await queueManager.getDashboardMetrics();
      expect(metrics.totalJobs).toBeGreaterThanOrEqual(3);
    });
  });

  describe('3. Worker Execution & Concurrency', () => {
    it('should process enqueued jobs through registered worker processors', async () => {
      const processed: string[] = [];

      queueManager.registerWorker(QueueName.NOTIFICATIONS, async (job) => {
        processed.push((job.payload as any).message);
        return { success: true };
      });

      await queueManager.addJob(QueueName.NOTIFICATIONS, 'SEND_EMAIL', { message: 'Application Submitted' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(processed).toContain('Application Submitted');
    });
  });

  describe('4. Failure Handling & Dead Letter Queue (DLQ)', () => {
    it('should route repeatedly failing jobs to the Dead Letter Queue', async () => {
      queueManager.registerWorker(QueueName.EMAIL_PROCESSING, async () => {
        throw new Error('SMTP Connection Timeout');
      });

      await queueManager.addJob(QueueName.EMAIL_PROCESSING, 'PARSE_INBOX', { user: 'test' }, { maxRetries: 1 });

      await new Promise((resolve) => setTimeout(resolve, 150));

      const dlq = queueManager.getDeadLetterQueue();
      expect(dlq.length).toBeGreaterThanOrEqual(1);
      expect(dlq[0].reason).toContain('SMTP Connection Timeout');
    });

    it('should replay a captured job from DLQ back to its target queue', async () => {
      await queueManager.sendToDeadLetterQueue(
        { id: 'failed_job_1', type: 'RETRY_TEST', payload: {}, targetQueue: QueueName.JOB_SEARCH },
        'Transient Network Flake',
        3
      );

      const dlqBefore = queueManager.getDeadLetterQueue();
      expect(dlqBefore.length).toBe(1);

      const replayed = await queueManager.retryDeadLetterJob('failed_job_1');
      expect(replayed).toBe(true);

      const dlqAfter = queueManager.getDeadLetterQueue();
      expect(dlqAfter.length).toBe(0);
    });

    it('should clear all DLQ entries', async () => {
      await queueManager.sendToDeadLetterQueue(
        { id: 'failed_job_2', type: 'TEST', payload: {}, targetQueue: QueueName.JOB_SEARCH },
        'Error',
        1
      );

      await queueManager.clearDeadLetterQueue();
      expect(queueManager.getDeadLetterQueue().length).toBe(0);
    });
  });

  describe('5. Queue Pause & Resume Controls', () => {
    it('should pause and resume background queue processing', async () => {
      await queueManager.pauseQueue(QueueName.JOB_SEARCH);
      let metrics = await queueManager.getDashboardMetrics();
      const jobQ = metrics.queues.find((q) => q.queueName === QueueName.JOB_SEARCH);
      expect(jobQ?.paused).toBe(true);

      await queueManager.resumeQueue(QueueName.JOB_SEARCH);
      metrics = await queueManager.getDashboardMetrics();
      const resumedQ = metrics.queues.find((q) => q.queueName === QueueName.JOB_SEARCH);
      expect(resumedQ?.paused).toBe(false);
    });
  });

  describe('6. Graceful Shutdown', () => {
    it('should gracefully close workers and queue connections', async () => {
      await expect(queueManager.shutdown()).resolves.not.toThrow();
    });
  });
});
