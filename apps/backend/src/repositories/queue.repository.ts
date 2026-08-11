import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class QueueRepository extends BaseRepository<any> {
  protected readonly modelName = 'queue';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findPendingJobs(queueName = 'sentinel-background-tasks') {
    return this.prisma.queue.findMany({
      where: { queueName, status: 'QUEUED', deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }
}
