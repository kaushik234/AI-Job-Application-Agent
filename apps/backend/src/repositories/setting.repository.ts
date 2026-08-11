import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SettingRepository extends BaseRepository<any> {
  protected readonly modelName = 'setting';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByUserId(userId: string) {
    return this.prisma.setting.findFirst({
      where: { userId, deletedAt: null },
    });
  }
}
