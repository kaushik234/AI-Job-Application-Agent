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
}

export interface PaginatedJobResults {
  provider: JobPlatform;
  totalFound: number;
  page: number;
  limit: number;
  jobs: JobListing[];
}

export abstract class BaseJobProvider {
  abstract readonly platform: JobPlatform;
  abstract readonly rateLimitMs: number;
  abstract readonly maxRetries: number;

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
  public pagination(page: number = 1, limit: number = 10): { offset: number; limit: number; page: number } {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const offset = (safePage - 1) * safeLimit;
    return { offset, limit: safeLimit, page: safePage };
  }

  /**
   * Searches live or indexed job postings matching criteria
   */
  public abstract search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults>;

  /**
   * Normalizes raw API response objects into standardized JobListing entity
   */
  public abstract normalize(rawJobData: any): JobListing;

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
