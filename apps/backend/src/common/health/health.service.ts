import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private redisClient: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  async checkHealth() {
    let dbHealthy = false;
    try {
      dbHealthy = await this.prisma.isHealthy();
    } catch {
      dbHealthy = false;
    }

    let redisHealthy = false;
    try {
      const pong = await this.redisClient.ping();
      redisHealthy = pong === 'PONG';
    } catch {
      redisHealthy = false;
    }

    const overallHealthy = dbHealthy && redisHealthy;

    return {
      status: overallHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          type: 'PostgreSQL (Prisma ORM)',
        },
        redis: {
          status: redisHealthy ? 'up' : 'down',
          type: 'Redis (Cache & BullMQ)',
        },
        api: {
          status: 'up',
          uptime: process.uptime(),
        },
      },
    };
  }
}
