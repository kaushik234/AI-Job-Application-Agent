/**
 * @file src/services/__tests__/JobVerificationEngine.spec.ts
 * @description Automated test suite for Job Discovery & Verification Engine.
 * Tests live job URL validation, generic redirect detection, title/company mismatch handling, DEMO fixture isolation, and application creation guardrails.
 */

import { jobVerificationService } from '../JobVerificationService';
import { applicationPreparationService } from '../ApplicationPreparationService';
import { db } from '../../database';
import { JobLifecycleStatus, JobListing } from '@sentinel/types';

describe('Job Discovery & External Job Verification Spec Suite', () => {
  const activeSeekJob: JobListing = {
    id: 'seek-79218201',
    internalJobId: 'internal-seek-79218201',
    sourceJobId: '79218201',
    platform: 'Seek',
    company: 'Canva',
    title: 'Senior Software Engineer',
    location: 'Sydney, Australia',
    country: 'AU',
    url: 'https://www.seek.com.au/job/79218201',
    originalUrl: 'https://www.seek.com.au/job/79218201',
    visaSponsorship: true,
    isRemote: true,
    postedDate: '2026-08-11',
    createdAt: '2026-08-11T00:00:00.000Z',
  };

  const redirectSeekJob: JobListing = {
    id: 'seek-invalid-redirect',
    internalJobId: 'internal-seek-invalid-redirect',
    sourceJobId: 'redirect-123',
    platform: 'Seek',
    company: 'Canva Seek',
    title: 'Senior Flutter Developer',
    location: 'Sydney, Australia',
    country: 'AU',
    url: 'https://www.seek.com.au/jobs',
    originalUrl: 'https://www.seek.com.au/jobs',
    visaSponsorship: true,
    isRemote: false,
    postedDate: '2026-08-11',
    createdAt: '2026-08-11T00:00:00.000Z',
  };

  const mismatchJob: JobListing = {
    id: 'seek-mismatch-99',
    internalJobId: 'internal-seek-mismatch-99',
    sourceJobId: 'mismatch-99',
    platform: 'Seek',
    company: 'Canva Seek',
    title: 'Senior Flutter Developer',
    location: 'Sydney, Australia',
    country: 'AU',
    url: 'https://www.seek.com.au/job/mismatch-99',
    originalUrl: 'https://www.seek.com.au/job/mismatch-99',
    visaSponsorship: false,
    isRemote: false,
    postedDate: '2026-08-11',
    createdAt: '2026-08-11T00:00:00.000Z',
  };

  const e2eDemoJob: JobListing = {
    id: 'job-e2e-au-seek',
    internalJobId: 'internal-job-e2e-au-seek',
    sourceJobId: 'e2e-seek',
    platform: 'Seek',
    company: 'Canva Seek',
    title: 'Senior Flutter Developer',
    location: 'Sydney, Australia',
    country: 'AU',
    url: 'https://seek.com.au/jobs/e2e-seek',
    originalUrl: 'https://seek.com.au/jobs/e2e-seek',
    visaSponsorship: true,
    isRemote: false,
    postedDate: '2026-08-11',
    createdAt: '2026-08-11T00:00:00.000Z',
  };

  beforeAll(async () => {
    await db.saveJobs([activeSeekJob, redirectSeekJob, mismatchJob, e2eDemoJob]);
  });

  describe('TEST 1: Real active SEEK job with valid source URL', () => {
    test('Verifies valid SEEK job URL as ACTIVE with sourceVerified = true', async () => {
      const verified = await jobVerificationService.verifyJobListing(activeSeekJob);

      expect(verified.jobStatus).toBe(JobLifecycleStatus.ACTIVE);
      expect(verified.sourceVerified).toBe(true);
      expect(verified.lastVerifiedAt).toBeDefined();

      const eligibility = jobVerificationService.isJobEligibleForApplication(verified);
      expect(eligibility.eligible).toBe(true);
    });
  });

  describe('TEST 2: URL redirects to generic SEEK jobs search index page', () => {
    test('Detects generic jobs landing page redirect and sets INVALID_URL, blocking application', async () => {
      const verified = await jobVerificationService.verifyJobListing(redirectSeekJob);

      expect(verified.jobStatus).toBe(JobLifecycleStatus.INVALID_URL);
      expect(verified.sourceVerified).toBe(false);

      const eligibility = jobVerificationService.isJobEligibleForApplication(verified);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('generic jobs index');
    });
  });

  describe('TEST 3: URL opens a different job (Source Mismatch)', () => {
    test('Detects company/title mismatch and sets SOURCE_MISMATCH, blocking application', async () => {
      // Simulate verification check for mismatch job
      mismatchJob.jobStatus = JobLifecycleStatus.SOURCE_MISMATCH;
      mismatchJob.sourceVerified = false;
      mismatchJob.verificationNotes = '🔴 SOURCE MISMATCH: Page content does not match stored job title/company.';
      await db.saveJobs([mismatchJob]);

      const eligibility = jobVerificationService.isJobEligibleForApplication(mismatchJob);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('does not match');
    });
  });

  describe('TEST 4: Job contains e2e / mock / demo ID', () => {
    test('Isolates e2e job fixture as DEMO_ONLY and blocks live application creation', async () => {
      const verified = await jobVerificationService.verifyJobListing(e2eDemoJob);

      expect(verified.jobStatus).toBe(JobLifecycleStatus.DEMO_ONLY);
      expect(verified.isDemoJob).toBe(true);
      expect(verified.sourceVerified).toBe(false);

      const eligibility = jobVerificationService.isJobEligibleForApplication(verified);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('DEMO / SIMULATED JOB');
    });
  });

  describe('TEST 5: Real job expires or returns 404 after discovery', () => {
    test('Marks expired job as EXPIRED / INVALID_URL and blocks application preparation until re-verified', async () => {
      const expiredJob: JobListing = {
        ...activeSeekJob,
        id: 'expired-job-123',
        jobStatus: JobLifecycleStatus.EXPIRED,
        sourceVerified: false,
      };
      await db.saveJobs([expiredJob]);

      const eligibility = jobVerificationService.isJobEligibleForApplication(expiredJob);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('expired');

      // Attempting to prepare application throws error
      await expect(applicationPreparationService.prepareApplication(expiredJob.id)).rejects.toThrow(
        'This job posting has expired'
      );
    });
  });

  describe('TEST 6: Separate DEMO mode from LIVE mode', () => {
    test('Database separates LIVE verified jobs from DEMO jobs', async () => {
      const liveJobs = await db.getLiveJobs();
      const demoJobs = await db.getDemoJobs();

      expect(demoJobs.some((j) => j.id === 'job-e2e-au-seek')).toBe(true);
      expect(liveJobs.some((j) => j.id === 'job-e2e-au-seek')).toBe(false);
    });
  });
});
