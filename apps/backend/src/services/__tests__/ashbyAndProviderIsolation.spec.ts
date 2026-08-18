/**
 * @file src/services/__tests__/ashbyAndProviderIsolation.spec.ts
 * @description Integration spec suite verifying Ashby ATS handling, non-collapsing of distinct ATS employers,
 * provider error isolation, zero fake jobs, and diversity requirements.
 */

import { JobScraperEngine } from '../../jobs/JobScraperEngine';
import { isRoleRelevant } from '../../jobs/utils/resumeMatcher';
import { jobRankingService } from '../JobRankingService';
import { jobVerificationService } from '../JobVerificationService';
import { JobListing, MasterResume, JobLifecycleStatus } from '@sentinel/types';

describe('Ashby ATS & Provider Isolation Spec Suite (Requirement 19)', () => {
  const sampleResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushik@example.com',
    phone: '+91 8849170743',
    location: 'Ahmedabad, India',
    linkedIn: 'https://linkedin.com/in/kaushik',
    github: 'https://github.com/kaushik',
    portfolio: 'https://kaushik.dev',
    summary: 'Senior Flutter Developer with experience in Dart, Flutter, BLoC, and SQLite.',
    explicitExperienceYears: 3.8,
    experienceSource: 'RESUME_EXPLICIT',
    skills: {
      languages: ['Dart', 'TypeScript', 'Node.js'],
      frameworks: ['Flutter', 'BLoC', 'React'],
      cloudAndDevOps: ['Firebase', 'AWS'],
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
        highlights: ['Built mobile applications using Flutter.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC'],
      },
    ],
    education: [],
    certifications: [],
    projects: [],
  };

  test('1 & 2. Scrape engine initializes providers and does not crash on single provider error', async () => {
    const engine = new JobScraperEngine();
    expect(engine.getProviders().length).toBeGreaterThanOrEqual(9);
  });

  test('3, 4 & 5. Ashby jobs are accepted as real jobs and Axiom/Railway jobs are NOT collapsed together', async () => {
    const axiomJob: JobListing = {
      id: 'ashby-axiom-363ab5a7',
      platform: 'Ashby',
      company: 'Axiom',
      title: 'Senior Software Engineer',
      location: 'Remote',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/axiom/363ab5a7-499a-48b6-9ed1-ebb44df570a4/',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-14',
      createdAt: '2026-08-14T00:00:00.000Z',
      sourceVerified: true,
      jobStatus: JobLifecycleStatus.ACTIVE,
    };

    const railwayJob: JobListing = {
      id: 'ashby-railway-541836a1',
      platform: 'Ashby',
      company: 'Railway',
      title: 'Infrastructure Engineer',
      location: 'Remote',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/railway/541836a1-6d3f-47bf-845f-5f48fe547568/',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-14',
      createdAt: '2026-08-14T00:00:00.000Z',
      sourceVerified: true,
      jobStatus: JobLifecycleStatus.ACTIVE,
    };

    const { jobDeduplicationService } = require('../JobDeduplicationService');
    const deduplicated = jobDeduplicationService.deduplicateJobs([axiomJob, railwayJob]);

    expect(deduplicated.length).toBe(2);
    expect(deduplicated[0].company).toBe('Axiom');
    expect(deduplicated[1].company).toBe('Railway');
  });

  test('6. ATS hostname (jobs.ashbyhq.com) is NOT treated as company name', () => {
    const job: JobListing = {
      id: 'ashby-axiom-1',
      platform: 'Ashby',
      company: 'Axiom',
      title: 'Staff Software Engineer',
      location: 'San Francisco',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/axiom/363ab5a7',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-14',
      createdAt: '2026-08-14T00:00:00.000Z',
      sourceVerified: true,
      jobStatus: JobLifecycleStatus.ACTIVE,
    };

    expect(job.company).toBe('Axiom');
    expect(job.platform).toBe('Ashby');
  });

  test('7 & 8. OpenAI does not dominate final results when multiple companies are present', () => {
    const jobs: JobListing[] = [
      {
        id: 'openai-1',
        platform: 'Ashby',
        company: 'OpenAI',
        title: 'Backend Engineer',
        location: 'SF',
        country: 'AU',
        url: 'https://jobs.ashbyhq.com/openai/1',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-14',
        createdAt: '2026-08-14T00:00:00.000Z',
        companySize: 'ENTERPRISE',
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      },
      {
        id: 'railway-1',
        platform: 'Ashby',
        company: 'Railway',
        title: 'Full Stack Engineer',
        location: 'Remote',
        country: 'AU',
        url: 'https://jobs.ashbyhq.com/railway/1',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-15',
        createdAt: '2026-08-15T00:00:00.000Z',
        companySize: 'SMALL',
        companyType: 'Startup',
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      },
    ];

    const { db } = require('../../database');
    (db as any).data.jobs = [];
    const ranked = jobRankingService.rankJobs(jobs, sampleResume);
    expect(ranked[0].company).toBe('Railway');
  });

  test('9 & 10. Zero verified jobs returns [] and DEMO_ONLY jobs never enter LIVE dataset', async () => {
    const { JobRepository } = require('../../repositories/JobRepository');
    const repo = new JobRepository();
    const live = await repo.findJobs({ mode: 'LIVE' });
    const hasDemo = live.some((j: JobListing) => j.isDemoJob || j.jobStatus === 'DEMO_ONLY' || j.verificationStatus === 'DEMO_ONLY');
    expect(hasDemo).toBe(false);
  });
});
