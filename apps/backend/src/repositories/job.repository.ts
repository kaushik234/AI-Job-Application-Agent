import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class JobRepository extends BaseRepository<any> {
  protected readonly modelName = 'job';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByCountry(countryCode: string) {
    return this.prisma.job.findMany({
      where: {
        country: { code: countryCode },
        deletedAt: null,
      },
      include: { company: true, country: true },
    });
  }
}
