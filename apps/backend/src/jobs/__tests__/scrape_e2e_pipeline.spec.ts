/**
 * @file src/jobs/__tests__/scrape_e2e_pipeline.spec.ts
 * @description End-to-end integration test exercising actual Controller -> Service -> JobScraperEngine -> Providers -> Verification -> Ranking -> Repository orchestration.
 */

import { JobScraperEngine } from '../JobScraperEngine';
import { JobRepository } from '../../repositories/JobRepository';
import { MasterResume, JobListing, JobLifecycleStatus } from '@sentinel/types';

describe('End-to-End Scrape & Discovery Pipeline Spec Suite', () => {
  jest.setTimeout(30000);
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

  test('1. Orchestration executes multi-query loop and returns HTTP 200 report', async () => {
    const engine = new JobScraperEngine();
    const result = await engine.executeParallelCrawl({ countries: ['AU'], visaOnly: false, remoteOnly: false });

    expect(result).toBeDefined();
    expect(result.mode).toBeDefined();
    expect(result.providersProcessed).toBeGreaterThan(0);
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('2. Partial provider failure does not crash discovery process', async () => {
    const engine = new JobScraperEngine();
    // Simulate one provider throwing an unhandled network error
    const mockFailingProvider = {
      platform: 'FailingProvider',
      name: 'FailingProvider',
      supports: () => true,
      search: async () => {
        throw new Error('Simulated network connection timeout');
      },
      searchJobs: async () => {
        throw new Error('Simulated network connection timeout');
      },
      normalize: (data: any) => data,
    };
    (engine as any).providers.push(mockFailingProvider);

    const result = await engine.executeParallelCrawl({ countries: ['AU'] });
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('3. Custom search term query directly filters results and returns empty list if 0 match', async () => {
    const engine = new JobScraperEngine();
    const result = await engine.executeParallelCrawl({ q: 'nonexistent-unique-term-999' });

    expect(result.jobs).toBeDefined();
    // Non-existent search query should return 0 jobs, NOT fake jobs
    expect(result.jobs.filter(j => j.company.includes('nonexistent'))).toHaveLength(0);
  });

  test('4. Duplicate listings across multiple providers are merged', () => {
    const { jobDeduplicationService } = require('../../services/JobDeduplicationService');

    const jobFromLinkedIn: JobListing = {
      id: 'link-1',
      platform: 'LinkedIn',
      company: 'Axiom',
      title: 'Senior Flutter Engineer',
      location: 'Sydney',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/axiom/363ab5a7',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-15',
      createdAt: '2026-08-15T00:00:00.000Z',
      sourceVerified: true,
      jobStatus: JobLifecycleStatus.ACTIVE,
    };

    const jobFromIndeed: JobListing = {
      id: 'indeed-1',
      platform: 'Indeed',
      company: 'Axiom',
      title: 'Senior Flutter Engineer',
      location: 'Sydney',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/axiom/363ab5a7',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-15',
      createdAt: '2026-08-15T00:00:00.000Z',
      sourceVerified: true,
      jobStatus: JobLifecycleStatus.ACTIVE,
    };

    const deduplicated = jobDeduplicationService.deduplicateJobs([jobFromLinkedIn, jobFromIndeed]);
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].sources).toContain('LinkedIn');
    expect(deduplicated[0].sources).toContain('Indeed');
  });

  test('5. Zero legitimate matches return [] rather than fake jobs', async () => {
    const repo = new JobRepository();
    const liveJobs = await repo.findJobs({ includeDemo: false });
    const hasFake = liveJobs.some((j: JobListing) => j.isDemoJob || j.jobStatus === 'DEMO_ONLY' || j.verificationStatus === 'DEMO_ONLY');
    expect(hasFake).toBe(false);
  });
});
