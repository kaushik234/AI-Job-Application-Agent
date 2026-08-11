export class CoverLetterEntity {
  id!: string;
  jobId!: string;
  companyName!: string;
  jobTitle!: string;
  content!: string;
  pdfPath?: string;
  createdAt!: Date;
}
