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
      const { page, limit } = this.pagination(pagination?.page, pagination?.limit);
      const apiKey = process.env.SEEK_API_KEY;

      if (!apiKey) {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: Seek | Status: REQUIRES_API_KEY | Message: Missing SEEK_API_KEY environment variable`);
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: 'AUTH_REQUIRED',
          message: 'Missing SEEK_API_KEY environment variable. Seek portal requires API credentials.',
          diagnostics: {
            query: query.q || query.userQuery || query.keywords?.join(', '),
            authState: 'MISSING_API_KEY',
          },
        };
      }

      // Live Seek API call when credentials are configured
      try {
        const qStr = encodeURIComponent(query.q || query.userQuery || query.keywords?.join(' ') || '');
        const res = await fetch(`https://api.seek.com.au/v2/jobs/search?keywords=${qStr}`, {
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
            message: `Seek API returned HTTP ${res.status}`,
          };
        }

        const data = await res.json();
        const rawResults = Array.isArray(data.data) ? data.data : [];
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
          message: `Seek API fetch error: ${err.message}`,
        };
      }
    });
  }

  public normalize(raw: any): JobListing | null {
    if (!raw || !raw.title || !raw.company || !raw.id) return null;
    const sourceJobId = String(raw.id);
    const originalUrl = raw.url || `https://www.seek.com.au/job/${sourceJobId}`;
    return {
      id: `seek-${sourceJobId}`,
      internalJobId: `internal-seek-${sourceJobId}`,
      sourceJobId,
      platform: this.platform,
      company: raw.company,
      title: raw.title,
      location: raw.location || 'Australia',
      city: raw.city || 'Sydney',
      country: 'AU',
      salaryText: raw.salary || undefined,
      visaSponsorship: false,
      isRemote: true,
      isHybrid: false,
      url: originalUrl,
      originalUrl,
      description: raw.description || '',
      requirements: [],
      postedDate: raw.postedDate || '',
      createdAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      jobStatus: 'DISCOVERED',
      sourceVerified: false,
    };
  }
}
