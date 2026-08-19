/**
 * @file src/jobs/providers/ApifyProvider.ts
 * @description Real Job Provider implementation for Apify Web Scraping Actors and Datasets.
 * @architect Clean Architecture - Apify Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults, ProviderOutcomeStatus } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { normalizePostingDate } from '../utils/dateNormalizer';
import { jobVerificationService } from '../../services/JobVerificationService';
import axios from 'axios';

export class ApifyProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Apify';
  readonly rateLimitMs = 300;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);
      const apiToken = process.env.APIFY_API_TOKEN;
      const actorId = process.env.APIFY_ACTOR_ID || 'apify/web-scraper';

      if (!apiToken) {
        logger.info('SEARCH', `[JOB_SOURCE] Provider: Apify | Status: REQUIRES_API_KEY | Message: Missing APIFY_API_TOKEN environment variable`);
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: 'AUTH_REQUIRED',
          message: 'Missing APIFY_API_TOKEN environment variable. Apify integration requires valid API token.',
          diagnostics: {
            actorId,
            query: query.q || query.userQuery || query.keywords?.join(', '),
            authState: 'MISSING_API_TOKEN',
          },
        };
      }

      logger.info('SEARCH', `[JOB_SOURCE] Provider: Apify | Actor: ${actorId} | Query: ${query.keywords?.join(', ') || 'All'} | Started`);

      const qStr = (query.q || query.userQuery || query.keywords?.join(' ') || '').trim();
      const countryCode = (query.countries && query.countries.length > 0 && query.countries[0] !== 'ALL') ? query.countries[0] : 'WORLDWIDE';

      let rawItems: any[] = [];
      let outcomeStatus: ProviderOutcomeStatus = 'SUCCESS_ZERO_RESULTS';
      let message: string | undefined;

      try {
        // Run Apify actor sync or fetch dataset items via REST API
        const runUrl = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(apiToken)}&timeout=30`;
        const resp = await axios.post(
          runUrl,
          {
            searchQuery: qStr,
            country: countryCode,
            maxResults: limit,
          },
          {
            timeout: 32000,
            headers: { 'Content-Type': 'application/json' },
            validateStatus: (s) => s < 500,
          }
        );

        if (resp.status === 401 || resp.status === 403) {
          return {
            provider: this.platform,
            totalFound: 0,
            page,
            limit,
            jobs: [],
            outcomeStatus: 'AUTH_REQUIRED',
            message: 'Apify API token is unauthorized or expired.',
            diagnostics: { actorId, httpStatus: resp.status },
          };
        }

        if (resp.status >= 400) {
          return {
            provider: this.platform,
            totalFound: 0,
            page,
            limit,
            jobs: [],
            outcomeStatus: 'PROVIDER_ERROR',
            message: `Apify Actor returned HTTP error ${resp.status}`,
            diagnostics: { actorId, httpStatus: resp.status },
          };
        }

        if (Array.isArray(resp.data)) {
          rawItems = resp.data;
        } else if (resp.data && Array.isArray(resp.data.items)) {
          rawItems = resp.data.items;
        }
      } catch (err: any) {
        logger.warn('SEARCH', `[JOB_SOURCE] Apify API request failed: ${err.message}`);
        const isTimeout = err.code === 'ECONNABORTED' || (err.message || '').includes('timeout');
        return {
          provider: this.platform,
          totalFound: 0,
          page,
          limit,
          jobs: [],
          outcomeStatus: isTimeout ? 'TIMEOUT' : 'PROVIDER_ERROR',
          message: `Apify fetch failed: ${err.message}`,
          diagnostics: { actorId, error: err.message },
        };
      }

      // Dedicated Adapter & Strict Validation
      const validJobs: JobListing[] = [];
      let rejectedCount = 0;

      for (const item of rawItems) {
        const normalized = this.normalize(item);
        if (normalized) {
          validJobs.push(normalized);
        } else {
          rejectedCount++;
        }
      }

      let filtered = validJobs;

      if (!this.isWorldwideQuery(query) && query.countries && query.countries.length > 0) {
        filtered = filtered.filter((j) => query.countries!.includes(j.country));
      }

      if (query.keywords && query.keywords.length > 0) {
        const kw = query.keywords.map((k) => k.toLowerCase());
        const isExplicitUserSearch = !!(query.userQuery && query.userQuery.trim().length > 0);
        filtered = filtered.filter((job) => {
          const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
          if (isExplicitUserSearch) {
            return kw.some((k) => text.includes(k));
          }
          return (
            kw.some((k) => text.includes(k)) ||
            ['software', 'engineer', 'developer', 'architect', 'programmer', 'mobile', 'flutter', 'dart'].some((t) => text.includes(t))
          );
        });
      }

      const paginatedSlice = filtered.slice(offset, offset + limit);
      outcomeStatus = paginatedSlice.length > 0 ? 'SUCCESS_WITH_RESULTS' : 'SUCCESS_ZERO_RESULTS';

      return {
        provider: this.platform,
        totalFound: filtered.length,
        page,
        limit,
        jobs: paginatedSlice,
        outcomeStatus,
        message,
        diagnostics: {
          actorId,
          query: query.q || query.userQuery || query.keywords?.join(', '),
          rawJobsBeforeQueryFilter: rawItems.length,
          rawJobsAfterQueryFilter: validJobs.length,
          malformedRejectedCount: rejectedCount,
          filteredCount: filtered.length,
        },
      };
    });
  }

  /**
   * Dedicated Apify Item Adapter.
   * Rejects malformed records missing title, company, location, or job URL.
   * Preserves source transparency.
   */
  public normalize(raw: any): JobListing | null {
    if (!raw || typeof raw !== 'object') return null;

    const title = (raw.title || raw.jobTitle || raw.positionTitle || '').trim();
    const company = (raw.company || raw.companyName || raw.employer || '').trim();
    const rawUrl = (raw.url || raw.jobUrl || raw.link || raw.applyUrl || '').trim();
    const location = (raw.location || raw.locationName || raw.address || '').trim();
    const sourceJobId = String(raw.id || raw.jobId || '').trim();

    // Strict validation: Reject malformed records without title, company, location, ID, or valid URL
    if (!title || !company || !location || !sourceJobId || !rawUrl) {
      return null;
    }

    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      return null;
    }

    const sourceUrl = (raw.sourceUrl || raw.originUrl || rawUrl).trim();
    const canonicalCountry = jobVerificationService.deriveCanonicalCountry(location, 'UNKNOWN');
    const country = canonicalCountry.country as CountryCode;

    const desc = raw.description || raw.descriptionHtml || raw.snippet || '';
    const { isRemote, isHybrid } = this.detectWorkSetup(location, desc);
    const visaSponsorship = this.detectVisaSponsorship(desc);

    return {
      id: `apify-${sourceJobId}`,
      internalJobId: `internal-apify-${sourceJobId}`,
      sourceJobId,
      platform: this.platform,
      company,
      title,
      location,
      city: location.split(',')[0] || location,
      country,
      salaryText: raw.salary || raw.compensation || undefined,
      visaSponsorship,
      isRemote,
      isHybrid,
      url: rawUrl,
      originalUrl: sourceUrl,
      canonicalUrl: rawUrl,
      description: desc,
      requirements: Array.isArray(raw.skills) && raw.skills.length > 0 ? raw.skills : [],
      postedDate: normalizePostingDate(raw.postedDate || raw.publishedAt || raw.date) || '',
      postedAt: normalizePostingDate(raw.postedDate || raw.publishedAt || raw.date),
      createdAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      jobStatus: 'DISCOVERED',
      sourceVerified: false,
    };
  }
}
