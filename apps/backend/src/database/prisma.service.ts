import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  constructor() {
    super({
      log: [],
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sentinel_db?schema=public&connection_limit=20',
        },
      },
    });
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to PostgreSQL database via Prisma ORM.');
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        `PostgreSQL Connection Warning: Database offline or connection string unreachable. App running in resilient mode. (${
          error instanceof Error ? error.message : String(error)
        })`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      try {
        await this.$disconnect();
        this.logger.log('Disconnected from PostgreSQL database.');
      } catch {
        // Safe disconnect fallback
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  async executeInTransaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    if (!this.isConnected) {
      return fn(this as any);
    }
    try {
      return await this.$transaction(fn);
    } catch (err) {
      this.logger.warn(`Prisma transaction failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}

