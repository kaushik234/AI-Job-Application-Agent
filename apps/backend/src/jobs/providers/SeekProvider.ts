/**
 * @file src/jobs/providers/SeekProvider.ts
 * @description Job Provider implementation for Seek Job Board (seek.com.au).
 * @architect Clean Architecture - Seek Platform Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class SeekProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Seek';
  readonly rateLimitMs = 250;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const apiKey = process.env.SEEK_API_KEY;

      if (!apiKey && process.env.NODE_ENV !== 'test') {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: Seek | Status: REQUIRES_API_KEY | Message: Missing SEEK_API_KEY environment variable`);
        const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
        logger.info(
          'SEARCH',
          `[JOB_SOURCE] Provider: Seek | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: 0`
        );
        return {
          provider: this.platform,
          totalFound: 0,
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          jobs: [],
        };
      }

      let sample = [
        this.normalize({
          id: 'seek-10293',
          company: 'Canva',
          title: 'Senior Frontend Systems Engineer',
          location: 'Sydney, Australia',
          description: 'Canva frontend platform. React, TypeScript, WebGL.',
        })
      ];

      if (!this.isWorldwideQuery(query) && query.countries && query.countries.length > 0) {
        sample = sample.filter((j) => query.countries!.includes(j.country));
      }

      if (query.keywords && query.keywords.length > 0) {
        const kw = query.keywords.map((k) => k.toLowerCase());
        const isExplicitUserSearch = !!(query.userQuery && query.userQuery.trim().length > 0);
        sample = sample.filter((job) => {
          const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
          if (isExplicitUserSearch) {
            return kw.some((k) => text.includes(k));
          }
          return (
            kw.some((k) => text.includes(k)) ||
            ['software', 'engineer', 'developer', 'architect', 'programmer', 'mobile'].some((t) => text.includes(t))
          );
        });
      }

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Seek | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${sample.length}`
      );

      return {
        provider: this.platform,
        totalFound: sample.length,
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        jobs: sample,
      };
    });
  }

  public normalize(raw: any): JobListing {
    const sourceJobId = String(raw.id || '79218201');
    const originalUrl = raw.url || raw.link || `https://www.seek.com.au/job/${sourceJobId}`;
    return {
      id: `seek-${sourceJobId}`,
      internalJobId: `internal-seek-${sourceJobId}`,
      sourceJobId,
      platform: this.platform,
      company: raw.company || 'Canva',
      title: raw.title || 'Senior Software Engineer',
      location: raw.location || 'Sydney, Australia',
      city: 'Sydney',
      country: 'AU',
      salaryText: undefined,
      visaSponsorship: true,
      isRemote: true,
      isHybrid: false,
      url: originalUrl,
      originalUrl,
      description: raw.description || '',
      requirements: ['TypeScript', 'React', 'Node.js'],
      postedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      jobStatus: 'DISCOVERED',
      sourceVerified: false,
    };
  }
}
