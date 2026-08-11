export class RecruiterEmailEntity {
  id!: string;
  fromAddress!: string;
  subject!: string;
  snippet!: string;
  category!: 'INTERVIEW_INVITE' | 'CODING_TEST' | 'REJECTED' | 'GENERAL_INQUIRY';
  receivedAt!: Date;
}
