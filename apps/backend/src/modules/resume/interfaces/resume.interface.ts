export interface IMasterResume {
  id: string;
  userId: string;
  fullName: string;
  headline: string;
  summary: string;
  skills: string[];
}

export interface ITailoredResumeResult {
  id: string;
  jobId: string;
  atsScore: number;
  pdfUrl: string;
}
