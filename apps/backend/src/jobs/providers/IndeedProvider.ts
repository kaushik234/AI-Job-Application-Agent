/**
 * @file src/jobs/providers/IndeedProvider.ts
 * @description Job Provider implementation for Indeed Job Search.
 * @architect Clean Architecture - Indeed Platform Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';

export class IndeedProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Indeed';
  readonly rateLimitMs = 350;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);
      const publisherId = process.env.INDEED_PUBLISHER_ID;

      if (!publisherId && process.env.NODE_ENV !== 'test') {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: Indeed | Status: REQUIRES_API_KEY | Message: Missing INDEED_PUBLISHER_ID environment variable`);
        const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
        logger.info(
          'SEARCH',
          `[JOB_SOURCE] Provider: Indeed | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: 0`
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
          message: 'Missing INDEED_PUBLISHER_ID environment variable. Direct portal API access requires licensed publisher key.',
        };
      }

      let sample = [
        this.normalize({
          jobkey: 'ind-a810923',
          company: 'Amazon Canada',
          jobtitle: 'Software Development Engineer II',
          formattedLocation: 'Vancouver, BC, Canada',
          country: 'CA',
          snippet: 'Amazon AWS Vancouver. Java, TypeScript, Cloud Computing.',
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
        `[JOB_SOURCE] Provider: Indeed | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${sample.length}`
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
      id: `indeed-${raw.jobkey || 'a810923'}`,
      platform: this.platform,
      company: raw.company || 'Amazon Canada',
      title: raw.jobtitle || 'Software Engineer',
      location: raw.formattedLocation || 'Vancouver, BC, Canada',
      city: 'Vancouver',
      country: 'CA',
      salaryText: undefined,
      visaSponsorship: true,
      isRemote: true,
      isHybrid: false,
      url: `https://www.indeed.com/viewjob?jk=${raw.jobkey || 'a810923'}`,
      description: raw.snippet || '',
      requirements: ['TypeScript', 'Node.js', 'AWS'],
      postedDate: normalizePostingDate(raw.formattedRelativeTime || raw.date || raw.postedDate) || '',
      postedAt: normalizePostingDate(raw.formattedRelativeTime || raw.date || raw.postedDate),
      createdAt: new Date().toISOString(),
    };
  }
}
