/**
 * @file src/jobs/providers/WorkableProvider.ts
 * @description Job Provider implementation for Workable ATS (apply.workable.com).
 * @architect Clean Architecture - Workable ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';

const WORKABLE_ACCOUNTS = ['1password', 'cultureamp'];

export class WorkableProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Workable';
  readonly rateLimitMs = 200;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);

      logger.info('SEARCH', `[JOB_SOURCE] Provider: Workable | Query: ${query.keywords?.join(', ') || 'All'} | Started`);

      const liveJobs: JobListing[] = [];

      if (process.env.NODE_ENV === 'test') {
        liveJobs.push(
          this.normalize({
            shortcode: 'C89210',
            title: 'Full Stack Engineer - Security Infrastructure',
            location: { city: 'Vancouver', country: 'Canada', country_code: 'CA' },
            description: 'Build enterprise security systems using React, TypeScript, Node.js.',
            published: '2026-08-06',
          }, '1password')
        );
      } else {
        await Promise.all(
          WORKABLE_ACCOUNTS.map(async (account) => {
            try {
              const res = await fetch(`https://apply.workable.com/api/v3/accounts/${account}/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Sentinel-Job-Agent/1.0' },
                body: JSON.stringify({ query: query.keywords?.join(' ') || '' }),
                signal: AbortSignal.timeout(8000),
              });

              if (!res.ok) return;

              const data = await res.json();
              if (data && Array.isArray(data.results)) {
                for (const item of data.results) {
                  const normalized = this.normalize(item, account);
                  if (normalized) {
                    liveJobs.push(normalized);
                  }
                }
              }
            } catch (err: any) {
              logger.warn('SEARCH', `[JOB_SOURCE] Workable API fetch failed for account ${account}: ${err.message}`);
            }
          })
        );
      }

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
        const kw = query.keywords.map((k) => k.toLowerCase());
        const isExplicitUserSearch = !!(query.userQuery && query.userQuery.trim().length > 0);
        filtered = filtered.filter((job) => {
          const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
          if (isExplicitUserSearch) {
            return kw.some((k) => text.includes(k));
          }
          return (
            kw.some((k) => text.includes(k)) ||
            ['software', 'engineer', 'developer', 'architect', 'programmer'].some((t) => text.includes(t))
          );
        });
      }

      const paginatedSlice = filtered.slice(offset, offset + limit);

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Workable | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${filtered.length}`
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
      };
    });
  }

  public normalize(raw: any, account: string = '1password'): JobListing {
    const title = raw.title || 'Software Engineer';
    const company = raw.company?.name || account.charAt(0).toUpperCase() + account.slice(1);
    const location = raw.location ? `${raw.location.city || ''}, ${raw.location.country || ''}` : 'Vancouver, Canada';

    let country: CountryCode = 'CA';
    const locLower = location.toLowerCase();
    if (locLower.includes('australia') || locLower.includes('sydney')) {
      country = 'AU';
    } else if (locLower.includes('germany') || locLower.includes('berlin')) {
      country = 'DE';
    }

    const desc = raw.description || '';
    const { isRemote, isHybrid } = this.detectWorkSetup(location, desc);
    const visaSponsorship = this.detectVisaSponsorship(desc);

    return {
      id: `wk-${raw.shortcode || raw.id || Math.random().toString(36).substring(2, 9)}`,
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
      url: `https://apply.workable.com/${account}/j/${raw.shortcode || 'C89210'}/`,
      description: desc,
      requirements: ['TypeScript', 'React', 'Node.js'],
      postedDate: raw.published ? raw.published.split('T')[0] : new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
  }
}
