/**
 * @file src/jobs/providers/CompanyCareerPagesProvider.ts
 * @description Job Provider implementation for direct company career pages and JSON-LD schema parsing.
 * @architect Clean Architecture - Career Pages Crawler Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class CompanyCareerPagesProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Company Career Page';
  readonly rateLimitMs = 300;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit } = this.pagination(pagination?.page, pagination?.limit);

      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Company Career Page | Status: SUCCESS_ZERO_RESULTS | Message: Direct career pages require explicit company target URL`
      );

      return {
        provider: this.platform,
        totalFound: 0,
        page,
        limit,
        jobs: [],
        outcomeStatus: 'SUCCESS_ZERO_RESULTS',
        message: 'Direct career pages require explicit company target URL',
        diagnostics: {
          query: query.q || query.userQuery || query.keywords?.join(', '),
        },
      };
    });
  }

  public normalize(raw: any): JobListing | null {
    if (!raw || !raw.title || !raw.company || !raw.canonicalUrl) return null;
    return {
      id: raw.id || `ccp-${Math.random().toString(36).substring(2, 9)}`,
      platform: this.platform,
      company: raw.company,
      title: raw.title,
      location: raw.location || 'Worldwide',
      city: 'Unknown',
      country: (raw.country || 'US') as CountryCode,
      salaryText: undefined,
      visaSponsorship: false,
      isRemote: true,
      isHybrid: false,
      url: raw.canonicalUrl,
      description: raw.description || '',
      requirements: [],
      postedDate: raw.publishedDate || '',
      createdAt: new Date().toISOString(),
    };
  }
}
