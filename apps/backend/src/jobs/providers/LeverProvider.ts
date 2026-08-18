/**
 * @file src/jobs/providers/LeverProvider.ts
 * @description Job Provider implementation for Lever ATS (jobs.lever.co).
 * @architect Clean Architecture - Lever ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults, ProviderOutcomeStatus } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';

const LEVER_COMPANIES = [
  'atlassian', 'netflix', 'shopify', 'spotify', 'palantir', 'uber', 'lyft', 'square',
  'block', 'reddit', 'pinterest', 'snap', 'discord', 'slack', 'zoom', 'dropbox', 'box',
  'zendesk', 'hubspot', 'freshworks', 'intercom', 'drift', 'gong', 'chorus', 'salesloft',
  'outreach', 'apollo'
];

export class LeverProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Lever';
  readonly rateLimitMs = 200;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);

      logger.info('SEARCH', `[JOB_SOURCE] Provider: Lever | Query: ${query.keywords?.join(', ') || 'All'} | Started`);

      const batchRes = await this.fetchBatchedBoards(
        LEVER_COMPANIES,
        async (companyToken) => {
          const res = await fetch(`https://api.lever.co/v0/postings/${companyToken}?mode=json`, {
            headers: { 'User-Agent': 'Sentinel-Job-Agent/1.0' },
          });

          if (!res.ok) return null;
          const data = await res.json();
          if (Array.isArray(data)) {
            const parsed: JobListing[] = [];
            for (const item of data) {
              const normalized = this.normalize(item, companyToken);
              if (normalized) {
                parsed.push(normalized);
              }
            }
            return parsed;
          }
          return null;
        },
        6,
        3500
      );

      const liveJobs = batchRes.items;
      const { boardsAttempted, boardsSucceeded, boardsFailed, boardsTimedOut } = batchRes;

      const rawJobsBeforeQueryFilter = liveJobs.length;
      let filtered = liveJobs;

      if (!this.isWorldwideQuery(query) && query.countries && query.countries.length > 0) {
        filtered = filtered.filter((j) => query.countries!.includes(j.country));
      }
      if (query.remoteOnly) {
        filtered = filtered.filter((j) => j.isRemote);
      }
      if (query.visaOnly) {
        filtered = filtered.filter((j) => j.visaSponsorship);
      }
      if (query.keywords && query.keywords.length > 0) {
        const kwList = query.keywords.map((k) => k.toLowerCase().trim());
        const allTokens = Array.from(new Set(kwList.flatMap((k) => k.split(/\s+/)))).filter((t) => t.length > 2);
        filtered = filtered.filter((job) => {
          const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
          const titleLower = (job.title || '').toLowerCase();
          if (kwList.some((k) => titleLower.includes(k) || text.includes(k))) return true;
          if (allTokens.some((t) => titleLower.includes(t) || text.includes(t))) return true;
          return ['software', 'engineer', 'developer', 'architect', 'programmer', 'mobile', 'flutter', 'dart', 'ios', 'android'].some((t) => titleLower.includes(t));
        });
      }

      const rawJobsAfterQueryFilter = filtered.length;
      const paginatedSlice = filtered.slice(offset, offset + limit);

      let outcomeStatus: ProviderOutcomeStatus = 'SUCCESS_WITH_RESULTS';
      let message: string | undefined;

      if (boardsAttempted > 0 && boardsSucceeded === 0) {
        if (boardsTimedOut > 0) {
          outcomeStatus = 'TIMEOUT';
          message = `All ${boardsAttempted} Lever company requests timed out`;
        } else {
          outcomeStatus = 'NETWORK_ERROR';
          message = `All ${boardsAttempted} Lever company requests failed`;
        }
      } else if (rawJobsAfterQueryFilter === 0) {
        if (boardsFailed > 0) {
          outcomeStatus = 'PARTIAL_RESULTS';
          message = `${boardsFailed}/${boardsAttempted} Lever companies failed to respond`;
        } else {
          outcomeStatus = 'SUCCESS_ZERO_RESULTS';
        }
      } else if (boardsFailed > 0) {
        outcomeStatus = 'PARTIAL_RESULTS';
      }

      const diagnostics = {
        query: query.q || query.userQuery || query.keywords?.join(', '),
        boardsAttempted,
        boardsSucceeded,
        boardsFailed,
        boardsTimedOut,
        rawJobsBeforeQueryFilter,
        rawJobsAfterQueryFilter,
        message,
      };

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Lever | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${filtered.length} | Outcome: ${outcomeStatus}`
      );
      logger.info(
        'SEARCH',
        `[JOB_PAGINATION]\nProvider: ${this.platform}\nPage: ${page}\nRequested: ${limit}\nReturned: ${paginatedSlice.length}\nTotalAvailable: ${filtered.length}`
      );

      return {
        provider: this.platform,
        totalFound: filtered.length,
        page,
        limit,
        jobs: paginatedSlice,
        outcomeStatus,
        message,
        diagnostics,
      };
    });
  }

  public normalize(raw: any, companyToken: string = 'atlassian'): JobListing {
    const title = raw.text || raw.title || 'Software Engineer';
    const company = raw.company || companyToken.charAt(0).toUpperCase() + companyToken.slice(1);
    const location = raw.categories?.location || raw.location || 'Sydney, Australia';

    let country: CountryCode = 'AU';
    const locLower = location.toLowerCase();
    if (locLower.includes('canada') || locLower.includes(', ca') || locLower.includes('toronto')) {
      country = 'CA';
    } else if (locLower.includes('germany') || locLower.includes(', de') || locLower.includes('berlin')) {
      country = 'DE';
    }

    const desc = raw.descriptionPlain || raw.description || '';
    const { isRemote, isHybrid } = this.detectWorkSetup(location, desc);
    const visaSponsorship = this.detectVisaSponsorship(desc);

    return {
      id: `lever-${raw.id || Math.random().toString(36).substring(2, 9)}`,
      platform: this.platform,
      company,
      title,
      location,
      city: location.split(',')[0] || location,
      country,
      salaryText: undefined,
      visaSponsorship,
      isRemote,
      isHybrid,
      url: raw.hostedUrl || `https://jobs.lever.co/${companyToken}/${raw.id || '930129'}`,
      description: desc,
      requirements: ['TypeScript', 'Node.js', 'PostgreSQL'],
      postedDate: normalizePostingDate(raw.createdAt) || '',
      postedAt: normalizePostingDate(raw.createdAt),
      createdAt: new Date().toISOString(),
    };
  }
}
