/**
 * @file src/jobs/__tests__/user_query_filtering.spec.ts
 * @description Unit test suite validating Best Matches Worldwide, Custom Search, global provider filtering, visa/remote toggles, and zero-results response contracts.
 */

import { JobScraperEngine } from '../JobScraperEngine';
import { deriveSearchQueriesFromResume } from '../utils/queryGenerator';

describe('Global Job Discovery & Search Suite', () => {
  let engine: JobScraperEngine;

  beforeEach(() => {
    engine = new JobScraperEngine();
  });

  // TEST 1: Best Matches Worldwide with empty query
  it('TEST 1: should discover jobs globally from candidate resume when search query is empty', async () => {
    const report = await engine.executeParallelCrawl(
      { countries: ['ALL' as any] },
      { page: 1, limit: 10 }
    );

    expect(report.mode).toBe('WORLDWIDE');
    expect(report.jobs.length).toBeGreaterThan(0);
    expect(report.jobs[0].matchScore).toBeGreaterThanOrEqual(report.jobs[report.jobs.length - 1].matchScore || 0);
  });

  // TEST 2: Worldwide Custom Search for "flutter"
  it('TEST 2: should search globally for "flutter" when custom query is entered', async () => {
    const report = await engine.executeParallelCrawl(
      { q: 'flutter', countries: ['ALL' as any] },
      { page: 1, limit: 10 }
    );

    expect(report.mode).toBe('CUSTOM');
    expect(report.jobs.length).toBeGreaterThan(0);
    report.jobs.forEach((j) => {
      const fullText = `${j.title} ${j.company} ${j.description}`.toLowerCase();
      expect(fullText.includes('flutter')).toBe(true);
    });
  });

  // TEST 3: Custom Search for non-matching role ("painter")
  it('TEST 3: should not return software jobs when searching for "painter"', async () => {
    const report = await engine.executeParallelCrawl(
      { q: 'painter', countries: ['ALL' as any] },
      { page: 1, limit: 10 }
    );

    expect(report.mode).toBe('CUSTOM');
    expect(report.totalScrapedRaw).toBe(0);
    expect(report.jobs).toEqual([]);
  });

  // TEST 4: Country specific search for "flutter" (Australia)
  it('TEST 4: should filter jobs strictly by Australia when AU is selected for "flutter"', async () => {
    const report = await engine.executeParallelCrawl(
      { q: 'flutter', countries: ['AU'] },
      { page: 1, limit: 10 }
    );

    expect(report.jobs.length).toBeGreaterThan(0);
    report.jobs.forEach((job) => {
      expect(job.country).toBe('AU');
    });
  });

  // TEST 5: Country specific search for "flutter" (Canada)
  it('TEST 5: should filter jobs strictly by Canada when CA is selected for "flutter"', async () => {
    const report = await engine.executeParallelCrawl(
      { q: 'flutter', countries: ['CA'] },
      { page: 1, limit: 10 }
    );

    expect(report.jobs.length).toBeGreaterThan(0);
    report.jobs.forEach((job) => {
      expect(job.country).toBe('CA');
    });
  });

  // TEST 6: Country specific search for "flutter" (Germany)
  it('TEST 6: should filter jobs strictly by Germany when DE is selected for "flutter"', async () => {
    const report = await engine.executeParallelCrawl(
      { q: 'flutter', countries: ['DE'] },
      { page: 1, limit: 10 }
    );

    expect(report.jobs.length).toBeGreaterThan(0);
    report.jobs.forEach((job) => {
      expect(job.country).toBe('DE');
    });
  });

  // TEST 7: Visa Sponsorship Only
  it('TEST 7: should filter jobs strictly for visa sponsorship when visaOnly is true', async () => {
    const report = await engine.executeParallelCrawl(
      { q: 'flutter', countries: ['ALL' as any], visaOnly: true },
      { page: 1, limit: 10 }
    );

    expect(report.jobs.length).toBeGreaterThan(0);
    report.jobs.forEach((job) => {
      expect(job.visaSponsorship).toBe(true);
    });
  });

  // TEST 8: Zero results response contract
  it('TEST 8: should return empty jobs array when zero matches found', async () => {
    const report = await engine.executeParallelCrawl(
      { q: 'nonexistentunlikelyjobtitle99', countries: ['ALL' as any] },
      { page: 1, limit: 10 }
    );

    expect(report.jobs).toEqual([]);
    expect(report.totalScrapedRaw).toBe(0);
  });
});
