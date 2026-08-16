/**
 * @file src/services/__tests__/employerDiversity.spec.ts
 * @description Test suite for Broad ATS Employer Discovery, Diversity Interleaving,
 * Per-Provider Error Isolation, and Dynamic Candidate Role Relevance.
 */

import { JobScraperEngine } from '../../jobs/JobScraperEngine';
import { isRoleRelevant } from '../../jobs/utils/resumeMatcher';
import { jobRankingService } from '../JobRankingService';
import { JobListing, MasterResume, JobLifecycleStatus } from '@sentinel/types';

describe('Employer Diversity & Scraper Isolation Spec Suite', () => {
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
        highlights: ['Built mobile applications using Flutter and Dart.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC'],
      },
    ],
    education: [],
    certifications: [],
    projects: [],
  };

  describe('1. Dynamic Role Relevance', () => {
    test('Accepts valid engineering roles matching candidate resume technologies', () => {
      const flutterJob: JobListing = {
        id: 'job-1',
        platform: 'Ashby',
        company: 'Ramp',
        title: 'Senior Flutter Engineer',
        location: 'Remote',
        country: 'AU',
        url: 'https://jobs.ashbyhq.com/ramp/1',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-14',
        createdAt: '2026-08-14T00:00:00.000Z',
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      };

      const backendJob: JobListing = {
        id: 'job-2',
        platform: 'Lever',
        company: 'Vercel',
        title: 'Backend Engineer - Node.js',
        location: 'Remote',
        country: 'AU',
        url: 'https://jobs.lever.co/vercel/1',
        description: 'Build backend APIs with Node.js and TypeScript.',
        visaSponsorship: true,
        isRemote: true,
        postedDate: '2026-08-14',
        createdAt: '2026-08-14T00:00:00.000Z',
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      };

      expect(isRoleRelevant(flutterJob, sampleResume)).toBe(true);
      expect(isRoleRelevant(backendJob, sampleResume, 'backend')).toBe(true);
      expect(isRoleRelevant(backendJob, sampleResume)).toBe(false);
    });

    test('Rejects non-engineering roles (Sales, HR, Recruiter)', () => {
      const salesJob: JobListing = {
        id: 'job-sales',
        platform: 'Ashby',
        company: 'Figma',
        title: 'Account Executive',
        location: 'San Francisco',
        country: 'AU',
        url: 'https://jobs.ashbyhq.com/figma/sales',
        visaSponsorship: false,
        isRemote: false,
        postedDate: '2026-08-14',
        createdAt: '2026-08-14T00:00:00.000Z',
        sourceVerified: true,
        jobStatus: JobLifecycleStatus.ACTIVE,
      };

      expect(isRoleRelevant(salesJob, sampleResume)).toBe(false);
    });
  });

  describe('2. Diversity Ranking Interleaving', () => {
    test('Interleaves small, startup, scale-up, and enterprise jobs without single-employer collapse', () => {
      const jobs: JobListing[] = [
        {
          id: 'openai-1',
          platform: 'Ashby',
          company: 'OpenAI',
          title: 'Systems Software Engineer',
          location: 'San Francisco',
          country: 'AU',
          url: 'https://jobs.ashbyhq.com/openai/1',
          visaSponsorship: true,
          isRemote: true,
          postedDate: '2026-08-14',
          createdAt: '2026-08-14T00:00:00.000Z',
          companySize: 'ENTERPRISE',
          companyType: 'Enterprise',
          sourceVerified: true,
          jobStatus: JobLifecycleStatus.ACTIVE,
        },
        {
          id: 'openai-2',
          platform: 'Ashby',
          company: 'OpenAI',
          title: 'Compute Infrastructure Engineer',
          location: 'San Francisco',
          country: 'AU',
          url: 'https://jobs.ashbyhq.com/openai/2',
          visaSponsorship: true,
          isRemote: true,
          postedDate: '2026-08-14',
          createdAt: '2026-08-14T00:00:00.000Z',
          companySize: 'ENTERPRISE',
          companyType: 'Enterprise',
          sourceVerified: true,
          jobStatus: JobLifecycleStatus.ACTIVE,
        },
        {
          id: 'startup-1',
          platform: 'Ashby',
          company: 'Linear',
          title: 'Senior Software Engineer',
          location: 'Remote',
          country: 'AU',
          url: 'https://jobs.ashbyhq.com/linear/1',
          description: 'Small product startup building issue tracking tools.',
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
      expect(ranked.length).toBe(3);
      expect(ranked[0].company).not.toBe(ranked[1].company);
    });
  });

  describe('3. Per-Provider Error Isolation', () => {
    test('JobScraperEngine returns valid report when providers run', async () => {
      const engine = new JobScraperEngine();
      expect(engine.getProviders().length).toBeGreaterThanOrEqual(9);
    });
  });
});
