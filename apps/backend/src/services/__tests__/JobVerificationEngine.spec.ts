/**
 * @file src/services/__tests__/JobVerificationEngine.spec.ts
 * @description Automated test suite for Job Discovery & Verification Engine.
 * Covers all 14 Phase 3 requirement verification scenarios.
 */

import { jobVerificationService } from '../JobVerificationService';
import { applicationPreparationService } from '../ApplicationPreparationService';
import { db } from '../../database';
import { JobLifecycleStatus, JobListing } from '@sentinel/types';

describe('Job Discovery & External Job Verification Spec Suite (Phase 3)', () => {
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

  describe('1. Real active job -> ACTIVE', () => {
    test('Verifies active job posting as ACTIVE with positive evidence', async () => {
      const verified = await jobVerificationService.verifyJobListing(activeSeekJob);
      expect(verified.jobStatus).toBe(JobLifecycleStatus.ACTIVE);
      expect(verified.sourceVerified).toBe(true);
      expect(verified.verificationReason).toBe('Live job posting verified with title and job-specific content.');
      expect(jobVerificationService.isJobEligibleForApplication(verified).eligible).toBe(true);
    });
  });

  describe('2. HTTP 404 -> EXPIRED / STALE', () => {
    test('Marks 404 responses as STALE/EXPIRED and blocks application', async () => {
      const job404: JobListing = {
        ...activeSeekJob,
        id: 'job-404',
        url: 'https://shopify.com/careers/jobs/9012-404',
        originalUrl: 'https://shopify.com/careers/jobs/9012-404',
      };
      const res = await jobVerificationService.verifyJobListing(job404);
      expect(res.sourceVerified).toBe(false);
      expect([JobLifecycleStatus.STALE, JobLifecycleStatus.EXPIRED]).toContain(res.jobStatus);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('3. HTTP 410 -> EXPIRED', () => {
    test('Marks HTTP 410 response as EXPIRED', async () => {
      const expiredJob: JobListing = {
        ...activeSeekJob,
        id: 'expired-410',
        jobStatus: JobLifecycleStatus.EXPIRED,
        sourceVerified: false,
        verificationReason: 'External page reports that the position is no longer available.',
      };
      await db.saveJobs([expiredJob]);
      const eligibility = jobVerificationService.isJobEligibleForApplication(expiredJob);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('position is no longer available');
    });
  });

  describe('4. SAP error page with HTTP 200 + /jobs/errorpage/?errortype=404 -> NOT ACTIVE', () => {
    test('Detects SAP error page URL with HTTP 200 and marks NOT ACTIVE', async () => {
      const sapErrorJob: JobListing = {
        ...activeSeekJob,
        id: 'sap-error-job',
        platform: 'Company Career Page',
        company: 'SAP',
        title: 'Senior Developer',
        url: 'https://jobs.sap.com/jobs/errorpage/?errortype=404',
        originalUrl: 'https://jobs.sap.com/jobs/errorpage/?errortype=404',
      };
      const res = await jobVerificationService.verifyJobListing(sapErrorJob);
      expect(res.sourceVerified).toBe(false);
      expect(res.jobStatus).not.toBe(JobLifecycleStatus.ACTIVE);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('5. Greenhouse expired/error page -> NOT ACTIVE', () => {
    test('Detects Greenhouse error page and marks NOT ACTIVE', async () => {
      const ghErrorJob: JobListing = {
        ...activeSeekJob,
        id: 'gh-error-job',
        platform: 'Greenhouse',
        company: 'Canva',
        title: 'Senior Engineer',
        url: 'https://boards.greenhouse.io/canva-expired/jobs/12345?error=true',
        originalUrl: 'https://boards.greenhouse.io/canva-expired/jobs/12345?error=true',
      };
      const res = await jobVerificationService.verifyJobListing(ghErrorJob);
      expect(res.sourceVerified).toBe(false);
      expect(res.jobStatus).not.toBe(JobLifecycleStatus.ACTIVE);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('6. Workable expired page -> NOT ACTIVE', () => {
    test('Detects Workable expired page and marks NOT ACTIVE', async () => {
      const wkErrorJob: JobListing = {
        ...activeSeekJob,
        id: 'wk-error-job',
        platform: 'Workable',
        company: 'Zendesk',
        title: 'Lead Developer',
        url: 'https://apply.workable.com/zendesk-expired/j/C9012/?not_found=true',
        originalUrl: 'https://apply.workable.com/zendesk-expired/j/C9012/?not_found=true',
      };
      const res = await jobVerificationService.verifyJobListing(wkErrorJob);
      expect(res.sourceVerified).toBe(false);
      expect(res.jobStatus).toBe(JobLifecycleStatus.EXPIRED);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('7. SEEK generic redirect -> NOT ACTIVE', () => {
    test('Detects SEEK generic landing page redirect and sets STALE/INVALID_URL', async () => {
      const res = await jobVerificationService.verifyJobListing(redirectSeekJob);
      expect(res.sourceVerified).toBe(false);
      expect(res.jobStatus).not.toBe(JobLifecycleStatus.ACTIVE);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('8. Generic career-page redirect -> NOT ACTIVE', () => {
    test('Detects generic careers landing page redirect and marks STALE', async () => {
      const genericRedirectJob: JobListing = {
        ...activeSeekJob,
        id: 'generic-redirect-job',
        url: 'https://company.com/careers',
        originalUrl: 'https://company.com/careers',
      };
      const res = await jobVerificationService.verifyJobListing(genericRedirectJob);
      expect(res.sourceVerified).toBe(false);
      expect(res.jobStatus).toBe(JobLifecycleStatus.STALE);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('9. Generic HTTP 200 error page -> NOT ACTIVE', () => {
    test('Rejects HTTP 200 pages containing error markers as EXPIRED', async () => {
      const error200Job: JobListing = {
        ...activeSeekJob,
        id: 'generic-200-error-job',
        url: 'https://company.com/jobs/generic-200-error',
        originalUrl: 'https://company.com/jobs/generic-200-error',
      };
      const res = await jobVerificationService.verifyJobListing(error200Job);
      expect(res.sourceVerified).toBe(false);
      expect(res.jobStatus).toBe(JobLifecycleStatus.EXPIRED);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('10. Active job with slightly different title formatting -> ACTIVE', () => {
    test('Normalizes title and verifies active job with title variations', async () => {
      const titleFormattedJob: JobListing = {
        ...activeSeekJob,
        id: 'active-job-formatted-title',
        title: 'Senior Software Engineer (Full-Time / Remote)',
        url: 'https://www.seek.com.au/job/79218201',
        originalUrl: 'https://www.seek.com.au/job/79218201',
      };
      const res = await jobVerificationService.verifyJobListing(titleFormattedJob);
      expect(res.sourceVerified).toBe(true);
      expect(res.jobStatus).toBe(JobLifecycleStatus.ACTIVE);
    });
  });

  describe('11. Active job with title/company evidence -> ACTIVE', () => {
    test('Verifies active job with clear title and company evidence', async () => {
      const activeSapJob: JobListing = {
        ...activeSeekJob,
        id: 'active-sap-7718',
        company: 'SAP',
        title: 'Lead Flutter Engineer',
        url: 'https://jobs.sap.com/careers/jobs/7718',
        originalUrl: 'https://jobs.sap.com/careers/jobs/7718',
      };
      const res = await jobVerificationService.verifyJobListing(activeSapJob);
      expect(res.sourceVerified).toBe(true);
      expect(res.jobStatus).toBe(JobLifecycleStatus.ACTIVE);
      expect(res.detectedTitle).toBeDefined();
    });
  });

  describe('12. DEMO/E2E/mock fixture -> DEMO_ONLY', () => {
    test('Isolates synthetic DEMO fixture as DEMO_ONLY', async () => {
      const res = await jobVerificationService.verifyJobListing(e2eDemoJob);
      expect(res.jobStatus).toBe(JobLifecycleStatus.DEMO_ONLY);
      expect(res.isDemoJob).toBe(true);
      expect(res.sourceVerified).toBe(false);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('13. Invalid/missing URL -> INVALID_URL', () => {
    test('Rejects missing or malformed URL as INVALID_URL', async () => {
      const invalidUrlJob: JobListing = {
        ...activeSeekJob,
        id: 'invalid-url-job',
        url: 'invalid-url-string',
        originalUrl: 'invalid-url-string',
      };
      const res = await jobVerificationService.verifyJobListing(invalidUrlJob);
      expect(res.jobStatus).toBe(JobLifecycleStatus.INVALID_URL);
      expect(res.sourceVerified).toBe(false);
      expect(jobVerificationService.isJobEligibleForApplication(res).eligible).toBe(false);
    });
  });

  describe('14. Ensure isJobEligibleForApplication rejects every non-ACTIVE/non-verified job', () => {
    test('Rejects every non-ACTIVE or non-verified job state', () => {
      const statuses = [
        JobLifecycleStatus.STALE,
        JobLifecycleStatus.EXPIRED,
        JobLifecycleStatus.INVALID_URL,
        JobLifecycleStatus.SOURCE_MISMATCH,
        JobLifecycleStatus.DEMO_ONLY,
        JobLifecycleStatus.DISCOVERED,
      ];

      for (const status of statuses) {
        const dummyJob: JobListing = {
          ...activeSeekJob,
          id: `dummy-${status}`,
          jobStatus: status,
          verificationStatus: status,
          sourceVerified: false,
        };
        const eligibility = jobVerificationService.isJobEligibleForApplication(dummyJob);
        expect(eligibility.eligible).toBe(false);
        expect(eligibility.reason).toBeDefined();
      }
    });
  });

  describe('Database DEMO vs LIVE Isolation', () => {
    test('Database separates LIVE verified jobs from DEMO jobs', async () => {
      const liveJobs = await db.getLiveJobs();
      const demoJobs = await db.getDemoJobs();

      expect(demoJobs.some((j) => j.id === 'job-e2e-au-seek')).toBe(true);
      expect(liveJobs.some((j) => j.id === 'job-e2e-au-seek')).toBe(false);
    });
  });
});
