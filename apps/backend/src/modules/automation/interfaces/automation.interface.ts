export interface IAutomationTask {
  id: string;
  jobId: string;
  status: string;
  currentStep: string;
  screenshotUrl?: string;
}
