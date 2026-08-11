/**
 * @file src/jobs/__tests__/engine.spec.ts
 * @description Integration tests for JobScraperEngine parallel crawling, deduplication, and repository persistence.
 */

import { JobScraperEngine } from '../JobScraperEngine';
import { deduplicateJobs, generateJobFingerprint } from '../utils/deduplication';
import { JobListing } from '@sentinel/types';

describe('Job Search Engine & Deduplication Suite (Phase 6)', () => {
  describe('Deduplication Utility', () => {
    const mockJob1: JobListing = {
      id: 'job-01',
      platform: 'Greenhouse',
      company: 'Canva',
      title: 'Senior Software Engineer',
      location: 'Sydney, AU',
      city: 'Sydney',
      country: 'AU',
      salaryMin: 160000,
      salaryMax: 190000,
      salaryCurrency: 'AUD',
      visaSponsorship: true,
      isRemote: true,
      isHybrid: true,
      url: 'https://boards.greenhouse.io/canva/jobs/12345',
      description: 'Senior software engineering role at Canva',
      requirements: ['TypeScript', 'React'],
      postedDate: '2026-08-05',
      createdAt: new Date().toISOString(),
    };

    const mockJob1Duplicate: JobListing = {
      ...mockJob1,
      id: 'job-01-dup',
      url: 'https://boards.greenhouse.io/canva/jobs/12345/', // trailing slash difference
    };

    it('should generate consistent fingerprints for identical canonical URLs', () => {
      const fp1 = generateJobFingerprint(mockJob1);
      const fp2 = generateJobFingerprint(mockJob1Duplicate);
      expect(fp1).toBe(fp2);
    });

    it('should filter out duplicate jobs against incoming and existing datasets', () => {
      const incoming = [mockJob1, mockJob1Duplicate];
      const existing: JobListing[] = [];

      const { uniqueJobs, duplicatesRemovedCount } = deduplicateJobs(incoming, existing);

      expect(uniqueJobs.length).toBe(1);
      expect(duplicatesRemovedCount).toBe(1);
    });
  });

  describe('JobScraperEngine Multi-Provider Crawl', () => {
    let engine: JobScraperEngine;

    beforeEach(() => {
      engine = new JobScraperEngine();
    });

    it('should initialize all 9 providers in scraper engine', () => {
      const providers = engine.getProviders();
      expect(providers.length).toBe(9);
    });

    it('should execute parallel crawl across all 9 providers', async () => {
      const report = await engine.executeParallelCrawl(
        { countries: ['AU', 'CA', 'DE'] },
        { page: 1, limit: 10 }
      );

      expect(report.providersProcessed).toBe(9);
      expect(report.totalScrapedRaw).toBeGreaterThan(0);
      expect(report.jobs.length).toBeGreaterThan(0);

      // Check provider breakdown
      expect(report.providerBreakdown['Greenhouse'].status).toBe('SUCCESS');
      expect(report.providerBreakdown['Lever'].status).toBe('SUCCESS');
      expect(report.providerBreakdown['Ashby'].status).toBe('SUCCESS');
      expect(report.providerBreakdown['Workable'].status).toBe('SUCCESS');
    }, 15000);
  });
});
