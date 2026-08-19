/**
 * @file src/jobs/providers/BaseJobProvider.ts
 * @description Abstract Base Class for Job Search Engine Providers implementing RateLimiting, Retries, Pagination, and Normalization.
 * @architect Clean Architecture - Provider Interface Pattern
 */

import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';

export interface JobSearchQuery {
  userQuery?: string;
  keywords?: string[];
  countries?: (CountryCode | string)[];
  minSalary?: number;
  remoteOnly?: boolean;
  visaOnly?: boolean;
  company?: string;
  q?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  targetLimit?: number;
  maxPages?: number;
  signal?: AbortSignal;
}

export type ProviderOutcomeStatus =
  | 'SUCCESS_WITH_RESULTS'
  | 'SUCCESS_ZERO_RESULTS'
  | 'PARTIAL_RESULTS'
  | 'BLOCKED'
  | 'RATE_LIMITED'
  | 'AUTH_REQUIRED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'PARSER_FAILED'
  | 'SOURCE_CHANGED'
  | 'UNSUPPORTED'
  | 'PROVIDER_ERROR';

export type ProviderFailureStage =
  | 'REQUEST'
  | 'AUTH'
  | 'HTTP'
  | 'REDIRECT'
  | 'PARSER'
  | 'NORMALIZATION'
  | 'COUNTRY_FILTER'
  | 'DEDUPLICATION'
  | 'VERIFICATION'
  | 'APPLYABILITY'
  | 'NONE';

export interface ProviderTelemetry {
  provider: JobPlatform;
  query: string;
  country: string;
  requestStartedAt?: string;
  requestFinishedAt?: string;
  requestUrl?: string;
  httpStatus?: number;
  finalUrl?: string;
  contentType?: string;
  responseBytes?: number;
  authenticationState?: 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'KEY_MISSING' | 'BLOCKED';
  rawCandidateCount: number;
  parsedCandidateCount: number;
  normalizedCandidateCount: number;
  deduplicatedCandidateCount: number;
  countryFilteredCount: number;
  identityVerificationCount: number;
  identityRejectedCount: number;
  applyabilityRejectedCount: number;
  finalCount: number;
  failureStage: ProviderFailureStage;
  failureReason?: string;
  outcomeStatus: ProviderOutcomeStatus;
}

export interface PaginatedJobResults {
  provider: JobPlatform;
  totalFound: number;
  page: number;
  limit: number;
  jobs: JobListing[];
  outcomeStatus?: ProviderOutcomeStatus;
  failureStage?: ProviderFailureStage;
  message?: string;
  telemetry?: ProviderTelemetry;
  diagnostics?: Record<string, any>;
}

export interface JobDiscoveryProvider {
  name: JobPlatform;
  searchJobs(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults>;
  supports(query: JobSearchQuery): boolean;
}

export abstract class BaseJobProvider implements JobDiscoveryProvider {
  abstract readonly platform: JobPlatform;
  abstract readonly rateLimitMs: number;
  abstract readonly maxRetries: number;

  public get name(): JobPlatform {
    return this.platform;
  }

  public supports(_query: JobSearchQuery): boolean {
    return true;
  }

  public async searchJobs(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.search(query, pagination);
  }

  private lastRequestTime: number = 0;

  /**
   * Enforces rate limiting between requests to protect scraping endpoints
   */
  public async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.rateLimitMs) {
      const delay = this.rateLimitMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Retries an async action with exponential backoff on transient errors
   */
  public async retry<T>(fn: () => Promise<T>, attempts: number = this.maxRetries): Promise<T> {
    let lastError: any;
    for (let i = 0; i < attempts; i++) {
      try {
        await this.rateLimit();
        return await fn();
      } catch (err) {
        lastError = err;
        const backoff = Math.pow(2, i) * 150 + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
    throw lastError || new Error(`Operation failed after ${attempts} retries on provider ${this.platform}`);
  }

  /**
   * Helper to compute standard offset and limits for pagination
   */
  public pagination(page: number = 1, limit: number = 50): { offset: number; limit: number; page: number } {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit || 50));
    const offset = (safePage - 1) * safeLimit;
    return { offset, limit: safeLimit, page: safePage };
  }

  /**
   * Helper to fetch multiple ATS board endpoints concurrently in controlled batches
   * with per-board timeout, error isolation, and graceful partial fallback.
   */
  protected async fetchBatchedBoards<T>(
    boardTokens: string[],
    fetchBoardFn: (boardToken: string) => Promise<T[] | null>,
    batchSize: number = 6,
    perBoardTimeoutMs: number = 4000
  ): Promise<{
    items: T[];
    boardsAttempted: number;
    boardsSucceeded: number;
    boardsFailed: number;
    boardsTimedOut: number;
    boardsRateLimited: number;
  }> {
    const items: T[] = [];
    const boardsAttempted = boardTokens.length;
    let boardsSucceeded = 0;
    let boardsFailed = 0;
    let boardsTimedOut = 0;
    let boardsRateLimited = 0;

    for (let i = 0; i < boardTokens.length; i += batchSize) {
      const chunk = boardTokens.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        chunk.map(async (token) => {
          let timeoutId: any;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Board request timeout')), perBoardTimeoutMs);
          });
          try {
            const res = await Promise.race([fetchBoardFn(token), timeoutPromise]);
            clearTimeout(timeoutId);
            return { token, res };
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        })
      );

      for (const res of results) {
        if (res.status === 'fulfilled' && Array.isArray(res.value?.res)) {
          boardsSucceeded++;
          items.push(...res.value.res);
        } else {
          boardsFailed++;
          const reason = res.status === 'rejected' ? String(res.reason?.message || res.reason) : '';
          if (reason.includes('429') || reason.toLowerCase().includes('rate limit')) {
            boardsRateLimited++;
          } else if (reason.toLowerCase().includes('timeout') || reason.toLowerCase().includes('abort')) {
            boardsTimedOut++;
          }
        }
      }
    }

    return {
      items,
      boardsAttempted,
      boardsSucceeded,
      boardsFailed,
      boardsTimedOut,
      boardsRateLimited,
    };
  }

  /**
   * Searches live or indexed job postings matching criteria
   */
  public abstract search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults>;

  /**
   * Normalizes raw API response objects into standardized JobListing entity
   */
  public abstract normalize(rawJobData: any): JobListing | null;

  /**
   * Shared helper to detect visa sponsorship keywords in description text
   */
  protected detectVisaSponsorship(text: string): boolean {
    const t = text.toLowerCase();
    return (
      t.includes('visa sponsorship') ||
      t.includes('sponsorship available') ||
      t.includes('relocation package') ||
      t.includes('relocation assistance') ||
      t.includes('lmia') ||
      t.includes('eu blue card') ||
      t.includes('work permit support') ||
      t.includes('visa support')
    );
  }

  /**
   * Shared helper to parse remote vs hybrid work setup
   */
  protected detectWorkSetup(locationText: string, descriptionText: string): { isRemote: boolean; isHybrid: boolean } {
    const combined = `${locationText} ${descriptionText}`.toLowerCase();
    const isRemote = combined.includes('remote') || combined.includes('work from home') || combined.includes('anywhere');
    const isHybrid = combined.includes('hybrid') || combined.includes('flexible days in office');
    return { isRemote, isHybrid };
  }

  /**
   * Helper to check if search query targets Worldwide/Global scope
   */
  protected isWorldwideQuery(query: JobSearchQuery): boolean {
    if (!query.countries || query.countries.length === 0) return true;
    return query.countries.some((c) => String(c).toUpperCase() === 'ALL' || String(c).toUpperCase() === 'WORLDWIDE');
  }
}
