/**
 * @file src/browser/__tests__/BrowserEngine.spec.ts
 * @description Unit tests for Phase 10 Playwright Browser Automation Engine.
 */

import { BrowserEngine } from '../BrowserEngine';
import { FormAutomator } from '../FormAutomator';
import { SessionManager } from '../SessionManager';
import { BrowserAutomationRunner } from '../BrowserAutomationRunner';
import { JobListing, MasterResume, TailoredResume, CoverLetter } from '@sentinel/types';
import path from 'path';
import fs from 'fs';

describe('Browser Automation Engine Phase 10 Suite', () => {
  let engine: BrowserEngine;
  let automator: FormAutomator;
  let sessionManager: SessionManager;
  let runner: BrowserAutomationRunner;
  let testDir: string;

  const sampleJob: JobListing = {
    id: 'job_greenhouse_101',
    title: 'Senior Staff Engineer',
    company: 'Atlassian',
    location: 'Sydney, AU',
    city: 'Sydney',
    country: 'AU',
    description: 'Lead backend architecture in Sydney',
    requirements: ['Node.js', 'TypeScript'],
    url: 'https://boards.greenhouse.io/atlassian/jobs/101',
    platform: 'Greenhouse',
    visaSponsorship: true,
    isRemote: false,
    isHybrid: true,
    postedDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
  };

  const sampleMasterResume: MasterResume = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+61 400 123 456',
    location: 'Sydney, Australia',
    linkedIn: 'https://linkedin.com/in/janedoe',
    github: 'https://github.com/janedoe',
    portfolio: 'https://janedoe.dev',
    summary: 'Experienced Staff Backend Engineer',
    skills: { languages: ['TypeScript', 'Go'], frameworks: ['Node.js'], cloudAndDevOps: ['AWS', 'Docker'], databases: ['PostgreSQL'], tools: ['Git'] },
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    contact: { email: 'jane.doe@example.com', phone: '+61 400 123 456', location: 'Sydney, Australia', linkedIn: 'https://linkedin.com/in/janedoe', github: 'https://github.com/janedoe' },
  };

  const sampleTailoredResume: TailoredResume = {
    id: 'tr_101',
    jobId: 'job_greenhouse_101',
    company: 'Atlassian',
    companyName: 'Atlassian',
    jobTitle: 'Senior Staff Engineer',
    customSummary: 'Tailored summary for Atlassian',
    prioritizedSkills: ['TypeScript', 'Node.js'],
    skillsAdded: ['TypeScript', 'Node.js'],
    reorganizedExperience: [],
    keywordsOptimized: ['TypeScript'],
    pdfStoragePath: '/tmp/atlassian_resume.pdf',
    generatedAt: new Date().toISOString(),
  };

  const sampleCoverLetter: CoverLetter = {
    id: 'cl_101',
    jobId: 'job_greenhouse_101',
    companyName: 'Atlassian',
    jobTitle: 'Senior Staff Engineer',
    salutation: 'Dear Atlassian Team,',
    contentParagraphs: ['I am excited to apply for the Senior Staff Engineer role at Atlassian.'],
    closing: 'Sincerely, Jane Doe',
    pdfStoragePath: '/tmp/atlassian_cover.pdf',
    generatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    testDir = path.join(process.cwd(), 'data', `test_browser_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    sessionManager = new SessionManager(path.join(testDir, 'sessions'));
    engine = new BrowserEngine(
      {
        headless: true,
        maxRetries: 2,
        retryBackoffMs: 50,
        screenshotDir: path.join(testDir, 'screenshots'),
        logsDir: path.join(testDir, 'logs'),
      },
      sessionManager
    );
    automator = new FormAutomator(engine);
    runner = new BrowserAutomationRunner(engine, automator, sessionManager);
  });

  afterEach(async () => {
    await engine.close();
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (err) {
        // cleanup
      }
    }
  });

  describe('1. Open Browser & Context Management', () => {
    it('should initialize headless browser context', async () => {
      const { browser, context } = await engine.getBrowserContext();
      expect(browser).toBeDefined();
      expect(context).toBeDefined();
    });

    it('should create a new page instance', async () => {
      const page = await engine.newPage('Atlassian');
      expect(page).toBeDefined();
    });
  });

  describe('2. Session Persistence & Cookie Storage', () => {
    it('should save and load domain session cookies', async () => {
      const cookies = [
        { name: 'session_token', value: 'secret123', domain: 'atlassian.com', path: '/' },
        { name: 'user_id', value: 'usr_99', domain: 'atlassian.com', path: '/' },
      ];

      await sessionManager.saveSession('atlassian.com', cookies);
      const loaded = await sessionManager.loadSession('atlassian.com');

      expect(loaded).not.toBeNull();
      expect(loaded?.cookies.length).toBe(2);
      expect(loaded?.cookies[0].name).toBe('session_token');
    });

    it('should clear stored session cookies', async () => {
      await sessionManager.saveSession('stripe.com', [{ name: 'auth', value: 'token', domain: 'stripe.com', path: '/' }]);
      const cleared = await sessionManager.clearSession('stripe.com');
      expect(cleared).toBe(true);

      const reloaded = await sessionManager.loadSession('stripe.com');
      expect(reloaded).toBeNull();
    });
  });

  describe('3. Login Capability', () => {
    it('should execute login form sequence', async () => {
      const page = await engine.newPage('atlassian.com');
      const result = await automator.login(page, 'https://atlassian.com/login', 'jane.doe@example.com', 'SecurePass123!');
      expect(result).toBe(true);
    });
  });

  describe('4. Navigation & Form Filling', () => {
    it('should navigate to target URL and fill personal details', async () => {
      const page = await engine.newPage('atlassian.com');
      await automator.navigate(page, sampleJob.url);

      const fillResult = await automator.fillFormFields(page, {
        fullName: sampleMasterResume.fullName,
        email: sampleMasterResume.email,
        phone: sampleMasterResume.phone,
        location: sampleMasterResume.location,
        linkedInUrl: sampleMasterResume.contact?.linkedIn,
      });

      expect(fillResult).toBe(true);
    });
  });

  describe('5. File Uploads (Resume & Cover Letter)', () => {
    it('should upload resume and cover letter documents', async () => {
      const page = await engine.newPage('atlassian.com');

      const resumeUploaded = await automator.uploadResume(page, sampleTailoredResume.pdfStoragePath);
      expect(resumeUploaded).toBe(true);

      const coverUploaded = await automator.uploadCoverLetter(page, sampleCoverLetter.pdfStoragePath);
      expect(coverUploaded).toBe(true);
    });

    it('should resume interrupted file uploads', async () => {
      const page = await engine.newPage('atlassian.com');
      const resumed = await automator.resumeUpload(page, sampleTailoredResume.pdfStoragePath, 'resume');
      expect(resumed).toBe(true);
    });
  });

  describe('6. Retry Logic on Failures', () => {
    it('should retry operation with backoff and succeed', async () => {
      let attempts = 0;
      const result = await engine.executeWithRetry('Transient Task', async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary Network Flake');
        }
        return 'SUCCESS_DATA';
      });

      expect(result).toBe('SUCCESS_DATA');
      expect(attempts).toBe(2);
    });

    it('should throw error after exceeding maximum retries', async () => {
      await expect(
        engine.executeWithRetry('Failing Task', async () => {
          throw new Error('Persistent Outage');
        }, 2, 10)
      ).rejects.toThrow('Persistent Outage');
    });
  });

  describe('7. CAPTCHA Handling (Strict Policy: No Bypass)', () => {
    it('should detect CAPTCHA challenge and pause application flow', async () => {
      const jobBankJob: JobListing = {
        ...sampleJob,
        id: 'job_bank_202',
        company: 'Government of Canada',
        platform: 'Job Bank Canada',
      };

      const session = await runner.startApplicationFlow(
        jobBankJob,
        sampleMasterResume,
        sampleTailoredResume,
        sampleCoverLetter
      );

      expect(session.status).toBe('CAPTCHA Paused');
      expect(session.captchaPaused).toBe(true);

      const pausedEvent = session.events.find((e) => e.status === 'CAPTCHA_PAUSED');
      expect(pausedEvent).toBeDefined();
      expect(pausedEvent?.captchaDetected).toBe(true);
    });

    it('should resume execution after user solves/confirms CAPTCHA', async () => {
      const jobBankJob: JobListing = {
        ...sampleJob,
        id: 'job_bank_203',
        company: 'Government of Canada',
        platform: 'Job Bank Canada',
      };

      await runner.startApplicationFlow(jobBankJob, sampleMasterResume, sampleTailoredResume, sampleCoverLetter);

      const resumed = await runner.resumeAfterCaptcha(jobBankJob.id);
      expect(resumed).toBe(true);

      const updatedSession = runner.getSession(jobBankJob.id);
      expect(updatedSession?.status).toBe('Applied');
      expect(updatedSession?.captchaPaused).toBe(false);
    });
  });

  describe('8. Human Approval Mode', () => {
    it('should pause before submission when Human Approval mode is enabled', async () => {
      const session = await runner.startApplicationFlow(
        sampleJob,
        sampleMasterResume,
        sampleTailoredResume,
        sampleCoverLetter,
        undefined,
        { automationMode: 'MANUAL_APPROVAL' }
      );

      expect(session.status).toBe('Pending Approval');
      expect(session.approvalPaused).toBe(true);

      const approvalEvent = session.events.find((e) => e.status === 'APPROVAL_PAUSED');
      expect(approvalEvent).toBeDefined();
    });

    it('should complete submission when candidate approves application', async () => {
      await runner.startApplicationFlow(
        sampleJob,
        sampleMasterResume,
        sampleTailoredResume,
        sampleCoverLetter,
        undefined,
        { automationMode: 'MANUAL_APPROVAL' }
      );

      const approved = await runner.approveSubmission(sampleJob.id);
      expect(approved).toBe(true);

      const session = runner.getSession(sampleJob.id);
      expect(session?.status).toBe('Applied');
      expect(session?.approvalPaused).toBe(false);
    });
  });

  describe('9. Screenshots & Log Persist', () => {
    it('should capture screenshot and save logs', async () => {
      const page = await engine.newPage('atlassian.com');
      const screenshot = await engine.captureScreenshot(page, 'test_capture');

      expect(screenshot.filePath).toBeDefined();
      expect(screenshot.base64).toMatch(/^data:image\/png;base64,/);

      const logPath = await engine.saveLogs('job_101', ['[Log 1] Launched browser', '[Log 2] Completed form']);
      expect(fs.existsSync(logPath)).toBe(true);
    });
  });
});
