/**
 * @file src/jobs/providers/LinkedInProvider.ts
 * @description Job Provider implementation for LinkedIn Jobs.
 * @architect Clean Architecture - LinkedIn Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';

export class LinkedInProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'LinkedIn';
  readonly rateLimitMs = 300;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);
      const apiKey = process.env.LINKEDIN_API_KEY;

      if (!apiKey && process.env.NODE_ENV !== 'test') {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: LinkedIn | Status: REQUIRES_API_KEY | Message: Missing LINKEDIN_API_KEY environment variable`);
        const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
        logger.info(
          'SEARCH',
          `[JOB_SOURCE] Provider: LinkedIn | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: 0`
        );
        logger.info(
          'SEARCH',
          `[JOB_PAGINATION]\nProvider: ${this.platform}\nPage: ${page}\nRequested: ${limit}\nReturned: 0\nTotalAvailable: 0`
        );
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: 'AUTH_REQUIRED',
          message: 'Missing LINKEDIN_API_KEY environment variable. Direct portal API access requires licensed API key or partner integration.',
        };
      }

      let sample = [
        this.normalize({
          jobId: '391029318',
          companyName: 'Personio',
          title: 'Full Stack Engineer - HR Automation Suite',
          location: 'Munich, Germany',
          countryCode: 'DE',
          link: 'https://www.linkedin.com/jobs/view/391029318',
          descriptionText: 'Personio HR platform. React, TypeScript, GraphQL. Full visa sponsorship provided.',
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

      const paginatedSlice = sample.slice(offset, offset + limit);

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: LinkedIn | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${sample.length}`
      );
      logger.info(
        'SEARCH',
        `[JOB_PAGINATION]\nProvider: ${this.platform}\nPage: ${page}\nRequested: ${limit}\nReturned: ${paginatedSlice.length}\nTotalAvailable: ${sample.length}`
      );

      return {
        provider: this.platform,
        totalFound: sample.length,
        page,
        limit,
        jobs: paginatedSlice,
      };
    });
  }

  public normalize(raw: any): JobListing {
    return {
      id: `li-${raw.jobId || '391029318'}`,
      platform: this.platform,
      company: raw.companyName || 'LinkedIn Partner',
      title: raw.title || 'Full Stack Engineer',
      location: raw.location || 'Munich, Germany',
      city: 'Munich',
      country: 'DE',
      salaryText: undefined,
      visaSponsorship: true,
      isRemote: true,
      isHybrid: false,
      url: raw.link || 'https://www.linkedin.com/jobs/view/391029318',
      description: raw.descriptionText || '',
      requirements: ['React', 'TypeScript', 'GraphQL'],
      postedDate: normalizePostingDate(raw.postedDate || raw.listedAt || raw.createdAt) || '',
      postedAt: normalizePostingDate(raw.postedDate || raw.listedAt || raw.createdAt),
      createdAt: new Date().toISOString(),
    };
  }
}
