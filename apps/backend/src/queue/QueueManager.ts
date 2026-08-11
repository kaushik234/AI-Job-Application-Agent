/**
 * @file src/queue/QueueManager.ts
 * @description Phase 9 BullMQ Queue Manager for Job Search, AI Matching, Resume Generation, Cover Letter, Browser Automation, Email Processing, Notifications, and Dead Letter Queue.
 * @architect Clean Architecture - Resilient Background Task Queue Engine
 */

import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@sentinel/shared';

export enum QueueName {
  JOB_SEARCH = 'job_search',
  AI_MATCHING = 'ai_matching',
  RESUME_GENERATION = 'resume_generation',
  COVER_LETTER = 'cover_letter',
  BROWSER_AUTOMATION = 'browser_automation',
  EMAIL_PROCESSING = 'email_processing',
  NOTIFICATIONS = 'notifications',
  DEAD_LETTER_QUEUE = 'dead_letter_queue',
}

export interface JobPayload<T = any> {
  id?: string;
  type: string;
  payload: T;
  priority?: number; // 1 (Highest) to 10 (Lowest)
  maxRetries?: number;
  retryDelayMs?: number;
  enqueuedAt?: string;
  targetQueue?: QueueName;
}

export interface QueueJobMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface DashboardMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  deadLetterCount: number;
  queues: QueueJobMetrics[];
  redisStatus: 'CONNECTED' | 'DISCONNECTED' | 'FALLBACK';
  updatedAt: string;
}

export interface QueueConfig {
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  concurrencyMap?: Partial<Record<QueueName, number>>;
  rateLimitMap?: Partial<Record<QueueName, { max: number; duration: number }>>;
}

export class QueueManager {
  private redisConnection: Redis | null = null;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private isRedisConnected: boolean = false;
  private pausedQueues: Set<string> = new Set();
  private fallbackMemoryQueue: Map<string, Array<{ job: JobPayload; status: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' }>> = new Map();
  private deadLetterQueue: Array<{ job: JobPayload; reason: string; failedAt: string; retryCount: number }> = [];

  // Default concurrency per queue
  private concurrencyMap: Record<QueueName, number> = {
    [QueueName.JOB_SEARCH]: 3,
    [QueueName.AI_MATCHING]: 5,
    [QueueName.RESUME_GENERATION]: 3,
    [QueueName.COVER_LETTER]: 3,
    [QueueName.BROWSER_AUTOMATION]: 2, // Low concurrency to prevent browser thrashing
    [QueueName.EMAIL_PROCESSING]: 4,
    [QueueName.NOTIFICATIONS]: 5,
    [QueueName.DEAD_LETTER_QUEUE]: 1,
  };

  // Default rate limits per queue
  private rateLimitMap: Record<string, { max: number; duration: number }> = {
    [QueueName.JOB_SEARCH]: { max: 10, duration: 1000 },
    [QueueName.AI_MATCHING]: { max: 20, duration: 1000 },
    [QueueName.BROWSER_AUTOMATION]: { max: 2, duration: 2000 },
  };

  constructor(config: QueueConfig = {}) {
    this.initializeRedis(config);
    this.initializeQueues();
  }

  /**
   * Initializes Redis client with offline error resilience
   */
  private initializeRedis(config: QueueConfig) {
    const host = config.redisHost || process.env.REDIS_HOST || 'localhost';
    const port = config.redisPort || parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = config.redisPassword || process.env.REDIS_PASSWORD || undefined;

    if (config.concurrencyMap) {
      this.concurrencyMap = { ...this.concurrencyMap, ...config.concurrencyMap };
    }

    try {
      this.redisConnection = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('QUEUE', `Redis connection unreachable at ${host}:${port}. Operating in Resilient Memory Queue Fallback mode.`);
            this.isRedisConnected = false;
            return null; // Stop reconnecting automatically
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.redisConnection.on('connect', () => {
        this.isRedisConnected = true;
        logger.info('QUEUE', `Connected to Redis server at ${host}:${port}`);
      });

      this.redisConnection.on('error', (err) => {
        this.isRedisConnected = false;
      });
    } catch (err) {
      this.isRedisConnected = false;
      logger.warn('QUEUE', 'Redis initialization fallback activated');
    }
  }

  /**
   * Initializes all 7 standard BullMQ queues plus Dead Letter Queue
   */
  private initializeQueues() {
    const allQueueNames = Object.values(QueueName);

    for (const qName of allQueueNames) {
      this.fallbackMemoryQueue.set(qName, []);

      if (this.redisConnection) {
        try {
          const queue = new Queue(qName, {
            connection: this.redisConnection,
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
              removeOnComplete: 100,
              removeOnFail: 500,
            },
          });
          this.queues.set(qName, queue);
        } catch (err) {
          // Graceful fallback
        }
      }
    }
    logger.info('QUEUE', `Initialized ${allQueueNames.length} BullMQ Background Queues (Job Search, AI Matching, Resume, Cover Letter, Automation, Email, Notifications, DLQ)`);
  }

