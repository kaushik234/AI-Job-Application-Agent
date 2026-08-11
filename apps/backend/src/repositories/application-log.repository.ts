import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ApplicationLogRepository extends BaseRepository<any> {
  protected readonly modelName = 'applicationLog';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByApplicationId(applicationId: string) {
    return this.prisma.applicationLog.findMany({
      where: { applicationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }
}
