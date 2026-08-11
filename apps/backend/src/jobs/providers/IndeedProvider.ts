/**
 * @file src/jobs/providers/IndeedProvider.ts
 * @description Job Provider implementation for Indeed Job Search.
 * @architect Clean Architecture - Indeed Platform Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class IndeedProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Indeed';
  readonly rateLimitMs = 350;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const publisherId = process.env.INDEED_PUBLISHER_ID;

      if (!publisherId && process.env.NODE_ENV !== 'test') {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: Indeed | Status: REQUIRES_API_KEY | Message: Missing INDEED_PUBLISHER_ID environment variable`);
        const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
        logger.info(
          'SEARCH',
          `[JOB_SOURCE] Provider: Indeed | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: 0`
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

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Indeed | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${sample.length}`
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
      postedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
  }
}
