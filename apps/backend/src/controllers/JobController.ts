/**
 * @file src/controllers/JobController.ts
 * @description Controller handling job search, scraping execution, and job listing queries.
 * @architect Clean Architecture - Controller Layer
 */

import { Request, Response } from 'express';
import { JobRepository } from '../repositories/JobRepository';
import { JobScraperEngine } from '../jobs/JobScraperEngine';
import { jobRankingService } from '../services/JobRankingService';
import { db } from '../database';
import { CountryCode } from '@sentinel/types';

export class JobController {
  private jobRepo: JobRepository;
  private scraper: JobScraperEngine;

  constructor() {
    this.jobRepo = new JobRepository();
    this.scraper = new JobScraperEngine();
  }

  /**
   * GET /api/jobs - Search and retrieve jobs
   */
  public getJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const countries = req.query.countries ? (String(req.query.countries).split(',') as CountryCode[]) : undefined;
      const minSalary = req.query.minSalary ? Number(req.query.minSalary) : undefined;
      const remoteOnly = req.query.remoteOnly === 'true';
      const visaOnly = req.query.visaOnly === 'true';
      const searchQuery = req.query.q ? String(req.query.q) : undefined;

      const jobs = await this.jobRepo.findJobs({
        countries,
        minSalary,
        remoteOnly,
        visaOnly,
        searchQuery,
      });

      const resume = await db.getMasterResume();
      const rankedJobs = jobRankingService.rankJobs(jobs, resume);

      const normalizedJobs = rankedJobs.map((j) => ({
        ...j,
        requirements: Array.isArray(j.requirements) ? j.requirements : [],
      }));

      res.json({ success: true, count: normalizedJobs.length, data: normalizedJobs });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /**
   * POST /api/jobs/scrape - Trigger fresh multi-board job scrape across 9 providers
   */
  public triggerScrape = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, keywords, countries, minSalary, remoteOnly, visaOnly, page, limit } = req.body || {};

      const report = await this.scraper.executeParallelCrawl(
        {
          q: q || undefined,
          keywords: keywords || undefined,
          countries: countries || ['AU', 'CA', 'DE'],
          minSalary: minSalary || undefined,
          remoteOnly: !!remoteOnly,
          visaOnly: !!visaOnly,
        },
        { page: page || 1, limit: limit || 20 }
      );

      res.json({
        success: true,
        report,
        jobs: report.jobs,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /**
   * POST /api/jobs/:id/verify - Perform live external URL verification check for job
   */
  public verifyJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const job = await this.jobRepo.findById(id);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job listing not found' });
        return;
      }

      const { jobVerificationService } = require('../services/JobVerificationService');
      const verifiedJob = await jobVerificationService.verifyJobListing(job);
      const eligibility = jobVerificationService.isJobEligibleForApplication(verifiedJob);

      res.json({
        success: true,
        data: verifiedJob,
        eligibility,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/jobs/:id/debug-source - Get complete Job Source Debug details
   */
  public getDebugSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const job = await this.jobRepo.findById(id);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job listing not found' });
        return;
      }

      const debugInfo = {
        sourcePlatform: job.platform || job.source || 'General',
        internalJobId: job.internalJobId || `internal-${job.id}`,
        sourceJobId: job.sourceJobId || job.id,
        originalUrl: job.originalUrl || job.url,
        lastVerifiedAt: job.lastVerifiedAt || 'Not verified',
        jobStatus: job.jobStatus || 'DISCOVERED',
        sourceVerified: job.sourceVerified ?? false,
        verificationNotes: job.verificationNotes || 'Pending verification',
        externalTitle: job.title,
        externalCompany: job.company,
        externalLocation: job.location,
        verification: job.sourceVerified ? 'PASS' : 'FAIL',
      };

      res.json({ success: true, data: debugInfo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/jobs/:id/verify-original - Controlled revalidation check before opening external job link
   */
  public verifyOriginalPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const job = await this.jobRepo.findById(id);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job listing not found' });
        return;
      }

      const { jobVerificationService } = require('../services/JobVerificationService');
      const isFresh = jobVerificationService.isVerificationFresh(job, 6);

      let verifiedJob = job;
      if (!isFresh || !job.sourceVerified || job.jobStatus !== 'ACTIVE') {
        verifiedJob = await jobVerificationService.verifyOrRevalidateJob(job, true);
      }

      const minutesAgo = verifiedJob.lastVerifiedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(verifiedJob.lastVerifiedAt).getTime()) / 60000))
        : 0;

      const isLive = verifiedJob.sourceVerified === true && (verifiedJob.jobStatus === 'ACTIVE' || verifiedJob.verificationStatus === 'ACTIVE');

      res.json({
        success: true,
        canOpen: isLive,
        finalUrl: verifiedJob.finalUrl || verifiedJob.originalUrl || verifiedJob.url,
        jobStatus: verifiedJob.jobStatus,
        sourceVerified: verifiedJob.sourceVerified,
        reason: verifiedJob.verificationReason || (isLive ? 'Job posting is active' : 'This job is no longer available.'),
        lastVerifiedAt: verifiedJob.lastVerifiedAt,
        minutesAgo,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/jobs/reverify-all - Re-verify all jobs in database
   */
  public reverifyAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobVerificationService } = require('../services/JobVerificationService');
      const summary = await jobVerificationService.reverifyAllJobs();
      res.json({ success: true, summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
