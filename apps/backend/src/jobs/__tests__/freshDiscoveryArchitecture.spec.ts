/**
 * @file src/jobs/__tests__/freshDiscoveryArchitecture.spec.ts
 * @description Unit & Integration test suite verifying Fresh Target Jobs Discovery Architecture, Zero Synthetic Jobs Policy, Single-Flight Request Coalescing, and Apify Provider Adapter.
 */

import { JobScraperEngine } from '../JobScraperEngine';
import { IndeedProvider } from '../providers/IndeedProvider';
import { LinkedInProvider } from '../providers/LinkedInProvider';
import { SeekProvider } from '../providers/SeekProvider';
import { ApifyProvider } from '../providers/ApifyProvider';
import { JobBankCanadaProvider } from '../providers/JobBankCanadaProvider';
import { CompanyCareerPagesProvider } from '../providers/CompanyCareerPagesProvider';
import { JobVerificationService } from '../../services/JobVerificationService';
import { JobService } from '../../modules/job/job.service';
import { runDatabaseCleanup } from '../../scripts/cleanupSyntheticJobs';

describe('Fresh Discovery Architecture & Zero Fake Jobs Suite', () => {
  let scraper: JobScraperEngine;

  jest.setTimeout(30000);

  beforeEach(() => {
    delete process.env.INDEED_PUBLISHER_ID;
    delete process.env.LINKEDIN_API_KEY;
    delete process.env.SEEK_API_KEY;
    delete process.env.APIFY_API_TOKEN;
    delete process.env.JOBBANK_API_KEY;
    scraper = new JobScraperEngine();
  });

  it('Requirement 1 & 2: Provider returns AUTH_REQUIRED with empty jobs when credentials missing', async () => {
    const indeed = new IndeedProvider();
    const linkedin = new LinkedInProvider();
    const seek = new SeekProvider();
    const apify = new ApifyProvider();
    const jobbank = new JobBankCanadaProvider();

    const indRes = await indeed.search({});
    expect(indRes.outcomeStatus).toBe('AUTH_REQUIRED');
    expect(indRes.jobs).toEqual([]);

    const liRes = await linkedin.search({});
    expect(liRes.outcomeStatus).toBe('AUTH_REQUIRED');
    expect(liRes.jobs).toEqual([]);

    const seekRes = await seek.search({});
    expect(seekRes.outcomeStatus).toBe('AUTH_REQUIRED');
    expect(seekRes.jobs).toEqual([]);

    const apifyRes = await apify.search({});
    expect(apifyRes.outcomeStatus).toBe('AUTH_REQUIRED');
    expect(apifyRes.jobs).toEqual([]);

    const jbRes = await jobbank.search({});
    expect(jbRes.outcomeStatus).toBe('AUTH_REQUIRED');
    expect(jbRes.jobs).toEqual([]);
  });

  it('Requirement 8 & 9: ApifyProvider adapter rejects malformed items missing title, company, or url', () => {
    const apify = new ApifyProvider();
    expect(apify.normalize(null)).toBeNull();
    expect(apify.normalize({})).toBeNull();
    expect(apify.normalize({ title: 'Engineer' })).toBeNull(); // missing company & url
    expect(apify.normalize({ title: 'Engineer', company: 'TechCorp' })).toBeNull(); // missing url
    expect(apify.normalize({ title: 'Engineer', company: 'TechCorp', url: 'invalid-url' })).toBeNull(); // non-http url

    const validRaw = {
      id: 'item-101',
      title: 'Flutter Developer',
      company: 'Canva',
      url: 'https://www.canva.com/careers/jobs/101',
      location: 'Sydney, Australia',
      description: 'Build mobile apps with Flutter and Dart.',
    };

    const normalized = apify.normalize(validRaw);
    expect(normalized).not.toBeNull();
    expect(normalized?.platform).toBe('Apify');
    expect(normalized?.title).toBe('Flutter Developer');
    expect(normalized?.company).toBe('Canva');
    expect(normalized?.url).toBe('https://www.canva.com/careers/jobs/101');
    expect(normalized?.country).toBe('AU');
  });

  it('Requirement 3 & 4: Zero DB dependence on fresh discovery - returns 0 jobs cleanly when no live match', async () => {
    const report = await scraper.executeParallelCrawl({
      userQuery: 'nonexistent-technology-xyz-999',
      q: 'nonexistent-technology-xyz-999',
      countries: ['ALL'],
    });

    expect(report.jobs).toBeDefined();
    expect(Array.isArray(report.jobs)).toBe(true);
    // If no provider returns verified live jobs matching this query, totalUniqueNew must be 0
    expect(report.totalUniqueNew).toBe(0);
    expect(report.jobs.length).toBe(0);
  });

  it('Requirement 5: Single-flight mechanism coalesces concurrent discovery requests for same parameters', async () => {
    const jobService = new JobService();
    const dto = { query: 'flutter', countries: ['AU'], visaOnly: true };

    const req1 = jobService.triggerScrape(dto as any);
    const req2 = jobService.triggerScrape(dto as any);

    const [res1, res2] = await Promise.all([req1, req2]);
    expect(res1).toBe(res2); // Same single-flight promise reference returned
  });

  it('Requirement 7: Canonical country filtering strictly enforces country code', () => {
    const verifier = new JobVerificationService();
    const auRes = verifier.deriveCanonicalCountry('Sydney, Australia', 'AU');
    expect(auRes.country).toBe('AU');
    expect(auRes.isVerified).toBe(true);

    const caRes = verifier.deriveCanonicalCountry('Toronto, ON, Canada', 'CA');
    expect(caRes.country).toBe('CA');
    expect(caRes.isVerified).toBe(true);

    const deRes = verifier.deriveCanonicalCountry('Berlin, Germany', 'DE');
    expect(deRes.country).toBe('DE');
    expect(deRes.isVerified).toBe(true);
  });

  it('Requirement 2: Database cleanup script runs without throwing and reports count', () => {
    const res = runDatabaseCleanup();
    expect(res.beforeCount).toBeGreaterThanOrEqual(0);
    expect(res.removedCount).toBeGreaterThanOrEqual(0);
    expect(res.remainingCount).toBeGreaterThanOrEqual(0);
  });
});
