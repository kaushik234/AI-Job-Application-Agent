import { ApifyProvider } from '../providers/ApifyProvider';
import { SeekProvider } from '../providers/SeekProvider';
import { LinkedInProvider } from '../providers/LinkedInProvider';
import { IndeedProvider } from '../providers/IndeedProvider';
import { JobService } from '../../modules/job/job.service';
import { jobScraperEngine } from '../JobScraperEngine';

describe('Backend 500 Error & Provider Error Isolation Regression Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('PHASE 10.1: Missing APIFY_API_TOKEN returns AUTH_REQUIRED status and does NOT throw', async () => {
    delete process.env.APIFY_API_TOKEN;
    const provider = new ApifyProvider();
    const result = await provider.search({ userQuery: 'flutter' });
    expect(result).toHaveProperty('outcomeStatus', 'AUTH_REQUIRED');
    expect(result.jobs).toEqual([]);
    expect(result.message).toContain('Missing APIFY_API_TOKEN');
  });

  test('PHASE 10.2: Missing Seek credentials returns AUTH_REQUIRED status and does NOT throw', async () => {
    delete process.env.SEEK_API_KEY;
    const provider = new SeekProvider();
    const result = await provider.search({ userQuery: 'flutter' });
    expect(result).toHaveProperty('outcomeStatus', 'AUTH_REQUIRED');
    expect(result.jobs).toEqual([]);
  });

  test('PHASE 10.3: Missing LinkedIn credentials returns AUTH_REQUIRED status and does NOT throw', async () => {
    delete process.env.LINKEDIN_API_KEY;
    const provider = new LinkedInProvider();
    const result = await provider.search({ userQuery: 'flutter' });
    expect(result).toHaveProperty('outcomeStatus', 'AUTH_REQUIRED');
    expect(result.jobs).toEqual([]);
  });

  test('PHASE 10.4: Missing Indeed credentials returns AUTH_REQUIRED status and does NOT throw', async () => {
    delete process.env.INDEED_PUBLISHER_ID;
    const provider = new IndeedProvider();
    const result = await provider.search({ userQuery: 'flutter' });
    expect(result).toHaveProperty('outcomeStatus', 'AUTH_REQUIRED');
    expect(result.jobs).toEqual([]);
  });

  test('PHASE 10.5 & 10.6: One provider throwing or timing out does not crash complete discovery run', async () => {
    const mockFaultyProvider: any = {
      platform: 'FaultyProvider',
      name: 'FaultyProvider',
      supports: () => true,
      search: async () => {
        throw new Error('Simulated network timeout in faulty provider');
      },
    };

    const spy = jest.spyOn(jobScraperEngine as any, 'providers', 'get').mockReturnValue([
      new ApifyProvider(),
      mockFaultyProvider,
    ]);

    const report = await jobScraperEngine.executeParallelCrawl({ userQuery: 'flutter', countries: ['ALL'] });

    expect(report).toHaveProperty('mode');
    expect(report).toHaveProperty('debug');
    expect(report.providerBreakdown).toHaveProperty('FaultyProvider');
    expect(report.providerBreakdown['FaultyProvider'].status).toBe('FAILED');
    expect(report.jobs).toBeDefined();

    spy.mockRestore();
  });

  test('PHASE 10.7 & 10.8 & 10.9: triggerScrape returns success=true with jobs:[] when optional credentials missing', async () => {
    delete process.env.APIFY_API_TOKEN;
    delete process.env.SEEK_API_KEY;
    delete process.env.LINKEDIN_API_KEY;
    delete process.env.INDEED_PUBLISHER_ID;

    const jobService = new JobService();
    const response = await jobService.triggerScrape({ query: 'nonexistent-xyz-999', countries: ['ALL'] });

    expect(response.success).toBe(true);
    expect(response.source).toBe('LIVE_DISCOVERY');
    expect(response).toHaveProperty('discoveryRunId');
    expect(response).toHaveProperty('discoveredAt');
    expect(Array.isArray(response.jobs)).toBe(true);
  }, 15000);

  test('PHASE 10.10 & 10.11 & 10.12: Fresh discovery with zero jobs returns jobs: [] without historical DB fallback or demo jobs', async () => {
    const jobService = new JobService();
    const response = await jobService.triggerScrape({ query: 'nonexistent-technology-query-xyz-9999', countries: ['ALL'] });

    expect(response.success).toBe(true);
    expect(response.jobs).toEqual([]);
    expect(response.scrapedCount).toBe(0);
    const containsDemo = response.jobs.some((j: any) => j.id.includes('demo') || j.id.includes('vienna'));
    expect(containsDemo).toBe(false);
  }, 15000);
});
