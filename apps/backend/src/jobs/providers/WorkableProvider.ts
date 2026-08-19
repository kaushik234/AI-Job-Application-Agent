/**
 * @file src/jobs/providers/WorkableProvider.ts
 * @description Job Provider implementation for Workable ATS (apply.workable.com).
 * @architect Clean Architecture - Workable ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults, ProviderOutcomeStatus } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';
import { jobVerificationService } from '../../services/JobVerificationService';

const WORKABLE_ACCOUNTS = [
  '1password', 'cultureamp', 'employmenthero', 'safetyculture', 'eucalyptus',
  'linktree', 'octopusenergy', 'graphy', 'personio', 'hopin', 'skydio'
];

export class WorkableProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Workable';
  readonly rateLimitMs = 200;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);

      logger.info('SEARCH', `[JOB_SOURCE] Provider: Workable | Query: ${query.keywords?.join(', ') || 'All'} | Started`);

      const liveJobs: JobListing[] = [];
      let boardsAttempted = 0;
      let boardsSucceeded = 0;
      let boardsFailed = 0;
      let boardsTimedOut = 0;
      let boardsRateLimited = 0;

      boardsAttempted = WORKABLE_ACCOUNTS.length;
      await Promise.all(
        WORKABLE_ACCOUNTS.map(async (account) => {
          try {
            const signals = [AbortSignal.timeout(8000)];
            if (pagination?.signal) signals.push(pagination.signal);
            const res = await fetch(`https://apply.workable.com/api/v3/accounts/${account}/jobs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'User-Agent': 'Sentinel-Job-Agent/1.0' },
              body: JSON.stringify({ query: query.keywords?.join(' ') || '' }),
              signal: AbortSignal.any(signals),
            });

            if (res.status === 429) {
              boardsRateLimited++;
              boardsFailed++;
              return;
            }

            if (!res.ok) {
              boardsFailed++;
              return;
            }

            const data = await res.json();
            if (data && Array.isArray(data.results)) {
              boardsSucceeded++;
              for (const item of data.results) {
                const normalized = this.normalize(item, account);
                if (normalized) {
                  liveJobs.push(normalized);
                }
              }
            } else {
              boardsFailed++;
            }
          } catch (err: any) {
            boardsFailed++;
            if (err.name === 'AbortError' || (err.message || '').includes('timeout')) {
              boardsTimedOut++;
            }
            logger.warn('SEARCH', `[JOB_SOURCE] Workable API fetch failed for account ${account}: ${err.message}`);
          }
        })
      );

      const rawJobsBeforeQueryFilter = liveJobs.length;

      let filtered: JobListing[] = liveJobs;
      if (query.remoteOnly) {
        filtered = filtered.filter((j: JobListing) => j.isRemote);
      }
      if (query.visaOnly) {
        filtered = filtered.filter((j: JobListing) => j.visaSponsorship);
      }
      if (!this.isWorldwideQuery(query) && query.countries && query.countries.length > 0) {
        filtered = filtered.filter((j: JobListing) => query.countries!.includes(j.country));
      }
      if (query.keywords && query.keywords.length > 0) {
        const kwList = query.keywords.map((k) => k.toLowerCase().trim());
        const allTokens = Array.from(new Set(kwList.flatMap((k) => k.split(/\s+/)))).filter((t) => t.length > 2);
        filtered = filtered.filter((job: JobListing) => {
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
        if (boardsRateLimited > 0) {
          outcomeStatus = 'RATE_LIMITED';
          message = `${boardsRateLimited}/${boardsAttempted} Workable accounts rate limited (HTTP 429)`;
        } else if (boardsTimedOut > 0) {
          outcomeStatus = 'TIMEOUT';
          message = `All ${boardsAttempted} Workable account requests timed out`;
        } else {
          outcomeStatus = 'NETWORK_ERROR';
          message = `All ${boardsAttempted} Workable account requests failed`;
        }
      } else if (rawJobsAfterQueryFilter === 0) {
        if (boardsRateLimited > 0) {
          outcomeStatus = 'RATE_LIMITED';
          message = `${boardsRateLimited}/${boardsAttempted} Workable accounts rate limited (HTTP 429)`;
        } else if (boardsFailed > 0) {
          outcomeStatus = 'PARTIAL_RESULTS';
          message = `${boardsFailed}/${boardsAttempted} Workable accounts failed to respond`;
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
        boardsRateLimited,
        rawJobsBeforeQueryFilter,
        rawJobsAfterQueryFilter,
        message,
      };

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Workable | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${filtered.length} | Outcome: ${outcomeStatus}`
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

  public normalize(raw: any, account: string = '1password'): JobListing | null {
    if (!raw || typeof raw !== 'object') return null;

    const shortcode = raw.shortcode || raw.id;
    const title = (raw.title || '').trim();
    const company = (raw.company?.name || (account ? account.charAt(0).toUpperCase() + account.slice(1) : '')).trim();
    const location = (raw.location ? `${raw.location.city || ''}, ${raw.location.country || ''}`.replace(/^,\s*|,\s*$/g, '') : '').trim();
    const jobUrl = account && shortcode ? `https://apply.workable.com/${account}/j/${shortcode}/` : undefined;

    // Reject job if essential provider fields are missing (Problem 5: ZERO FAKE JOB DATA)
    if (!shortcode || !title || !company || !location || !jobUrl) {
      return null;
    }

    const canonicalCountry = jobVerificationService.deriveCanonicalCountry(location, raw.location?.countryCode || 'UNKNOWN');
    const country = canonicalCountry.country as CountryCode;

    const desc = raw.description || '';
    const { isRemote, isHybrid } = this.detectWorkSetup(location, desc);
    const visaSponsorship = this.detectVisaSponsorship(desc);

    const descLower = desc.toLowerCase();
    const techCandidates = ['flutter', 'react native', 'react', 'node.js', 'typescript', 'javascript', 'python', 'swift', 'kotlin', 'java', 'go', 'graphql', 'sql', 'aws'];
    const extractedReqs = techCandidates.filter((t) => descLower.includes(t)).map((t) => t.charAt(0).toUpperCase() + t.slice(1));

    return {
      id: `wk-${shortcode}`,
      platform: this.platform,
      company,
      title,
      location,
      city: raw.location?.city || location,
      country,
      salaryText: undefined,
      visaSponsorship,
      isRemote: raw.telecommute ?? isRemote,
      isHybrid,
      url: jobUrl,
      description: desc,
      requirements: Array.isArray(raw.requirements) && raw.requirements.length > 0 ? raw.requirements : extractedReqs,
      postedDate: normalizePostingDate(raw.published) || '',
      postedAt: normalizePostingDate(raw.published),
      createdAt: new Date().toISOString(),
    };
  }
}
