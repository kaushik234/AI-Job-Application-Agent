import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ApplicationRepository extends BaseRepository<any> {
  protected readonly modelName = 'application';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByUserId(userId: string) {
    return this.prisma.application.findMany({
      where: { userId, deletedAt: null },
      include: { job: true, resume: true, coverLetter: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingApprovals() {
    return this.prisma.application.findMany({
      where: { status: 'AWAITING_HUMAN_APPROVAL', deletedAt: null },
      include: { job: true },
    });
  }
}
