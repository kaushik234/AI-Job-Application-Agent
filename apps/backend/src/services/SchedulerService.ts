/**
 * @file src/services/SchedulerService.ts
 * @description Scheduler Service executing automated morning job discovery, AI match scoring, resume tailoring, cover letter preparation, and approval queueing.
 * @architect Clean Architecture - Background Processing Layer
 */

import { JobRepository } from '../repositories/JobRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { ResumeRepository } from '../repositories/ResumeRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { JobScraperEngine } from '../jobs/JobScraperEngine';
import { GeminiAIService } from './GeminiAIService';
import { ResumePDFGenerator } from '../resume/ResumePDFGenerator';
import { CoverLetterPDFExporter } from '../coverLetter/CoverLetterPDFExporter';
import { BrowserAutomationRunner } from '../browser/BrowserAutomationRunner';
import { ApplicationStatus, ApplicationRecord } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class SchedulerService {
  private jobRepo: JobRepository;
  private appRepo: ApplicationRepository;
  private resumeRepo: ResumeRepository;
  private settingsRepo: SettingsRepository;
  private scraper: JobScraperEngine;
  private aiService: GeminiAIService;
  private browserRunner: BrowserAutomationRunner;

  constructor() {
    this.jobRepo = new JobRepository();
    this.appRepo = new ApplicationRepository();
    this.resumeRepo = new ResumeRepository();
    this.settingsRepo = new SettingsRepository();
    this.scraper = new JobScraperEngine();
    this.aiService = new GeminiAIService();
    this.browserRunner = new BrowserAutomationRunner();
  }

  /**
   * Main Morning Automated Pipeline Execution
   */
  public async executeMorningPipeline(): Promise<{
    jobsScrapedCount: number;
    matchedHighScoreCount: number;
    tailoredPreparedCount: number;
    applicationsCreated: ApplicationRecord[];
  }> {
    logger.info('SCHEDULER', 'Starting scheduled morning job application agent pipeline execution');

    const settings = await this.settingsRepo.getSettings();
    const masterResume = await this.resumeRepo.getMasterResume();

    // 1. SEARCH JOBS
    const scrapedJobs = await this.scraper.searchJobs({
      countries: settings.countryFilter,
      keywords: settings.targetKeywords,
      minSalary: settings.minimumSalary,
      remoteOnly: settings.remoteOnly,
      visaOnly: settings.visaRequired,
    });

    await this.jobRepo.saveMany(scrapedJobs);

    let matchedCount = 0;
    let preparedCount = 0;
    const createdApps: ApplicationRecord[] = [];

    // 2. AI EVALUATE & TAILOR
    for (const job of scrapedJobs) {
      // Check if already in application tracker
      const existingApp = await this.appRepo.findByJobId(job.id);
      if (existingApp && existingApp.status !== ApplicationStatus.DISCOVERED) {
        continue;
      }

      // Check daily application limit
      const stats = await this.appRepo.getDashboardStats();
      if (stats.applicationsToday >= settings.dailyApplicationLimit) {
        logger.warn('SCHEDULER', `Daily application limit (${settings.dailyApplicationLimit}) reached. Halting auto-queueing.`);
        break;
      }

      // AI Match Evaluation
      const matchResult = await this.aiService.evaluateJobMatch(masterResume, job);
      await this.jobRepo.saveMatchResult(matchResult);

      // Rule 2: Only continue if score > 80%
      if (matchResult.matchPercentage >= 80) {
        matchedCount++;
        logger.info('SCHEDULER', `Job ${job.company} - ${job.title} passed AI match filter (${matchResult.matchPercentage}% > 80%). Tailoring application files...`);

        // Tailor Resume
        const tailoredPayload = await this.aiService.tailorResume(masterResume, job);
        const { dataUrl: pdfDataUrl } = await ResumePDFGenerator.generatePDF(masterResume, {
          ...tailoredPayload,
          id: `res-${job.id}`,
          pdfStoragePath: `/storage/resumes/${job.id}.pdf`,
          generatedAt: new Date().toISOString(),
        });

        const savedTailoredResume = await this.resumeRepo.saveTailoredResume({
          ...tailoredPayload,
          id: `res-${job.id}`,
          pdfStoragePath: `/storage/resumes/${job.id}.pdf`,
          pdfDataUrl,
          generatedAt: new Date().toISOString(),
        });

        // Generate Cover Letter
        const coverLetterPayload = await this.aiService.generateCoverLetter(masterResume, job);
        const { dataUrl: coverLetterDataUrl } = await CoverLetterPDFExporter.generatePDF(masterResume, {
          ...coverLetterPayload,
          id: `cl-${job.id}`,
          pdfStoragePath: `/storage/coverLetters/${job.id}.pdf`,
          generatedAt: new Date().toISOString(),
        });

        const savedCoverLetter = await this.resumeRepo.saveCoverLetter({
          ...coverLetterPayload,
          id: `cl-${job.id}`,
          pdfStoragePath: `/storage/coverLetters/${job.id}.pdf`,
          pdfDataUrl: coverLetterDataUrl,
          generatedAt: new Date().toISOString(),
        });

        preparedCount++;

        // Application Status depending on automation mode
        const targetStatus = settings.automationMode === 'FULLY_AUTOMATIC' ? ApplicationStatus.APPLYING : ApplicationStatus.PENDING_APPROVAL;

        const appRecord: ApplicationRecord = {
          id: `app-${job.id}`,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          country: job.country,
          url: job.url,
          status: targetStatus,
          matchScore: matchResult.matchPercentage,
          tailoredResumeId: savedTailoredResume.id,
          coverLetterId: savedCoverLetter.id,
          lastUpdatedAt: new Date().toISOString(),
          notes: `Automated prep completed. Match: ${matchResult.matchPercentage}%. ${matchResult.reasons[0]}`,
        };

        await this.appRepo.upsert(appRecord);
        createdApps.push(appRecord);

        // If fully automatic, trigger browser submit
        if (settings.automationMode === 'FULLY_AUTOMATIC') {
          await this.browserRunner.startApplicationFlow(job, masterResume, savedTailoredResume, savedCoverLetter);
          await this.appRepo.updateStatus(appRecord.id, ApplicationStatus.APPLIED);
        }
      }
    }

    logger.success('SCHEDULER', 'Morning pipeline execution completed successfully', {
      scraped: scrapedJobs.length,
      matchedCount,
      preparedCount,
    });

    return {
      jobsScrapedCount: scrapedJobs.length,
      matchedHighScoreCount: matchedCount,
      tailoredPreparedCount: preparedCount,
      applicationsCreated: createdApps,
    };
  }
}

/** Singleton instance */
export const schedulerService = new SchedulerService();
