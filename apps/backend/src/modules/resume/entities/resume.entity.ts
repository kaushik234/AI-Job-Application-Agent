export class ResumeEntity {
  id!: string;
  userId!: string;
  fullName!: string;
  headline!: string;
  summary!: string;
  skills!: string[];
  pdfPath?: string;
  updatedAt!: Date;
}
