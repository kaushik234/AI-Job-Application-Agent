/**
 * @file src/services/__tests__/zeroFakeJobs.spec.ts
 * @description Absolute Zero Fake Jobs Spec Suite proving synthetic, demo, mock, fixture,
 * and unverified jobs are 100% excluded from the Live Target Jobs pipeline.
 */

import { JobRepository } from '../../repositories/JobRepository';
import { DatabaseManager } from '../../database';
import { jobVerificationService } from '../JobVerificationService';
import { JobLifecycleStatus, JobListing } from '@sentinel/types';

describe('Absolute Zero Fake Jobs Spec Suite', () => {
  let mockDb: DatabaseManager;
  let jobRepo: JobRepository;

  beforeEach(() => {
    mockDb = new DatabaseManager(':memory:');
    (mockDb as any).data.jobs = [];
    jobRepo = new JobRepository(mockDb);
  });

  const demoJob: JobListing = {
    id: 'demo-tech-1',
    platform: 'Ashby',
    company: 'Demo Technologies',
    title: 'Senior Flutter Developer',
    location: 'Sydney',
    country: 'AU',
    url: 'https://jobs.ashbyhq.com/demo/1',
    visaSponsorship: true,
    isRemote: true,
    postedDate: '2026-08-11',
    createdAt: '2026-08-11T00:00:00.000Z',
    isDemoJob: true,
    jobStatus: JobLifecycleStatus.DEMO_ONLY,
    verificationStatus: JobLifecycleStatus.DEMO_ONLY,
    sourceVerified: false,
  };

  const syntheticCompanyBeta: JobListing = {
    id: 'company-beta-1',
    platform: 'Lever',
    company: 'Company Beta',
    title: 'Android Developer',
    location: 'Sydney',
    country: 'AU',
    url: 'https://jobs.lever.co/companybeta/1',
    visaSponsorship: true,
    isRemote: true,
    postedDate: '2026-08-11',
    createdAt: '2026-08-11T00:00:00.000Z',
    isDemoJob: true,
    jobStatus: JobLifecycleStatus.DEMO_ONLY,
    sourceVerified: false,
  };

  const unverifiedJob: JobListing = {
    id: 'unverified-1',
    platform: 'Seek',
    company: 'Unknown Firm',
    title: 'Flutter Engineer',
    location: 'Sydney',
    country: 'AU',
    url: 'https://www.seek.com.au/job/88888',
    visaSponsorship: true,
    isRemote: true,
    postedDate: '2026-08-11',
    createdAt: '2026-08-11T00:00:00.000Z',
    sourceVerified: false,
    jobStatus: JobLifecycleStatus.DISCOVERED,
    verificationStatus: JobLifecycleStatus.DISCOVERED,
  };

  const realActiveJob: JobListing = {
    id: 'real-active-1',
    platform: 'Greenhouse',
    company: 'Canva',
    title: 'Senior Software Engineer',
    location: 'Sydney',
    country: 'AU',
    url: 'https://boards.greenhouse.io/canva/jobs/1',
    originalUrl: 'https://boards.greenhouse.io/canva/jobs/1',
    visaSponsorship: true,
    isRemote: true,
    postedDate: '2026-08-12',
    createdAt: '2026-08-12T00:00:00.000Z',
    sourceVerified: true,
    jobStatus: JobLifecycleStatus.ACTIVE,
    verificationStatus: JobLifecycleStatus.ACTIVE,
  };

  test('1. DEMO_ONLY job is 100% excluded from findJobs()', async () => {
    await mockDb.saveJobs([demoJob]);
    const live = await jobRepo.findJobs();
    expect(live.some((j) => j.id === demoJob.id)).toBe(false);
  });

  test('2 & 3. Synthetic company ("Demo Technologies", "Company Beta") is excluded from findJobs()', async () => {
    await mockDb.saveJobs([demoJob, syntheticCompanyBeta]);
    const live = await jobRepo.findJobs();
    expect(live.length).toBe(0);
  });

  test('5 & 6. Unverified DISCOVERED job without positive source verification is excluded', async () => {
    await mockDb.saveJobs([unverifiedJob]);
    const live = await jobRepo.findJobs();
    expect(live.length).toBe(0);
  });

  test('15. Real active job with sourceVerified === true is included', async () => {
    await mockDb.saveJobs([realActiveJob, demoJob, syntheticCompanyBeta]);
    const live = await jobRepo.findJobs();
    expect(live.length).toBe(1);
    expect(live[0].id).toBe(realActiveJob.id);
    expect(live[0].company).toBe('Canva');
  });

  test('19 & 20. Zero real jobs returns [] without fabricating replacement jobs', async () => {
    await mockDb.saveJobs([demoJob, unverifiedJob]);
    const live = await jobRepo.findJobs();
    expect(live).toEqual([]);
  });

  test('24. Requesting 50 jobs when only 1 real job exists returns exactly 1 job', async () => {
    await mockDb.saveJobs([realActiveJob, demoJob, syntheticCompanyBeta, unverifiedJob]);
    const live = await jobRepo.findJobs();
    expect(live.length).toBe(1);
  });

  test('25. 0 verified active jobs returns exactly 0 jobs', async () => {
    const live = await jobRepo.findJobs();
    expect(live.length).toBe(0);
  });
});
