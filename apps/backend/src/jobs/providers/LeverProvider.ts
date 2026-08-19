/**
 * @file src/jobs/providers/LeverProvider.ts
 * @description Job Provider implementation for Lever ATS (jobs.lever.co).
 * @architect Clean Architecture - Lever ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults, ProviderOutcomeStatus } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';
import { jobVerificationService } from '../../services/JobVerificationService';

const LEVER_COMPANIES = [
  'atlassian', 'netflix', 'spotify', 'shopify', 'palantir', 'yelp', 'eventbrite', 'twitch',
  'datadog', 'sentry', 'postman', 'figma', 'linear', 'vercel', 'supabase', 'retool',
  'webflow', 'brex', 'lattice', 'rippling', 'zapier', 'scale', 'character', 'resend',
  'midjourney', 'cursor', 'replit'
];

export class LeverProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Lever';
  readonly rateLimitMs: number = 300;
  readonly maxRetries: number = 2;

  public async search(query: JobSearchQuery, pagination: PaginationOptions = {}): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { offset, limit, page } = this.pagination(pagination.page, pagination.limit);
      logger.info('SEARCH', `[JOB_SOURCE] Provider: Lever | Query: ${query.keywords?.join(', ') || 'All'} | Started`);

      const { items: allJobs, boardsAttempted, boardsSucceeded, boardsFailed, boardsTimedOut, boardsRateLimited } =
        await this.fetchBatchedBoards(
          LEVER_COMPANIES,
          async (companyToken) => {
            const url = `https://api.lever.co/v0/postings/${companyToken}?mode=json`;
            const resp = await fetch(url, { headers: { 'User-Agent': 'Sentinel-Job-Agent/1.0' } });
            if (!resp.ok) return null;
            const data = await resp.json();
            if (Array.isArray(data)) {
              const parsed: JobListing[] = [];
              data.forEach((item: any) => {
                const normalized = this.normalize(item, companyToken);
                if (normalized) {
                  parsed.push(normalized);
                }
              });
              return parsed;
            }
            return null;
          },
          8,
          4000
        );

      const rawJobsBeforeQueryFilter = allJobs.length;

      let filtered = allJobs;
      if (query.remoteOnly) {
        filtered = filtered.filter((j) => j.isRemote);
      }
      if (query.visaOnly) {
        filtered = filtered.filter((j) => j.visaSponsorship);
      }
      if (!this.isWorldwideQuery(query) && query.countries && query.countries.length > 0) {
        filtered = filtered.filter((j) => query.countries!.includes(j.country));
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
        if (boardsRateLimited > 0) {
          outcomeStatus = 'RATE_LIMITED';
          message = `${boardsRateLimited}/${boardsAttempted} Lever companies rate limited (HTTP 429)`;
        } else if (boardsTimedOut > 0) {
          outcomeStatus = 'TIMEOUT';
          message = `All ${boardsAttempted} Lever company requests timed out`;
        } else {
          outcomeStatus = 'NETWORK_ERROR';
          message = `All ${boardsAttempted} Lever company requests failed`;
        }
      } else if (rawJobsAfterQueryFilter === 0) {
        if (boardsRateLimited > 0) {
          outcomeStatus = 'RATE_LIMITED';
          message = `${boardsRateLimited}/${boardsAttempted} Lever companies rate limited (HTTP 429)`;
        } else if (boardsFailed > 0) {
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
        boardsRateLimited,
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

  public normalize(raw: any, companyToken: string = 'atlassian'): JobListing | null {
    if (!raw || typeof raw !== 'object') return null;

    const rawId = raw.id;
    const title = (raw.text || raw.title || '').trim();
    const company = (raw.company || (companyToken ? companyToken.charAt(0).toUpperCase() + companyToken.slice(1) : '')).trim();
    const location = (raw.categories?.location || raw.location || '').trim();
    const jobUrl = raw.hostedUrl || (companyToken && rawId ? `https://jobs.lever.co/${companyToken}/${rawId}` : undefined);

    // Reject job if essential provider fields are missing (Problem 5: ZERO FAKE JOB DATA)
    if (!rawId || !title || !company || !location || !jobUrl) {
      return null;
    }

    const canonicalCountry = jobVerificationService.deriveCanonicalCountry(location, 'UNKNOWN');
    const country = canonicalCountry.country as CountryCode;

    const desc = raw.descriptionPlain || raw.description || '';
    const { isRemote, isHybrid } = this.detectWorkSetup(location, desc);
    const visaSponsorship = this.detectVisaSponsorship(desc);

    const descLower = desc.toLowerCase();
    const techCandidates = ['flutter', 'react native', 'react', 'node.js', 'typescript', 'javascript', 'python', 'swift', 'kotlin', 'java', 'go', 'graphql', 'sql', 'aws'];
    const extractedReqs = techCandidates.filter((t) => descLower.includes(t)).map((t) => t.charAt(0).toUpperCase() + t.slice(1));

    return {
      id: `lever-${rawId}`,
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
      postedDate: normalizePostingDate(raw.createdAt) || '',
      postedAt: normalizePostingDate(raw.createdAt),
      createdAt: new Date().toISOString(),
    };
  }
}
