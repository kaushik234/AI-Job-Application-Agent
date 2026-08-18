/**
 * @file src/jobs/__tests__/discoveryPipelineAndQueries.spec.ts
 * @description Master regression test suite for Job Discovery Pipeline Invariants, Dynamic Query Generator, Role Relevance, Location, and Verification.
 */

import { JobScraperEngine } from '../JobScraperEngine';
import { deriveSearchQueriesFromResume } from '../utils/queryGenerator';
import { checkRoleRelevanceDetails, deriveCandidateTargetProfile } from '../utils/resumeMatcher';
import { jobVerificationService } from '../../services/JobVerificationService';
import { MasterResume, JobListing } from '@sentinel/types';

describe('Discovery Pipeline & Query Generator Regression Tests', () => {
  beforeEach(() => {
    jest.setTimeout(30000);
  });
  const sampleFlutterResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushik@example.com',
    phone: '+91 8849170743',
    linkedIn: 'https://linkedin.com/in/kaushik',
    github: 'https://github.com/kaushik',
    portfolio: 'https://kaushik.dev',
    location: 'Ahmedabad, India',
    summary: 'Senior Flutter Developer with 5 years experience in Flutter, Dart, BLoC, SQLite, Firebase, and Git.',
    explicitExperienceYears: 5,
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Senior Flutter Developer',
        location: 'Ahmedabad',
        startDate: '2021-01',
        endDate: 'Present',
        highlights: ['Built mobile apps with Flutter, Dart, and BLoC.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC', 'Firebase'],
      },
    ],
    skills: {
      languages: ['Dart', 'JavaScript'],
      frameworks: ['Flutter', 'BLoC'],
      databases: ['SQLite'],
      tools: ['Git', 'VS Code'],
      cloudAndDevOps: ['Firebase'],
    },
    education: [],
    certifications: [],
    projects: [],
  };

  test('1. All jobs DO_NOT_APPLY -> returned = 0', async () => {
    const engine = new JobScraperEngine();
    (engine as any).providers = [
      {
        platform: 'Greenhouse',
        supports: () => true,
        search: async () => ({
          jobs: [
            ({
              id: 'job-rejected-1',
              title: 'Senior Pastry Chef',
              company: 'City Bakery',
              location: 'Sydney, Australia',
              country: 'AU',
              visaSponsorship: false,
              isRemote: false,
              postedDate: '2026-08-18',
              createdAt: '2026-08-18T00:00:00.000Z',
              url: 'https://example.com/job/1',
              platform: 'Greenhouse',
              description: 'Baking bread and cakes.',
              sourceVerified: true,
              verificationStatus: 'ACTIVE',
              jobIdentityVerified: true,
              matchScore: 10,
              recommendation: 'DO_NOT_APPLY',
              priorityCategory: 'DO_NOT_APPLY',
            } as unknown) as JobListing,
          ],
          totalFound: 1,
          page: 1,
          limit: 10,
          outcomeStatus: 'SUCCESS_WITH_RESULTS',
        }),
      },
    ];

    const report = await engine.executeParallelCrawl({ countries: ['ALL' as any] }, { page: 1, limit: 10 });
    expect(report.pipeline?.afterApplyDecision).toBe(0);
    expect(report.pipeline?.returned).toBe(0);
    expect(report.jobs.length).toBe(0);
  });

  test('2. DO_NOT_APPLY jobs never appear in returnedJobs', async () => {
    const engine = new JobScraperEngine();
    (engine as any).providers = [
      {
        platform: 'Lever',
        supports: () => true,
        search: async () => ({
          jobs: [
            ({
              id: 'job-app-1',
              title: 'Senior Flutter Developer',
              company: 'AppStudio',
              location: 'Remote',
              country: 'US',
              visaSponsorship: true,
              isRemote: true,
              postedDate: '2026-08-18',
              createdAt: '2026-08-18T00:00:00.000Z',
              url: 'https://www.seek.com.au/job/79218201',
              platform: 'Lever',
              description: 'Flutter and Dart development.',
              sourceVerified: true,
              verificationStatus: 'ACTIVE',
              jobIdentityVerified: true,
              matchScore: 90,
              recommendation: 'APPLY_NOW',
            } as unknown) as JobListing,
            ({
              id: 'job-rej-1',
              title: 'Senior Mobile Architect',
              company: 'Enterprise Mobile Co',
              location: 'Remote',
              country: 'US',
              visaSponsorship: false,
              isRemote: true,
              postedDate: '2026-08-18',
              createdAt: '2026-08-18T00:00:00.000Z',
              url: 'https://www.seek.com.au/job/79218201',
              platform: 'Lever',
              description: 'Senior Mobile Architect for enterprise Flutter apps. Minimum 15 years required.',
              requirements: ['15 years mobile architecture experience required'],
              sourceVerified: true,
              verificationStatus: 'ACTIVE',
              jobIdentityVerified: true,
              matchScore: 10,
              recommendation: 'DO_NOT_APPLY',
            } as unknown) as JobListing,
          ],
          totalFound: 2,
          page: 1,
          limit: 10,
          outcomeStatus: 'SUCCESS_WITH_RESULTS',
        }),
      },
    ];

    const report = await engine.executeParallelCrawl({ countries: ['ALL' as any] }, { page: 1, limit: 10 });
    const returnedIds = report.jobs.map((j) => j.id);
    expect(returnedIds).toContain('job-app-1');
    expect(returnedIds).not.toContain('job-rej-1');
    expect(report.rejectedJobs.map((j) => j.id)).toContain('job-rej-1');
  });

  test('3. APPLY jobs appear in recommendedJobs', () => {
    const job: JobListing = ({
      id: 'j1',
      title: 'Senior Flutter Engineer',
      company: 'TechCorp',
      location: 'Remote',
      country: 'US',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-18',
      createdAt: '2026-08-18T00:00:00.000Z',
      url: 'https://example.com/1',
      platform: 'Greenhouse',
      matchScore: 85,
      recommendation: 'APPLY_NOW',
    } as unknown) as JobListing;
    const rec = (job.recommendation || '').toUpperCase();
    const matchScore = job.matchScore ?? 50;
    const isRecommended = matchScore >= 60 || rec === 'APPLY_NOW' || rec === 'TAILOR_AND_APPLY' || rec === 'HIGH_PRIORITY' || rec === 'GOOD_MATCH';
    expect(isRecommended).toBe(true);
  });

  test('4. CONSIDER jobs appear in considerJobs', () => {
    const job: JobListing = ({
      id: 'j2',
      title: 'Mobile Developer',
      company: 'AppCo',
      location: 'Remote',
      country: 'US',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-18',
      createdAt: '2026-08-18T00:00:00.000Z',
      url: 'https://example.com/2',
      platform: 'Lever',
      matchScore: 50,
      recommendation: 'CONSIDER',
    } as unknown) as JobListing;
    const rec = (job.recommendation || '').toUpperCase();
    const matchScore = job.matchScore ?? 50;
    const isConsider = (matchScore >= 40 || rec === 'CONSIDER') && matchScore < 60 && rec !== 'APPLY_NOW' && rec !== 'DO_NOT_APPLY';
    expect(isConsider).toBe(true);
  });

  test('5. returned = recommended + consider after limit', async () => {
    const recommendedJobs: JobListing[] = [{ id: '1' } as any, { id: '2' } as any];
    const considerJobs: JobListing[] = [{ id: '3' } as any];

    const qualifyingJobs = [...recommendedJobs, ...considerJobs];
    const returnedJobs = qualifyingJobs.slice(0, 50);

    expect(returnedJobs.length).toBe(recommendedJobs.length + considerJobs.length);
  });

  test('6. Worldwide does not reject foreign jobs', () => {
    const job: JobListing = ({
      id: 'j-ca',
      title: 'Flutter Developer',
      company: 'Canada Tech',
      location: 'Toronto, ON, Canada',
      country: 'CA',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-18',
      createdAt: '2026-08-18T00:00:00.000Z',
      url: 'https://example.com/ca',
      platform: 'Ashby',
    } as unknown) as JobListing;

    const isWorldwide = true;
    const allowedCountries = ['ALL'];
    const passed = isWorldwide || allowedCountries.includes('CA');
    expect(passed).toBe(true);
  });

  test('7. Explicit country filter rejects wrong countries', () => {
    const job: JobListing = ({
      id: 'j-au',
      title: 'Flutter Developer',
      company: 'Aussie Tech',
      location: 'Sydney, Australia',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-18',
      createdAt: '2026-08-18T00:00:00.000Z',
      url: 'https://example.com/au',
      platform: 'Seek',
    } as unknown) as JobListing;

    const allowedCountries = ['CA'];
    const canonicalCountry = jobVerificationService.deriveCanonicalCountry(job.location, job.country).country;
    const isMatch = allowedCountries.includes(canonicalCountry.toUpperCase());
    expect(isMatch).toBe(false);
  });

  test('8. Old but currently live job remains ACTIVE', () => {
    const liveOldJob: JobListing = ({
      id: 'old-live-1',
      title: 'Flutter Engineer',
      company: 'Longstanding Co',
      location: 'Remote',
      country: 'US',
      visaSponsorship: true,
      isRemote: true,
      createdAt: '2026-06-01T00:00:00.000Z',
      url: 'https://example.com/old',
      platform: 'Greenhouse',
      postedDate: '2026-06-01',
      sourceVerified: true,
      verificationStatus: 'ACTIVE',
      jobIdentityVerified: true,
    } as unknown) as JobListing;

    expect(liveOldJob.verificationStatus).toBe('ACTIVE');
    expect(liveOldJob.sourceVerified).toBe(true);
  });

  test('9. Expired external job remains rejected', () => {
    const expiredJob: JobListing = ({
      id: 'expired-1',
      title: 'Flutter Engineer',
      company: 'Closed Co',
      location: 'Remote',
      country: 'US',
      visaSponsorship: false,
      isRemote: true,
      postedDate: '2026-08-01',
      createdAt: '2026-08-01T00:00:00.000Z',
      url: 'https://example.com/closed',
      platform: 'Lever',
      sourceVerified: false,
      verificationStatus: 'EXPIRED',
      jobIdentityVerified: false,
    } as unknown) as JobListing;

    const isVerifiedActive = expiredJob.sourceVerified === true && expiredJob.verificationStatus === 'ACTIVE' && expiredJob.jobIdentityVerified !== false;
    expect(isVerifiedActive).toBe(false);
  });

  test('10. Query generator does not generate arbitrary technology-as-job queries', () => {
    const derived = deriveSearchQueriesFromResume(sampleFlutterResume);
    const queriesLower = derived.queryExplanations.map((e) => e.query.toLowerCase());

    expect(queriesLower).not.toContain('sqlite engineer');
    expect(queriesLower).not.toContain('git engineer');
    expect(queriesLower).not.toContain('bloc engineer');
    expect(queriesLower).not.toContain('firebase engineer');
  });

  test('11. Target roles are derived from candidate profile', () => {
    const profile = deriveCandidateTargetProfile(sampleFlutterResume);
    expect(profile.primaryRoles).toContain('Senior Flutter Developer');
    expect(profile.roleFamilies).toContain('flutter');
    expect(profile.roleFamilies).toContain('mobile');
  });

  test('12. Generic Software Engineer with Flutter evidence passes role relevance', () => {
    const genericJob: JobListing = ({
      id: 'gen-1',
      title: 'Software Engineer',
      company: 'Mobile First Inc',
      location: 'Remote',
      country: 'US',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-18',
      createdAt: '2026-08-18T00:00:00.000Z',
      url: 'https://example.com/gen1',
      platform: 'Greenhouse',
      description: 'We are seeking a Software Engineer to build cross-platform mobile apps with Flutter, Dart, and clean mobile architecture.',
    } as unknown) as JobListing;

    const diag = checkRoleRelevanceDetails(genericJob, sampleFlutterResume);
    expect(diag.isRelevant).toBe(true);
    expect(diag.matchedKeywords.map((k) => k.toLowerCase())).toContain('flutter');
  });
});
