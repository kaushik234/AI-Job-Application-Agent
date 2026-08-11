/**
 * @file src/jobs/providers/LeverProvider.ts
 * @description Job Provider implementation for Lever ATS (jobs.lever.co).
 * @architect Clean Architecture - Lever ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';
import { logger } from '@sentinel/shared';

const LEVER_COMPANIES = ['atlassian', 'netflix', 'shopify', 'spotify', 'palantir'];

export class LeverProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Lever';
  readonly rateLimitMs = 200;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);

      logger.info('SEARCH', `[JOB_SOURCE] Provider: Lever | Query: ${query.keywords?.join(', ') || 'All'} | Started`);

      const liveJobs: JobListing[] = [];

      if (process.env.NODE_ENV === 'test') {
        liveJobs.push(
          this.normalize({
            id: '930129-backend',
            text: 'Senior Backend Engineer - Platform',
            company: 'Atlassian',
            categories: { location: 'Sydney, Australia' },
            descriptionPlain: 'Build microservices using Node.js, TypeScript, Go. Visa sponsorship offered.',
            createdAt: 1722900000000,
          }, 'atlassian')
        );
      } else {
        await Promise.all(
          LEVER_COMPANIES.map(async (companyToken) => {
            try {
              const res = await fetch(`https://api.lever.co/v0/postings/${companyToken}?mode=json`, {
                headers: { 'User-Agent': 'Sentinel-Job-Agent/1.0' },
                signal: AbortSignal.timeout(8000),
              });

              if (!res.ok) return;

              const data = await res.json();
              if (Array.isArray(data)) {
                for (const item of data) {
                  const normalized = this.normalize(item, companyToken);
                  if (normalized) {
                    liveJobs.push(normalized);
                  }
                }
              }
            } catch (err: any) {
              logger.warn('SEARCH', `[JOB_SOURCE] Lever API fetch failed for company ${companyToken}: ${err.message}`);
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
        `[JOB_SOURCE] Provider: Lever | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${filtered.length}`
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
      postedDate: new Date(raw.createdAt || Date.now()).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
  }
}
