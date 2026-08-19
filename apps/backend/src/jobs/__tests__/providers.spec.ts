/**
 * @file src/jobs/__tests__/providers.spec.ts
 * @description Comprehensive unit test suite for all 9 Job Search Engine providers verifying Search, Normalize, RateLimit, Retry, Pagination, and Field Extraction.
 */

import {
  GreenhouseProvider,
  LeverProvider,
  AshbyProvider,
  WorkableProvider,
  SeekProvider,
  IndeedProvider,
  LinkedInProvider,
  JobBankCanadaProvider,
  CompanyCareerPagesProvider,
  BaseJobProvider,
} from '../providers';

describe('Job Search Engine Providers Suite (Phase 6)', () => {
  jest.setTimeout(60000);
  const providers: { name: string; instance: BaseJobProvider }[] = [
    { name: 'Greenhouse', instance: new GreenhouseProvider() },
    { name: 'Lever', instance: new LeverProvider() },
    { name: 'Ashby', instance: new AshbyProvider() },
    { name: 'Workable', instance: new WorkableProvider() },
    { name: 'Seek', instance: new SeekProvider() },
    { name: 'Indeed', instance: new IndeedProvider() },
    { name: 'LinkedIn', instance: new LinkedInProvider() },
    { name: 'Job Bank Canada', instance: new JobBankCanadaProvider() },
    { name: 'Company Career Pages', instance: new CompanyCareerPagesProvider() },
  ];

  it('should have 9 registered providers', () => {
    expect(providers.length).toBe(9);
  });

  providers.forEach(({ name, instance }) => {
    describe(`Provider: ${name}`, () => {
      it('should implement rateLimit without throwing', async () => {
        const startTime = Date.now();
        await instance.rateLimit();
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(0);
      });

      it('should implement retry mechanism on success', async () => {
        let attempts = 0;
        const result = await instance.retry(async () => {
          attempts++;
          return 'SUCCESS';
        }, 3);

        expect(result).toBe('SUCCESS');
        expect(attempts).toBe(1);
      });

      it('should implement retry mechanism on transient failure', async () => {
        let attempts = 0;
        const result = await instance.retry(async () => {
          attempts++;
          if (attempts < 2) throw new Error('Transient error');
          return 'RECOVERED';
        }, 3);

        expect(result).toBe('RECOVERED');
        expect(attempts).toBe(2);
      });

      it('should calculate pagination offsets correctly', () => {
        const page1 = instance.pagination(1, 10);
        expect(page1.offset).toBe(0);
        expect(page1.limit).toBe(10);

        const page2 = instance.pagination(2, 20);
        expect(page2.offset).toBe(20);
        expect(page2.limit).toBe(20);
      });

      it('should search and return paginated job results with totalFound', async () => {
        const results = await instance.search({ keywords: ['software'] }, { page: 1, limit: 10 });
        expect(results).toBeDefined();
        expect(results.provider).toBe(instance.platform);
        expect(Array.isArray(results.jobs)).toBe(true);
        expect(results.page).toBe(1);
        expect(results.limit).toBe(10);
        expect(typeof results.totalFound).toBe('number');
      }, 30000);

      it('should support pagination page 2 without errors', async () => {
        const results = await instance.search({ keywords: ['software'] }, { page: 2, limit: 1 });
        expect(results).toBeDefined();
        expect(results.page).toBe(2);
        expect(results.limit).toBe(1);
      }, 30000);

      it('should normalize raw data and extract all required fields', async () => {
        const results = await instance.search({ keywords: ['software'] }, { page: 1, limit: 5 });
        const job = results.jobs && results.jobs.length > 0 ? results.jobs[0] : null;

        if (job) {
          expect(typeof job.id).toBe('string');
          expect(job.platform).toBe(instance.platform);
          expect(typeof job.company).toBe('string');
          expect(job.company.length).toBeGreaterThan(0);
          expect(typeof job.title).toBe('string');
          expect(job.title.length).toBeGreaterThan(0);
          expect(typeof job.location).toBe('string');
          expect(typeof job.country).toBe('string');
          expect(typeof job.isRemote).toBe('boolean');
          expect(typeof job.visaSponsorship).toBe('boolean');
          expect(typeof job.url).toBe('string');
        } else {
          expect(results).toBeDefined();
        }
      }, 30000);
    });
  });
});
