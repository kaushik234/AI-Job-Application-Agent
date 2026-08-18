/**
 * @file src/jobs/providers/JobBankCanadaProvider.ts
 * @description Job Provider implementation for Government of Canada Job Bank (jobbank.gc.ca).
 * @architect Clean Architecture - Job Bank Canada Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class JobBankCanadaProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Job Bank Canada';
  readonly rateLimitMs = 250;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit } = this.pagination(pagination?.page, pagination?.limit);
      const apiKey = process.env.JOBBANK_API_KEY;

      if (!apiKey) {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: Job Bank Canada | Status: REQUIRES_API_KEY | Message: Missing JOBBANK_API_KEY environment variable`);
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: 'AUTH_REQUIRED',
          message: 'Missing JOBBANK_API_KEY environment variable. Job Bank Canada portal requires licensed API key.',
          diagnostics: {
            query: query.q || query.userQuery || query.keywords?.join(', '),
            authState: 'MISSING_API_KEY',
          },
        };
      }

      // Live Job Bank API call when credentials configured
      try {
        const qStr = encodeURIComponent(query.q || query.userQuery || query.keywords?.join(' ') || '');
        const res = await fetch(`https://api.jobbank.gc.ca/v1/jobs/search?q=${qStr}`, {
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
            message: `Job Bank Canada API returned HTTP ${res.status}`,
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
          message: `Job Bank Canada API fetch error: ${err.message}`,
        };
      }
    });
  }

  public normalize(raw: any): JobListing | null {
    if (!raw || !raw.jobTitle || !raw.employerName || !raw.jobPostingId) return null;
    return {
      id: `jobbank-${raw.jobPostingId}`,
      platform: this.platform,
      company: raw.employerName,
      title: raw.jobTitle,
      location: raw.locationName || 'Canada',
      city: 'Unknown',
      country: 'CA' as CountryCode,
      salaryText: raw.salaryRange || undefined,
      visaSponsorship: !!raw.lmiaApproved,
      isRemote: true,
      isHybrid: false,
      url: raw.url || `https://www.jobbank.gc.ca/jobsearch/jobposting/${raw.jobPostingId}`,
      description: raw.jobSummaryText || '',
      requirements: [],
      postedDate: raw.datePosted || '',
      createdAt: new Date().toISOString(),
    };
  }
}
