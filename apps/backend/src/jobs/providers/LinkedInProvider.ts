/**
 * @file src/jobs/providers/LinkedInProvider.ts
 * @description Job Provider implementation for LinkedIn Jobs.
 * @architect Clean Architecture - LinkedIn Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class LinkedInProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'LinkedIn';
  readonly rateLimitMs = 300;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit } = this.pagination(pagination?.page, pagination?.limit);
      const apiKey = process.env.LINKEDIN_API_KEY;

      if (!apiKey) {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: LinkedIn | Status: REQUIRES_API_KEY | Message: Missing LINKEDIN_API_KEY environment variable`);
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: 'AUTH_REQUIRED',
          message: 'Missing LINKEDIN_API_KEY environment variable. Direct portal API access requires licensed API key.',
          diagnostics: {
            query: query.q || query.userQuery || query.keywords?.join(', '),
            authState: 'MISSING_API_KEY',
          },
        };
      }

      // Live LinkedIn API call when credentials are configured
      try {
        const qStr = encodeURIComponent(query.q || query.userQuery || query.keywords?.join(' ') || '');
        const res = await fetch(`https://api.linkedin.com/v2/jobSearch?q=${qStr}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
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
            message: `LinkedIn API returned HTTP ${res.status}`,
          };
        }

        const data = await res.json();
        const rawResults = Array.isArray(data.elements) ? data.elements : [];
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
          message: `LinkedIn API fetch error: ${err.message}`,
        };
      }
    });
  }

  public normalize(raw: any): JobListing | null {
    if (!raw || !raw.title || !raw.companyName || !raw.jobId) return null;
    return {
      id: `li-${raw.jobId}`,
      platform: this.platform,
      company: raw.companyName,
      title: raw.title,
      location: raw.location || 'Worldwide',
      city: 'Unknown',
      country: 'US' as any,
      salaryText: undefined,
      visaSponsorship: false,
      isRemote: true,
      isHybrid: false,
      url: raw.link || `https://www.linkedin.com/jobs/view/${raw.jobId}`,
      description: raw.descriptionText || '',
      requirements: [],
      postedDate: raw.postedDate || '',
      createdAt: new Date().toISOString(),
    };
  }
}
