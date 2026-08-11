import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CoverLetterRepository extends BaseRepository<any> {
  protected readonly modelName = 'coverLetter';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByJobId(jobId: string) {
    return this.prisma.coverLetter.findFirst({
      where: { jobId, deletedAt: null },
    });
  }
}
