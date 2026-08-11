import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CompanyRepository extends BaseRepository<any> {
  protected readonly modelName = 'company';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByName(name: string) {
    return this.prisma.company.findFirst({
      where: { name, deletedAt: null },
    });
  }
}
