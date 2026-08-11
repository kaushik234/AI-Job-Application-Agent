import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CountryRepository extends BaseRepository<any> {
  protected readonly modelName = 'country';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findTargetCountries() {
    return this.prisma.country.findMany({
      where: { isTarget: true, deletedAt: null },
    });
  }
}
