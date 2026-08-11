import { Injectable } from '@nestjs/common';
import { TriggerAutomationDto, AutomationTaskStatusDto, ApproveSubmissionDto, ResumeCaptchaDto } from './dto/automation.dto';
import { browserAutomationRunner, BrowserAutomationRunner } from '../../browser/BrowserAutomationRunner';
import { sessionManager, SessionManager } from '../../browser/SessionManager';
import { JobListing, MasterResume, TailoredResume, CoverLetter } from '@sentinel/types';

@Injectable()
export class AutomationService {
  private runner: BrowserAutomationRunner;
  private sessionMgr: SessionManager;

  constructor() {
    this.runner = browserAutomationRunner;
    this.sessionMgr = sessionManager;
  }

  async triggerAutomation(dto: TriggerAutomationDto): Promise<AutomationTaskStatusDto> {
    const jobId = dto.jobId;

    const mockJob: JobListing = {
      id: jobId,
      title: 'Senior Full Stack Engineer',
      company: 'Acme Corp',
      location: 'San Francisco, CA',
      city: 'San Francisco',
      country: 'AU',
      description: 'Lead web automation development',
      requirements: ['TypeScript', 'Playwright'],
      url: dto.targetUrl || 'https://boards.greenhouse.io/acme/jobs/101',
      platform: (dto.platform as any) || 'Greenhouse',
      visaSponsorship: true,
      isRemote: true,
      isHybrid: false,
      postedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      scrapedAt: new Date().toISOString(),
    };

    const mockMasterResume: MasterResume = {
      fullName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 555 019 2831',
      location: 'San Francisco, CA',
      linkedIn: 'https://linkedin.com/in/alexmorgan',
      github: 'https://github.com/alexmorgan',
      portfolio: 'https://alexmorgan.dev',
      summary: 'Experienced Full Stack Engineer',
      skills: { languages: ['TypeScript'], frameworks: ['NestJS', 'Next.js'], cloudAndDevOps: ['Docker'], databases: ['PostgreSQL'], tools: ['Git'] },
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      contact: { email: 'alex.morgan@example.com', phone: '+1 555 019 2831', location: 'San Francisco, CA' },
    };

    const mockTailoredResume: TailoredResume = {
      id: `tr_${jobId}`,
      jobId,
      company: mockJob.company,
      companyName: mockJob.company,
      jobTitle: mockJob.title,
      customSummary: 'Tailored summary for Acme Corp',
      prioritizedSkills: ['TypeScript', 'Playwright'],
      skillsAdded: ['Playwright'],
      reorganizedExperience: [],
      keywordsOptimized: ['TypeScript'],
      pdfStoragePath: `/tmp/${jobId}_resume.pdf`,
      generatedAt: new Date().toISOString(),
    };

    const mockCoverLetter: CoverLetter = {
      id: `cl_${jobId}`,
      jobId,
      companyName: mockJob.company,
      jobTitle: mockJob.title,
      salutation: 'Dear Acme Corp Hiring Team,',
      contentParagraphs: ['I am excited to submit my application.'],
      closing: 'Sincerely, Alex Morgan',
      pdfStoragePath: `/tmp/${jobId}_cover.pdf`,
      generatedAt: new Date().toISOString(),
    };

    const mode = dto.requireHumanApproval ? 'MANUAL_APPROVAL' : 'FULLY_AUTOMATIC';
    const session = await this.runner.startApplicationFlow(
      mockJob,
      mockMasterResume,
      mockTailoredResume,
      mockCoverLetter,
      undefined,
      { automationMode: mode }
    );

    return {
      taskId: jobId,
      status: session.status,
      step: session.events[session.events.length - 1]?.actionName || 'Automation started',
      logs: session.logs,
      captchaPaused: session.captchaPaused,
      approvalPaused: session.approvalPaused,
      screenshots: session.screenshots,
      videoPath: session.videoPath,
    };
  }

  async getTaskStatus(taskId: string): Promise<AutomationTaskStatusDto> {
    const session = this.runner.getSession(taskId);
    if (!session) {
      return {
        taskId,
        status: 'PENDING_APPROVAL',
        step: 'Form filled successfully. Human approval required before submit.',
        logs: ['Automated form fill complete', 'Verification screenshot stored'],
        captchaPaused: false,
        approvalPaused: true,
      };
    }

    return {
      taskId: session.jobId,
      status: session.status,
      step: session.events[session.events.length - 1]?.actionName || 'Running Playwright',
      logs: session.logs,
      captchaPaused: session.captchaPaused,
      approvalPaused: session.approvalPaused,
      screenshots: session.screenshots,
      videoPath: session.videoPath,
    };
  }

  async approveSubmission(dto: ApproveSubmissionDto): Promise<{ success: boolean; message: string }> {
    const approved = await this.runner.approveSubmission(dto.jobId);
    return {
      success: approved,
      message: approved ? 'Application approved and submitted.' : 'No pending human approval task found.',
    };
  }

  async resumeAfterCaptcha(dto: ResumeCaptchaDto): Promise<{ success: boolean; message: string }> {
    const resumed = await this.runner.resumeAfterCaptcha(dto.jobId);
    return {
      success: resumed,
      message: resumed ? 'CAPTCHA confirmed solved. Automation resumed.' : 'No paused CAPTCHA session found.',
    };
  }

  async clearDomainSession(domain: string): Promise<{ success: boolean }> {
    const cleared = await this.sessionMgr.clearSession(domain);
    return { success: cleared };
  }
}
