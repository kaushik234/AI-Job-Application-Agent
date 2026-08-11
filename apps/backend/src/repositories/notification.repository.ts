import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationRepository extends BaseRepository<any> {
  protected readonly modelName = 'notification';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findUnreadByUserId(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
