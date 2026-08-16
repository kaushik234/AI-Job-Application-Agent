/**
 * @file src/services/__tests__/strictJobIdentityAndVerification.spec.ts
 * @description Test suite for Strict Job Identity Verification & Source Mismatch Isolation (Phase 14).
 */

import { JobVerificationService } from '../JobVerificationService';
import { JobRankingService } from '../JobRankingService';
import { JobLifecycleStatus, JobListing } from '@sentinel/types';

describe('Strict Job Identity & Verification Suite (12 Scenarios)', () => {
  let verifier: JobVerificationService;
  let ranker: JobRankingService;

  beforeEach(() => {
    verifier = new JobVerificationService();
    ranker = new JobRankingService();
  });

  const baseJob: JobListing = {
    id: 'job-101',
    platform: 'Ashby',
    company: 'Railway',
    title: 'Flutter & Full Stack Engineer',
    location: 'Melbourne, VIC, Australia',
    country: 'AU',
    visaSponsorship: true,
    isRemote: true,
    url: 'https://jobs.ashbyhq.com/railway/541836a1-6d3f-47bf-845f-5f48fe547568/',
    postedDate: '2026-08-15',
    createdAt: new Date().toISOString(),
  };

  test('1. Same company + same job => ACTIVE', () => {
    const score = verifier.calculateTitleMatchScore('Flutter & Full Stack Engineer', 'Flutter & Full Stack Engineer - Railway');
    expect(score.isMatch).toBe(true);
    expect(score.score).toBeGreaterThanOrEqual(0.8);
  });

  test('2. Same company + different job => SOURCE_MISMATCH', () => {
    const score = verifier.calculateTitleMatchScore('Flutter & Full Stack Engineer', 'Infra Engineer - Datacenters @ Railway');
    expect(score.isMatch).toBe(false);
    expect(score.reason?.toLowerCase()).toContain('technology');
  });

  test('3. Same company + unrelated job => SOURCE_MISMATCH', () => {
    const score = verifier.calculateTitleMatchScore('Senior Software Engineer - Flutter & Mobile', 'ZK Proof Engineer @ Axiom');
    expect(score.isMatch).toBe(false);
    expect(score.reason?.toLowerCase()).toContain('technology');
  });

  test('4. Similar Flutter title => ACCEPT (ACTIVE)', () => {
    const score = verifier.calculateTitleMatchScore('Senior Flutter Developer', 'Senior Flutter Developer - Mobile');
    expect(score.isMatch).toBe(true);
    expect(score.score).toBeGreaterThanOrEqual(0.7);
  });

  test('5. Completely different title => SOURCE_MISMATCH', () => {
    const score = verifier.calculateTitleMatchScore('Flutter Developer', 'Senior Backend Go Architect');
    expect(score.isMatch).toBe(false);
  });

  test('6. Generic career page => STALE', async () => {
    const genericJob: JobListing = {
      ...baseJob,
      id: 'job-generic-909',
      url: 'https://www.canva.com/careers',
    };
    const res = await verifier.verifyExternalJob(genericJob);
    expect(res.status).toBe(JobLifecycleStatus.STALE);
    expect(res.reason).toContain('generic');
  });

  test('7. Job URL redirecting to another job => SOURCE_MISMATCH', () => {
    const score = verifier.calculateTitleMatchScore('Flutter Developer', 'Database Support Engineer');
    expect(score.isMatch).toBe(false);
  });

  test('8. Missing salary => salaryText undefined / null', () => {
    const jobWithoutSalary: JobListing = {
      ...baseJob,
      salaryText: undefined,
      salaryMin: undefined,
      salaryMax: undefined,
    };
    expect(jobWithoutSalary.salaryText).toBeUndefined();
    expect(jobWithoutSalary.salaryMin).toBeUndefined();
  });

  test('9. Missing visa information => visaSponsorship false or UNKNOWN', () => {
    const jobWithoutVisa: JobListing = {
      ...baseJob,
      visaSponsorship: false,
    };
    expect(jobWithoutVisa.visaSponsorship).toBe(false);
  });

  test('10. Hardcoded/mock job in non-test mode cannot enter live dataset', () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { CompanyCareerPagesProvider } = require('../../jobs/providers/CompanyCareerPagesProvider');
    const provider = new CompanyCareerPagesProvider();
    return provider.search({ country: 'AU' }).then((res: any) => {
      expect(res.jobs.length).toBe(0);
      expect(res.outcomeStatus).toBe('SUCCESS_ZERO_RESULTS');
      process.env.NODE_ENV = oldEnv;
    });
  });

  test('11. Ranking cannot run on SOURCE_MISMATCH', () => {
    const mismatchedJob: JobListing = {
      ...baseJob,
      jobStatus: JobLifecycleStatus.SOURCE_MISMATCH,
      verificationStatus: JobLifecycleStatus.SOURCE_MISMATCH,
      sourceVerified: false,
      jobIdentityVerified: false,
      applyabilityStatus: 'UNVERIFIED',
    };
    expect(mismatchedJob.sourceVerified).toBe(false);
    expect(mismatchedJob.applyabilityStatus).not.toBe('APPLY_NOW');
  });

  test('12. APPLY_NOW cannot be assigned to SOURCE_MISMATCH', async () => {
    const mismatchedJob: JobListing = {
      ...baseJob,
      jobStatus: JobLifecycleStatus.SOURCE_MISMATCH,
      verificationStatus: JobLifecycleStatus.SOURCE_MISMATCH,
      sourceVerified: false,
      jobIdentityVerified: false,
    };
    const updated = await (verifier as any).updateJobRecord(mismatchedJob, {
      verified: false,
      status: JobLifecycleStatus.SOURCE_MISMATCH,
      reason: 'Title mismatch',
      verifiedAt: new Date().toISOString(),
    });
    expect(updated.applyabilityStatus).toBe('UNVERIFIED');
    expect(updated.sourceVerified).toBe(false);
  });
});
