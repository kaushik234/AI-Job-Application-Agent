import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ResumeVersionRepository extends BaseRepository<any> {
  protected readonly modelName = 'resumeVersion';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByResumeId(resumeId: string) {
    return this.prisma.resumeVersion.findMany({
      where: { resumeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