  /**
   * Enqueues a job into a specified queue with priority, retry policy, and rate limiting support
   */
  public async addJob<T>(
    queueName: QueueName,
    jobType: string,
    payload: T,
    options: {
      priority?: number;
      maxRetries?: number;
      delayMs?: number;
    } = {}
  ): Promise<{ jobId: string; queueName: string; status: string }> {
    const jobId = `job_${queueName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priority = options.priority ?? 5;
    const maxRetries = options.maxRetries ?? 3;

    const jobData: JobPayload<T> = {
      id: jobId,
      type: jobType,
      payload,
      priority,
      maxRetries,
      enqueuedAt: new Date().toISOString(),
      targetQueue: queueName,
    };

    const queue = this.queues.get(queueName);

    if (this.isRedisConnected && queue) {
      try {
        await queue.add(jobType, jobData, {
          jobId,
          priority,
          delay: options.delayMs || 0,
          attempts: maxRetries,
          backoff: { type: 'exponential', delay: 1000 },
        });

        logger.info('QUEUE', `[BullMQ] Enqueued job ${jobId} to "${queueName}" (Priority=${priority})`);
        return { jobId, queueName, status: 'ENQUEUED' };
      } catch (err) {
        logger.warn('QUEUE', `Failed to enqueue to Redis BullMQ. Falling back to memory queue for ${queueName}`);
      }
    }

    // Resilient Fallback Memory Queue
    const memList = this.fallbackMemoryQueue.get(queueName) || [];
    memList.push({ job: jobData, status: 'QUEUED' });
    this.fallbackMemoryQueue.set(queueName, memList);

    logger.info('QUEUE', `[Fallback] Enqueued job ${jobId} to memory queue "${queueName}"`);
    return { jobId, queueName, status: 'ENQUEUED' };
  }

  /**
   * Registers a worker processor for a specific queue with concurrency and retry handling
   */
  public registerWorker<T>(
    queueName: QueueName,
    processor: (job: JobPayload<T>) => Promise<any>
  ): Worker | null {
    const concurrency = this.concurrencyMap[queueName] || 3;

    if (this.isRedisConnected && this.redisConnection) {
      try {
        const worker = new Worker(
          queueName,
          async (bullJob: Job) => {
            logger.info('QUEUE', `[BullMQ Worker] Processing job ${bullJob.id} on queue "${queueName}"`);
            const jobData: JobPayload<T> = bullJob.data;
            try {
              return await processor(jobData);
            } catch (error: any) {
              if (bullJob.attemptsMade >= (jobData.maxRetries || 3)) {
                await this.sendToDeadLetterQueue(jobData, error?.message || 'Exceeded maximum retries', bullJob.attemptsMade);
              }
              throw error;
            }
          },
          {
            connection: this.redisConnection,
            concurrency,
            limiter: this.rateLimitMap[queueName],
          }
        );

        worker.on('completed', (job) => {
          logger.info('QUEUE', `[BullMQ Worker] Completed job ${job.id} on queue "${queueName}"`);
        });

        worker.on('failed', (job, err) => {
          logger.error('QUEUE', `[BullMQ Worker] Job ${job?.id} failed on queue "${queueName}"`, { error: err.message });
        });

        this.workers.set(queueName, worker);
        return worker;
      } catch (err) {
        logger.warn('QUEUE', `Failed to register BullMQ worker for ${queueName}. Using memory processor.`);
      }
    }

    // Process fallback memory items asynchronously
    setTimeout(async () => {
      if (this.pausedQueues.has(queueName)) return;

      const list = this.fallbackMemoryQueue.get(queueName) || [];
      const queuedItems = list.filter((item) => item.status === 'QUEUED');

      for (const item of queuedItems) {
        item.status = 'ACTIVE';
        try {
          await processor(item.job);
          item.status = 'COMPLETED';
        } catch (err: any) {
          item.status = 'FAILED';
          await this.sendToDeadLetterQueue(item.job, err?.message || 'Worker error', 1);
        }
      }
    }, 50);

    return null;
  }

  /**
   * Pauses execution for a specific queue
   */
  public async pauseQueue(queueName: QueueName): Promise<boolean> {
    this.pausedQueues.add(queueName);

    const queue = this.queues.get(queueName);
    if (this.isRedisConnected && queue) {
      try {
        await queue.pause();
      } catch (err) {
        // ignore
      }
    }

    logger.info('QUEUE', `Paused background processing for queue: ${queueName}`);
    return true;
  }

  /**
   * Resumes execution for a paused queue
   */
  public async resumeQueue(queueName: QueueName): Promise<boolean> {
    this.pausedQueues.delete(queueName);

    const queue = this.queues.get(queueName);
    if (this.isRedisConnected && queue) {
      try {
        await queue.resume();
      } catch (err) {
        // ignore
      }
    }

    logger.info('QUEUE', `Resumed background processing for queue: ${queueName}`);
    return true;
  }

  /**
   * Dead Letter Queue (DLQ): Captures failed jobs after retries are exhausted
   */
  public async sendToDeadLetterQueue(job: JobPayload, reason: string, retryCount: number): Promise<void> {
    const dlqItem = {
      job,
      reason,
      failedAt: new Date().toISOString(),
      retryCount,
    };
    this.deadLetterQueue.push(dlqItem);

    const dlq = this.queues.get(QueueName.DEAD_LETTER_QUEUE);
    if (this.isRedisConnected && dlq) {
      try {
        await dlq.add('dead_letter_item', dlqItem);
      } catch (err) {
        // ignore
      }
    }

    logger.error('QUEUE', `[Dead Letter Queue] Captured failed job ${job.id} on DLQ. Reason: ${reason}`);
  }

  /**
   * Replays a failed job from DLQ back to its target queue
   */
  public async retryDeadLetterJob(jobId: string): Promise<boolean> {
    const idx = this.deadLetterQueue.findIndex((item) => item.job.id === jobId);
    if (idx === -1) return false;

    const [removed] = this.deadLetterQueue.splice(idx, 1);
    const targetQueue = (removed.job.targetQueue || QueueName.JOB_SEARCH) as QueueName;

    logger.info('QUEUE', `Replaying DLQ job ${jobId} back to queue: ${targetQueue}`);
    await this.addJob(targetQueue, removed.job.type, removed.job.payload, {
      priority: 1,
      maxRetries: 3,
    });
    return true;
  }

  /**
   * Clears all captured items in Dead Letter Queue
   */
  public async clearDeadLetterQueue(): Promise<boolean> {
    this.deadLetterQueue = [];
    logger.info('QUEUE', 'Cleared all items in Dead Letter Queue');
    return true;
  }

  /**
   * Returns DLQ contents
   */
  public getDeadLetterQueue() {
    return this.deadLetterQueue;
  }

  /**
   * Dashboard & Monitoring Metrics
   */
  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const queueMetrics: QueueJobMetrics[] = [];
    let totalJobs = 0;
    let activeJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;

    for (const qName of Object.values(QueueName)) {
      const isPausedInMemory = this.pausedQueues.has(qName);
      const queue = this.queues.get(qName);

      if (this.isRedisConnected && queue) {
        try {
          const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
          const isPaused = (await queue.isPaused()) || isPausedInMemory;

          queueMetrics.push({
            queueName: qName,
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0,
            paused: isPaused,
          });

          totalJobs += (counts.waiting + counts.active + counts.completed + counts.failed);
          activeJobs += counts.active;
          completedJobs += counts.completed;
          failedJobs += counts.failed;
          continue;
        } catch (err) {
          // Fallback
        }
      }

      // Memory Queue Stats
      const list = this.fallbackMemoryQueue.get(qName) || [];
      const waiting = list.filter((i) => i.status === 'QUEUED').length;
      const active = list.filter((i) => i.status === 'ACTIVE').length;
      const completed = list.filter((i) => i.status === 'COMPLETED').length;
      const failed = list.filter((i) => i.status === 'FAILED').length;

      queueMetrics.push({
        queueName: qName,
        waiting,
        active,
        completed,
        failed,
        delayed: 0,
        paused: isPausedInMemory,
      });

      totalJobs += list.length;
      activeJobs += active;
      completedJobs += completed;
      failedJobs += failed;
    }

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      deadLetterCount: this.deadLetterQueue.length,
      queues: queueMetrics,
      redisStatus: this.isRedisConnected ? 'CONNECTED' : 'FALLBACK',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Graceful Shutdown: Safely closes workers and queues without dropping active jobs
   */
  public async shutdown(): Promise<void> {
    logger.info('QUEUE', 'Initiating Graceful Shutdown of Queue Engine...');

    for (const [name, worker] of this.workers.entries()) {
      try {
        await worker.close();
        logger.info('QUEUE', `Closed BullMQ worker for "${name}"`);
      } catch (err) {
        // ignore
      }
    }
    this.workers.clear();

    for (const [name, queue] of this.queues.entries()) {
      try {
        await queue.close();
        logger.info('QUEUE', `Closed BullMQ queue "${name}"`);
      } catch (err) {
        // ignore
      }
    }
    this.queues.clear();

    if (this.redisConnection) {
      try {
        await this.redisConnection.quit();
      } catch (err) {
        // ignore
      }
      this.redisConnection = null;
    }

    this.isRedisConnected = false;
    logger.info('QUEUE', 'Completed Graceful Shutdown of Queue Engine');
  }
}

/** Singleton Instance */
export const queueManager = new QueueManager();
