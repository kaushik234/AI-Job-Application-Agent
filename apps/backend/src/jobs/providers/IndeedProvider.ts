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
      const { page, limit } = this.pagination(pagination?.page, pagination?.limit);
      const publisherId = process.env.INDEED_PUBLISHER_ID;

      if (!publisherId) {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: Indeed | Status: REQUIRES_API_KEY | Message: Missing INDEED_PUBLISHER_ID environment variable`);
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: 'AUTH_REQUIRED',
          message: 'Missing INDEED_PUBLISHER_ID environment variable. Direct portal API access requires licensed publisher key.',
          diagnostics: {
            query: query.q || query.userQuery || query.keywords?.join(', '),
            authState: 'MISSING_PUBLISHER_ID',
          },
        };
      }

      // Live Indeed Publisher API call when credentials are configured
      try {
        const qStr = encodeURIComponent(query.q || query.userQuery || query.keywords?.join(' ') || '');
        const res = await fetch(`https://api.indeed.com/ads/apisearch?publisher=${publisherId}&q=${qStr}&v=2&format=json`, {
          signal: pagination?.signal,
        });

        if (!res.ok) {
          return {
            provider: this.platform,
            totalFound: 0,
            page,
            limit,
            jobs: [],
            outcomeStatus: 'PROVIDER_ERROR',
            message: `Indeed API returned HTTP ${res.status}`,
          };
        }

        const data = await res.json();
        const rawResults = Array.isArray(data.results) ? data.results : [];
        const normalized = rawResults.map((r: any) => this.normalize(r)).filter((j: any) => j !== null) as JobListing[];

        return {
          provider: this.platform,
          totalFound: normalized.length,
          page,
          limit,
          jobs: normalized.slice(0, limit),
          outcomeStatus: normalized.length > 0 ? 'SUCCESS_WITH_RESULTS' : 'SUCCESS_ZERO_RESULTS',
        };
      } catch (err: any) {
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: 'PROVIDER_ERROR',
          message: `Indeed API fetch error: ${err.message}`,
        };
      }
    });
  }

  public normalize(raw: any): JobListing | null {
    if (!raw || !raw.jobtitle || !raw.company || !raw.jobkey) return null;
    return {
      id: `indeed-${raw.jobkey}`,
      platform: this.platform,
      company: raw.company,
      title: raw.jobtitle,
      location: raw.formattedLocation || 'Worldwide',
      city: raw.city || 'Unknown',
      country: 'US' as any,
      salaryText: raw.salary || undefined,
      visaSponsorship: false,
      isRemote: true,
      isHybrid: false,
      url: raw.url || `https://www.indeed.com/viewjob?jk=${raw.jobkey}`,
      description: raw.snippet || '',
      requirements: [],
      postedDate: raw.date || '',
      createdAt: new Date().toISOString(),
    };
  }
}
