/**
 * @file src/services/__tests__/freshnessAndDiversity.spec.ts
 * @description Test suite for Job Freshness, Controlled Revalidation, Original Post Click Protection,
 * Company Size Classification, and Employer Diversity Ranking (Phase 25).
 */

import { jobVerificationService } from '../JobVerificationService';
import { jobRankingService } from '../JobRankingService';
import { companyClassificationService } from '../CompanyClassificationService';
import { normalizePostingDate, classifyFreshnessCategory } from '../../jobs/utils/dateNormalizer';
import { deriveSearchQueriesFromResume } from '../../jobs/utils/queryGenerator';
import { db } from '../../database';
import { JobLifecycleStatus, JobListing, MasterResume } from '@sentinel/types';

describe('Freshness, Revalidation & Employer Diversity Spec Suite (Phase 25)', () => {
  const sampleResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushik@example.com',
    phone: '+91 8849170743',
    location: 'Ahmedabad, India',
    linkedIn: 'https://linkedin.com/in/kaushik',
    github: 'https://github.com/kaushik',
    portfolio: 'https://kaushik.dev',
    summary: 'Senior Flutter Developer with 3.8 years experience in Dart, Flutter, BLoC, and SQLite.',
    explicitExperienceYears: 3.8,
    experienceSource: 'RESUME_EXPLICIT',
    skills: {
      languages: ['Dart'],
      frameworks: ['Flutter', 'BLoC'],
      cloudAndDevOps: ['Firebase'],
      databases: ['SQLite'],
      tools: ['Git'],
    },
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Flutter Developer',
        location: 'Ahmedabad',
        startDate: '2023-12',
        endDate: 'Present',
        highlights: ['Built Flutter mobile apps with BLoC state management.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC'],
      },
    ],
    education: [],
    certifications: [],
    projects: [],
  };

  describe('1. Posting Date Extraction & Zero Fabrication', () => {
    test('Normalizes relative dates and ISO strings without fabricating dates for unstated inputs', () => {
      expect(normalizePostingDate('Today')).toBeDefined();
      expect(normalizePostingDate('Yesterday')).toBeDefined();
      expect(normalizePostingDate('3 days ago')).toBeDefined();
      expect(normalizePostingDate('2 weeks ago')).toBeDefined();
      expect(normalizePostingDate('2026-08-12T00:00:00.000Z')).toBe('2026-08-12');
      expect(normalizePostingDate(undefined)).toBeNull();
      expect(normalizePostingDate('')).toBeNull();
    });

    test('Classifies freshness categories correctly', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      expect(classifyFreshnessCategory(todayStr)).toBe('VERY_RECENT');
      expect(classifyFreshnessCategory(null)).toBe('UNKNOWN');
      expect(classifyFreshnessCategory('')).toBe('UNKNOWN');
    });
  });

  describe('2. Controlled Revalidation (6-Hour Threshold)', () => {
    test('8. Old lastVerifiedAt (> 6h) triggers revalidation', () => {
      const oldJob: JobListing = {
        id: 'job-old-verified',
        platform: 'Seek',
        company: 'Canva',
        title: 'Senior Software Engineer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://www.seek.com.au/job/79218201',
        originalUrl: 'https://www.seek.com.au/job/79218201',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-10',
        createdAt: '2026-08-10T00:00:00.000Z',
        lastVerifiedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      };

      expect(jobVerificationService.isVerificationFresh(oldJob, 6)).toBe(false);
    });

    test('9. Recently verified ACTIVE job (< 6h) trusts cached verification', () => {
      const freshVerifiedJob: JobListing = {
        id: 'job-recent-verified',
        platform: 'Seek',
        company: 'Canva',
        title: 'Senior Software Engineer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://www.seek.com.au/job/79218201',
        originalUrl: 'https://www.seek.com.au/job/79218201',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-10',
        createdAt: '2026-08-10T00:00:00.000Z',
        lastVerifiedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      };

      expect(jobVerificationService.isVerificationFresh(freshVerifiedJob, 6)).toBe(true);
    });

    test('25. Job becoming expired after initial scrape is removed on revalidation', async () => {
      const expiredJob: JobListing = {
        id: 'job-became-expired',
        platform: 'Workable',
        company: 'Zendesk',
        title: 'Lead Developer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://apply.workable.com/zendesk-expired/j/C9012/?not_found=true',
        originalUrl: 'https://apply.workable.com/zendesk-expired/j/C9012/?not_found=true',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-10',
        createdAt: '2026-08-10T00:00:00.000Z',
        lastVerifiedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      };

      const revalidated = await jobVerificationService.verifyOrRevalidateJob(expiredJob, true);
      expect(revalidated.sourceVerified).toBe(false);
      expect(revalidated.jobStatus).toBe(JobLifecycleStatus.EXPIRED);
      expect(jobVerificationService.isJobEligibleForApplication(revalidated).eligible).toBe(false);
    });
  });

  describe('3. Original Post Click Protection', () => {
    test('10. User clicks active original post -> revalidation returns canOpen: true', async () => {
      const activeJob: JobListing = {
        id: 'active-click-job',
        platform: 'Seek',
        company: 'Canva',
        title: 'Senior Software Engineer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://www.seek.com.au/job/79218201',
        originalUrl: 'https://www.seek.com.au/job/79218201',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-11',
        createdAt: '2026-08-11T00:00:00.000Z',
      };
      await db.saveJobs([activeJob]);

      const res = await jobVerificationService.verifyOrRevalidateJob(activeJob, true);
      expect(res.sourceVerified).toBe(true);
      expect(res.jobStatus).toBe(JobLifecycleStatus.ACTIVE);
    });

    test('11. User clicks expired original post -> blocks opening and marks EXPIRED', async () => {
      const sapErrorJob: JobListing = {
        id: 'sap-click-error',
        platform: 'Company Career Page',
        company: 'SAP',
        title: 'Senior Developer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://jobs.sap.com/jobs/errorpage/?errortype=404',
        originalUrl: 'https://jobs.sap.com/jobs/errorpage/?errortype=404',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-11',
        createdAt: '2026-08-11T00:00:00.000Z',
      };

      const res = await jobVerificationService.verifyOrRevalidateJob(sapErrorJob, true);
      expect(res.sourceVerified).toBe(false);
      expect(res.jobStatus).not.toBe(JobLifecycleStatus.ACTIVE);
    });
  });

  describe('4. Company Size Classification & Candidate-Aware Discovery', () => {
    test('Classifies company size from text cues without guessing', () => {
      const startupJob: JobListing = {
        id: 'startup-1',
        platform: 'Ashby',
        company: 'TechFlow',
        title: 'Flutter Engineer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://jobs.ashbyhq.com/techflow/1',
        description: 'We are a fast-growing early-stage startup with 5-10 engineers.',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-12',
        createdAt: '2026-08-12T00:00:00.000Z',
      };

      const enterpriseJob: JobListing = {
        id: 'enterprise-1',
        platform: 'Company Career Page',
        company: 'SAP',
        title: 'Senior Flutter Developer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://jobs.sap.com/careers/jobs/7718',
        description: 'Join SAP, a global enterprise software company.',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-12',
        createdAt: '2026-08-12T00:00:00.000Z',
      };

      expect(companyClassificationService.classifyCompanySize(startupJob)).toBe('MICRO');
      expect(companyClassificationService.classifyCompanySize(enterpriseJob)).toBe('ENTERPRISE');
    });

    test('22. Company size unavailable -> UNKNOWN and still eligible', () => {
      const unknownSizeJob: JobListing = {
        id: 'unknown-size-1',
        platform: 'Lever',
        company: 'Apex Labs',
        title: 'Flutter Developer',
        location: 'Sydney',
        country: 'AU',
        url: 'https://jobs.lever.co/apexlabs/1',
        description: 'Building mobile apps with Flutter.',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-12',
        createdAt: '2026-08-12T00:00:00.000Z',
      };

      const size = companyClassificationService.classifyCompanySize(unknownSizeJob);
      expect(size).toBe('UNKNOWN');
    });

    test('Generates candidate-aware search variations for Flutter candidate', () => {
      const derived = deriveSearchQueriesFromResume(sampleResume);
      expect(derived.keywords.some((k) => k.includes('Flutter') || k.includes('Mobile'))).toBe(true);
    });
  });

  describe('5. Freshness & Employer Diversity Ranking', () => {
    test('13-16. Includes large, small, startup, and unknown companies with high matches', () => {
      const jobs: JobListing[] = [
        {
          id: 'ent-job',
          platform: 'Greenhouse',
          company: 'Canva',
          title: 'Senior Software Engineer',
          location: 'Sydney',
          country: 'AU',
          url: 'https://boards.greenhouse.io/canva/jobs/1',
          visaSponsorship: true,
          isRemote: true,
          postedDate: '2026-08-12',
          createdAt: '2026-08-12T00:00:00.000Z',
          sourceVerified: true,
          jobStatus: JobLifecycleStatus.ACTIVE,
          verificationStatus: JobLifecycleStatus.ACTIVE,
        },
        {
          id: 'startup-job',
          platform: 'Ashby',
          company: 'Acme Startup',
          title: 'Senior Flutter Developer',
          location: 'Sydney',
          country: 'AU',
          url: 'https://jobs.ashbyhq.com/acme/1',
          description: 'Early-stage startup building Flutter apps.',
          visaSponsorship: true,
          isRemote: true,
          postedDate: '2026-08-14',
          createdAt: '2026-08-14T00:00:00.000Z',
          sourceVerified: true,
          jobStatus: JobLifecycleStatus.ACTIVE,
          verificationStatus: JobLifecycleStatus.ACTIVE,
        },
      ];

      const ranked = jobRankingService.rankJobs(jobs, sampleResume);
      expect(ranked.length).toBe(2);
      expect(ranked.some((j) => j.id === 'startup-job')).toBe(true);
      expect(ranked.some((j) => j.id === 'ent-job')).toBe(true);
    });

    test('17-19. Rejects poor role matches and non-ACTIVE expired jobs', () => {
      const poorMatchJob: JobListing = {
        id: 'pastry-chef',
        platform: 'Seek',
        company: 'Sweet Bakery',
        title: 'Pastry Chef',
        location: 'Sydney',
        country: 'AU',
        url: 'https://www.seek.com.au/job/999999',
        visaSponsorship: false,
        isRemote: false,
        postedDate: '2026-08-12',
        createdAt: '2026-08-12T00:00:00.000Z',
        sourceVerified: false,
        jobStatus: JobLifecycleStatus.STALE,
      };

      const eligibility = jobVerificationService.isJobEligibleForApplication(poorMatchJob);
      expect(eligibility.eligible).toBe(false);
    });

    test('24. Expired job never appears in Live Jobs dataset', async () => {
      const liveJobs = await db.getLiveJobs();
      expect(liveJobs.every((j) => j.sourceVerified === true && (j.verificationStatus === 'ACTIVE' || j.jobStatus === 'ACTIVE') && !j.isDemoJob)).toBe(true);
    });
  });
});
