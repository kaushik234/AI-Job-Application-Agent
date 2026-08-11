import { PrismaService } from '../database/prisma.service';

export abstract class BaseRepository<T, CreateDto = any, UpdateDto = any> {
  protected abstract readonly modelName: string;

  constructor(protected readonly prisma: PrismaService) {}

  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  async findById(id: string, includeSoftDeleted = false): Promise<T | null> {
    if (!this.prisma.getIsConnected()) return null;
    try {
      const where: any = { id };
      if (!includeSoftDeleted) {
        where.deletedAt = null;
      }
      return await this.model.findFirst({ where });
    } catch {
      return null;
    }
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    includeSoftDeleted?: boolean;
    include?: any;
    select?: any;
  }): Promise<T[]> {
    if (!this.prisma.getIsConnected()) return [];
    try {
      const where = { ...(options?.where || {}) };
      if (!options?.includeSoftDeleted) {
        where.deletedAt = null;
      }

      return await this.model.findMany({
        skip: options?.skip,
        take: options?.take,
        where,
        orderBy: options?.orderBy,
        include: options?.include,
        select: options?.select,
      });
    } catch {
      return [];
    }
  }

  async create(data: CreateDto): Promise<T | null> {
    if (!this.prisma.getIsConnected()) return null as any;
    try {
      return await this.model.create({ data });
    } catch {
      return null as any;
    }
  }

  async update(id: string, data: UpdateDto): Promise<T | null> {
    if (!this.prisma.getIsConnected()) return null as any;
    try {
      return await this.model.update({
        where: { id },
        data,
      });
    } catch {
      return null as any;
    }
  }

  async softDelete(id: string): Promise<T | null> {
    if (!this.prisma.getIsConnected()) return null as any;
    try {
      return await this.model.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch {
      return null as any;
    }
  }

  async restore(id: string): Promise<T | null> {
    if (!this.prisma.getIsConnected()) return null as any;
    try {
      return await this.model.update({
        where: { id },
        data: { deletedAt: null },
      });
    } catch {
      return null as any;
    }
  }

  async hardDelete(id: string): Promise<T | null> {
    if (!this.prisma.getIsConnected()) return null as any;
    try {
      return await this.model.delete({
        where: { id },
      });
    } catch {
      return null as any;
    }
  }

  async count(where: any = {}, includeSoftDeleted = false): Promise<number> {
    if (!this.prisma.getIsConnected()) return 0;
    try {
      const queryWhere = { ...where };
      if (!includeSoftDeleted) {
        queryWhere.deletedAt = null;
      }
      return await this.model.count({ where: queryWhere });
    } catch {
      return 0;
    }
  }

  async executeInTransaction<R>(
    fn: (prisma: any) => Promise<R>,
  ): Promise<R> {
    return this.prisma.executeInTransaction(fn);
  }
}

