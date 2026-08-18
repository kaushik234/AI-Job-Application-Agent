/**
 * @file src/jobs/providers/AshbyProvider.ts
 * @description Job Provider implementation for Ashby ATS (jobs.ashbyhq.com).
 * @architect Clean Architecture - Ashby ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults, ProviderOutcomeStatus } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';

const ASHBY_BOARDS = [
  'ramp', 'notion', 'linear', 'figma', 'vercel', 'supabase', 'retool', 'webflow',
  'postman', 'brex', 'lattice', 'rippling', 'zapier', 'scale', 'character', 'resend',
  'midjourney', 'pika', 'perplexity', 'mistral', 'cursor', 'replit', 'modal', 'fly',
  'railway', 'convex', 'clerk', 'sentry', 'datadog', 'axiom', 'openai'
];

export class AshbyProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Ashby';
  readonly rateLimitMs = 200;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);

      logger.info('SEARCH', `[JOB_SOURCE] Provider: Ashby | Query: ${query.keywords?.join(', ') || 'All'} | Started`);

      const liveJobs: JobListing[] = [];
      let boardsAttempted = 0;
      let boardsSucceeded = 0;
      let boardsFailed = 0;
      let boardsTimedOut = 0;
      let boardsRateLimited = 0;

        boardsAttempted = ASHBY_BOARDS.length;
        await Promise.all(
          ASHBY_BOARDS.map(async (boardToken) => {
            try {
              const signals = [AbortSignal.timeout(8000)];
              if (pagination?.signal) signals.push(pagination.signal);
              const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${boardToken}`, {
                headers: { 'User-Agent': 'Sentinel-Job-Agent/1.0' },
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
              if (data && Array.isArray(data.jobs)) {
                boardsSucceeded++;
                for (const item of data.jobs) {
                  const normalized = this.normalize(item, boardToken);
                  if (normalized) {
                    (normalized as any)._rawItem = item;
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
              logger.warn('SEARCH', `[JOB_SOURCE] Ashby API fetch failed for board ${boardToken}: ${err.message}`);
            }
          })
        );

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
      if (filtered.length > 0) {
        filtered.forEach((job) => {
          logger.info('SEARCH', `[RAW_ASHBY_CANDIDATE] id=${job.id} company=${job.company} title="${job.title}" url=${job.url} descSnippet="${(job.description || '').substring(0, 100)}..."`);
        });
      }
      const paginatedSlice = filtered.slice(offset, offset + limit);

      let outcomeStatus: ProviderOutcomeStatus = 'SUCCESS_WITH_RESULTS';
      let message: string | undefined;

      if (boardsAttempted > 0 && boardsSucceeded === 0) {
        if (boardsTimedOut > 0) {
          outcomeStatus = 'TIMEOUT';
          message = `All ${boardsAttempted} Ashby board requests timed out`;
        } else {
          outcomeStatus = 'NETWORK_ERROR';
          message = `All ${boardsAttempted} Ashby board requests failed`;
        }
      } else if (rawJobsAfterQueryFilter === 0) {
        if (boardsFailed > 0) {
          outcomeStatus = 'PARTIAL_RESULTS';
          message = `${boardsFailed}/${boardsAttempted} Ashby boards failed to respond`;
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
        `[JOB_SOURCE] Provider: Ashby | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${filtered.length} | Outcome: ${outcomeStatus}`
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

  public normalize(raw: any, boardToken: string = 'ramp'): JobListing {
    const title = raw.title || 'Software Engineer';
    const company = raw.company || boardToken.charAt(0).toUpperCase() + boardToken.slice(1);
    const location = raw.locationName || raw.location || 'Toronto, Canada';

    let country: CountryCode = 'CA';
    const locLower = location.toLowerCase();
    if (locLower.includes('australia') || locLower.includes('sydney')) {
      country = 'AU';
    } else if (locLower.includes('germany') || locLower.includes('berlin')) {
      country = 'DE';
    }

    const desc = raw.descriptionHtml ? raw.descriptionHtml.replace(/<[^>]*>?/gm, '') : raw.description || '';
    const { isRemote, isHybrid } = this.detectWorkSetup(location, desc);
    const visaSponsorship = this.detectVisaSponsorship(desc);

    return {
      id: `ashby-${raw.id || Math.random().toString(36).substring(2, 9)}`,
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
      url: raw.jobUrl || `https://jobs.ashbyhq.com/${boardToken}/${raw.id || 'e21938'}`,
      description: desc,
      requirements: ['TypeScript', 'GraphQL', 'React'],
      postedDate: normalizePostingDate(raw.publishedAt) || '',
      postedAt: normalizePostingDate(raw.publishedAt),
      createdAt: new Date().toISOString(),
    };
  }
}
