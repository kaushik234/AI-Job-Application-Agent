export class QueueJobEntity {
  id!: string;
  queueName!: string;
  type!: string;
  payload!: Record<string, any>;
  status!: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt!: Date;
}
