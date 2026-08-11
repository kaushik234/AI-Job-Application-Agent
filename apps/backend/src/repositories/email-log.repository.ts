import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class EmailLogRepository extends BaseRepository<any> {
  protected readonly modelName = 'emailLog';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByUserId(userId: string) {
    return this.prisma.emailLog.findMany({
      where: { userId, deletedAt: null },
      orderBy: { receivedAt: 'desc' },
    });
  }
}
