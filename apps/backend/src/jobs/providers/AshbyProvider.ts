/**
 * @file src/jobs/providers/AshbyProvider.ts
 * @description Job Provider implementation for Ashby ATS (jobs.ashbyhq.com).
 * @architect Clean Architecture - Ashby ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults, ProviderOutcomeStatus } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';
import { jobVerificationService } from '../../services/JobVerificationService';

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

      let boardsRateLimited = 0;
      const batchRes = await this.fetchBatchedBoards(
        ASHBY_BOARDS,
        async (boardToken) => {
          const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${boardToken}`, {
            headers: { 'User-Agent': 'Sentinel-Job-Agent/1.0' },
          });

          if (res.status === 429) {
            boardsRateLimited++;
            return null;
          }
          if (!res.ok) return null;
          const data = await res.json();
          if (data && Array.isArray(data.jobs)) {
            const parsed: JobListing[] = [];
            for (const item of data.jobs) {
              const normalized = this.normalize(item, boardToken);
              if (normalized) {
                (normalized as any)._rawItem = item;
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
      if (filtered.length > 0) {
        filtered.forEach((job) => {
          logger.info('SEARCH', `[RAW_ASHBY_CANDIDATE] id=${job.id} company=${job.company} title="${job.title}" url=${job.url} descSnippet="${(job.description || '').substring(0, 100)}..."`);
        });
      }
      const paginatedSlice = filtered.slice(offset, offset + limit);

      let outcomeStatus: ProviderOutcomeStatus = 'SUCCESS_WITH_RESULTS';
      let message: string | undefined;

      if (boardsAttempted > 0 && boardsSucceeded === 0) {
        if (boardsRateLimited > 0) {
          outcomeStatus = 'RATE_LIMITED';
          message = `${boardsRateLimited}/${boardsAttempted} Ashby boards rate limited (HTTP 429)`;
        } else if (boardsTimedOut > 0) {
          outcomeStatus = 'TIMEOUT';
          message = `All ${boardsAttempted} Ashby board requests timed out`;
        } else {
          outcomeStatus = 'NETWORK_ERROR';
          message = `All ${boardsAttempted} Ashby board requests failed`;
        }
      } else if (rawJobsAfterQueryFilter === 0) {
        if (boardsRateLimited > 0) {
          outcomeStatus = 'RATE_LIMITED';
          message = `${boardsRateLimited}/${boardsAttempted} Ashby boards rate limited (HTTP 429)`;
        } else if (boardsFailed > 0) {
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

  public normalize(raw: any, boardToken: string = 'ramp'): JobListing | null {
    if (!raw || typeof raw !== 'object') return null;

    const rawId = raw.id;
    const title = (raw.title || '').trim();
    const company = (raw.company || (boardToken ? boardToken.charAt(0).toUpperCase() + boardToken.slice(1) : '')).trim();
    const location = (raw.locationName || raw.location || '').trim();
    const jobUrl = raw.jobUrl || (boardToken && rawId ? `https://jobs.ashbyhq.com/${boardToken}/${rawId}` : undefined);

    // Reject job if essential provider fields are missing (Problem 5: ZERO FAKE JOB DATA)
    if (!rawId || !title || !company || !location || !jobUrl) {
      return null;
    }

    const canonicalCountry = jobVerificationService.deriveCanonicalCountry(location, 'UNKNOWN');
    const country = canonicalCountry.country as CountryCode;

    const desc = raw.descriptionHtml ? raw.descriptionHtml.replace(/<[^>]*>?/gm, '') : raw.description || '';
    const { isRemote, isHybrid } = this.detectWorkSetup(location, desc);
    const visaSponsorship = this.detectVisaSponsorship(desc);

    // Extract genuine tech keywords from description if explicit requirements array is missing
    const descLower = desc.toLowerCase();
    const techCandidates = ['flutter', 'react native', 'react', 'node.js', 'typescript', 'javascript', 'python', 'swift', 'kotlin', 'java', 'go', 'graphql', 'sql', 'aws'];
    const extractedReqs = techCandidates.filter((t) => descLower.includes(t)).map((t) => t.charAt(0).toUpperCase() + t.slice(1));

    return {
      id: `ashby-${rawId}`,
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
      url: jobUrl,
      description: desc,
      requirements: Array.isArray(raw.requirements) && raw.requirements.length > 0 ? raw.requirements : extractedReqs,
      postedDate: normalizePostingDate(raw.publishedAt) || '',
      postedAt: normalizePostingDate(raw.publishedAt),
      createdAt: new Date().toISOString(),
    };
  }
}
