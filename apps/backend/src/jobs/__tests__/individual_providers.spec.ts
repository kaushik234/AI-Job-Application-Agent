/**
 * @file src/jobs/__tests__/individual_providers.spec.ts
 * @description Unit & integration spec testing all 9 job providers individually:
 * 1. AshbyProvider
 * 2. GreenhouseProvider
 * 3. LeverProvider
 * 4. WorkableProvider
 * 5. SeekProvider
 * 6. IndeedProvider
 * 7. LinkedInProvider
 * 8. JobBankCanadaProvider
 * 9. CompanyCareerPagesProvider
 */

import {
  AshbyProvider,
  GreenhouseProvider,
  LeverProvider,
  WorkableProvider,
  SeekProvider,
  IndeedProvider,
  LinkedInProvider,
  JobBankCanadaProvider,
  CompanyCareerPagesProvider,
} from '../providers';
import { JobSearchQuery } from '../providers/BaseJobProvider';

describe('Individual Job Providers Spec Suite (All 9 Providers)', () => {
  const query: JobSearchQuery = {
    keywords: ['Flutter', 'Software'],
    countries: ['ALL'],
  };

  test('1. AshbyProvider executes and parses valid listings', async () => {
    const provider = new AshbyProvider();
    expect(provider.platform).toBe('Ashby');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
    for (const job of result.jobs) {
      expect(job.company).toBeDefined();
      expect(job.company.toLowerCase()).not.toBe('ashby');
      expect(job.url).toMatch(/^https:\/\/jobs\.ashbyhq\.com\//);
    }
  });

  test('2. GreenhouseProvider executes and parses valid listings', async () => {
    const provider = new GreenhouseProvider();
    expect(provider.platform).toBe('Greenhouse');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
    for (const job of result.jobs) {
      expect(job.company).toBeDefined();
      expect(job.url).toMatch(/^https:\/\/boards\.greenhouse\.io\//);
    }
  });

  test('3. LeverProvider executes and parses valid listings', async () => {
    const provider = new LeverProvider();
    expect(provider.platform).toBe('Lever');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
    for (const job of result.jobs) {
      expect(job.company).toBeDefined();
      expect(job.url).toMatch(/^https:\/\/jobs\.lever\.co\//);
    }
  });

  test('4. WorkableProvider executes and parses valid listings', async () => {
    const provider = new WorkableProvider();
    expect(provider.platform).toBe('Workable');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('5. SeekProvider executes safely', async () => {
    const provider = new SeekProvider();
    expect(provider.platform).toBe('Seek');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('6. IndeedProvider executes safely', async () => {
    const provider = new IndeedProvider();
    expect(provider.platform).toBe('Indeed');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('7. LinkedInProvider executes safely', async () => {
    const provider = new LinkedInProvider();
    expect(provider.platform).toBe('LinkedIn');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('8. JobBankCanadaProvider executes safely', async () => {
    const provider = new JobBankCanadaProvider();
    expect(provider.platform).toBe('Job Bank Canada');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('9. CompanyCareerPagesProvider executes safely', async () => {
    const provider = new CompanyCareerPagesProvider();
    expect(provider.platform).toBe('Company Career Page');
    const result = await provider.search(query);
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });
});
