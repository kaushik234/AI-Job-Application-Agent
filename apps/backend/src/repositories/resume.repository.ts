import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ResumeRepository extends BaseRepository<any> {
  protected readonly modelName = 'resume';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findMasterByUserId(userId: string) {
    return this.prisma.resume.findFirst({
      where: { userId, isMaster: true, deletedAt: null },
    });
  }
}
