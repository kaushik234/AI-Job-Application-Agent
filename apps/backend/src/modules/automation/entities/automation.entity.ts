export class AutomationTaskEntity {
  id!: string;
  jobId!: string;
  platform!: string;
  status!: 'PENDING' | 'FILLING_FORM' | 'AWAITING_HUMAN_APPROVAL' | 'SUBMITTED' | 'FAILED';
  currentStep!: string;
  logs!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
