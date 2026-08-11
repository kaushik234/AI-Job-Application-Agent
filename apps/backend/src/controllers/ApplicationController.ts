/**
 * @file src/controllers/ApplicationController.ts
 * @description Controller managing application tracking state, browser automation execution, CAPTCHA confirmation, and dashboard metrics.
 * @architect Clean Architecture - Controller Layer
 */

import { Request, Response } from 'express';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { JobRepository } from '../repositories/JobRepository';
import { ResumeRepository } from '../repositories/ResumeRepository';
import { BrowserAutomationRunner } from '../browser/BrowserAutomationRunner';
import { ApplicationStatus } from '@sentinel/types';

export class ApplicationController {
  private appRepo: ApplicationRepository;
  private jobRepo: JobRepository;
  private resumeRepo: ResumeRepository;
  private browserRunner: BrowserAutomationRunner;

  constructor() {
    this.appRepo = new ApplicationRepository();
    this.jobRepo = new JobRepository();
    this.resumeRepo = new ResumeRepository();
    this.browserRunner = new BrowserAutomationRunner();
  }

  /** GET /api/applications - Get all tracked applications */
  public getApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const applications = await this.appRepo.findAll();
      res.json({ success: true, count: applications.length, data: applications });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** GET /api/applications/stats - Get dashboard overview statistics */
  public getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.appRepo.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/applications/apply - Trigger browser automation run for job */
  public triggerApply = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const job = await this.jobRepo.findById(jobId);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job not found' });
        return;
      }

      const master = await this.resumeRepo.getMasterResume();
      let tailoredResume = await this.resumeRepo.findTailoredResumeByJobId(jobId);
      let coverLetter = await this.resumeRepo.findCoverLetterByJobId(jobId);

      if (!tailoredResume || !coverLetter) {
        res.status(400).json({ success: false, error: 'Please tailor resume and cover letter first before launching automation.' });
        return;
      }

      // Update status to APPLYING
      let app = await this.appRepo.findByJobId(jobId);
      if (!app) {
        app = {
          id: `app-${job.id}`,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          country: job.country,
          url: job.url,
          status: ApplicationStatus.APPLYING,
          matchScore: 90,
          tailoredResumeId: tailoredResume.id,
          coverLetterId: coverLetter.id,
          lastUpdatedAt: new Date().toISOString(),
        };
        await this.appRepo.upsert(app);
      } else {
        await this.appRepo.updateStatus(app.id, ApplicationStatus.APPLYING);
      }

      // Execute browser flow in background / step promise
      const session = await this.browserRunner.startApplicationFlow(job, master, tailoredResume, coverLetter);

      // Update database status according to outcome
      await this.appRepo.updateStatus(app.id, session.status);

      res.json({
        success: true,
        sessionStatus: session.status,
        events: session.events,
        captchaPaused: session.captchaPaused,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/applications/prepare - Prepare draft application & evaluate readiness */
  public prepareApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const { applicationPreparationService } = require('../services/ApplicationPreparationService');
      const result = await applicationPreparationService.prepareApplication(jobId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /** GET /api/applications/:id/readiness - Get readiness verification checklist */
  public getReadiness = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { applicationPreparationService } = require('../services/ApplicationPreparationService');
      const readiness = await applicationPreparationService.getReadiness(id);
      res.json({ success: true, data: readiness });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /** POST /api/applications/:id/verify-external - Verify external platform submission evidence */
  public verifyExternal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const confirmationData = req.body;
      const { applicationPreparationService } = require('../services/ApplicationPreparationService');
      const result = await applicationPreparationService.verifyExternalSubmission(id, confirmationData);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /** GET /api/applications/:id/evidence-audit - Get Cover Letter evidence verification audit */
  public getEvidenceAudit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { applicationPreparationService } = require('../services/ApplicationPreparationService');
      const evidence = await applicationPreparationService.getCoverLetterEvidence(id);
      res.json({ success: true, data: evidence });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /** POST /api/browser/:applicationId/analyze - Analyze form fields for safe autofill */
  public analyzeAutofill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.params;
      const { applicationPreparationService } = require('../services/ApplicationPreparationService');
      const analysis = await applicationPreparationService.analyzeAutofillFields(applicationId);
      res.json({ success: true, data: analysis });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /** POST /api/browser/:applicationId/autofill - Trigger safe autofill mapping (NO auto submit) */
  public autofill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.params;
      const { applicationPreparationService } = require('../services/ApplicationPreparationService');
      const result = await applicationPreparationService.performSafeAutofill(applicationId);
      res.json({
        success: true,
        message: 'Safe autofill fields mapped successfully. User review required before submission.',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /** POST /api/applications/resume-captcha - User confirms CAPTCHA resolved */
  public confirmCaptchaResolved = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const app = await this.appRepo.findByJobId(jobId);

      const resumed = await this.browserRunner.resumeAfterCaptcha(jobId);
      if (app && resumed) {
        await this.appRepo.updateStatus(app.id, ApplicationStatus.APPLIED);
      }

      res.json({ success: resumed, status: ApplicationStatus.APPLIED });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** PUT /api/applications/:id/status - Manual status override */
  public updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const { status, notes } = req.body;
      const updated = await this.appRepo.updateStatus(id, status, notes);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
