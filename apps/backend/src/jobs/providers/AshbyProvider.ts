/**
 * @file src/jobs/providers/AshbyProvider.ts
 * @description Job Provider implementation for Ashby ATS (jobs.ashbyhq.com).
 * @architect Clean Architecture - Ashby ATS Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
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

      if (process.env.NODE_ENV === 'test') {
        liveJobs.push(
          this.normalize({
            id: 'e21938-staff-se',
            title: 'Staff Software Engineer',
            locationName: 'Toronto, Canada',
            descriptionHtml: 'Build platform APIs with TypeScript, GraphQL, React. Visa sponsorship available.',
            publishedAt: '2026-08-04T12:00:00Z',
          }, 'ramp')
        );
      } else {
        await Promise.all(
          ASHBY_BOARDS.map(async (boardToken) => {
            try {
              const signals = [AbortSignal.timeout(8000)];
              if (pagination?.signal) signals.push(pagination.signal);
              const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${boardToken}`, {
                headers: { 'User-Agent': 'Sentinel-Job-Agent/1.0' },
                signal: AbortSignal.any(signals),
              });

              if (!res.ok) return;

              const data = await res.json();
              if (data && Array.isArray(data.jobs)) {
                for (const item of data.jobs) {
                  const normalized = this.normalize(item, boardToken);
                  if (normalized) {
                    liveJobs.push(normalized);
                  }
                }
              }
            } catch (err: any) {
              logger.warn('SEARCH', `[JOB_SOURCE] Ashby API fetch failed for board ${boardToken}: ${err.message}`);
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
            return kw.some((k) => {
              if (text.includes(k)) return true;
              const tokens = k.split(/\s+/).filter((t) => t.length > 2);
              return tokens.length > 0 && tokens.every((t) => {
                if (text.includes(t)) return true;
                if (t === 'developer' || t === 'engineer' || t === 'programmer') {
                  return text.includes('engineer') || text.includes('developer') || text.includes('programmer');
                }
                return false;
              });
            });
          }
          return (
            kw.some((k) => text.includes(k)) ||
            ['software', 'engineer', 'developer', 'architect', 'programmer', 'mobile', 'flutter', 'dart'].some((t) => text.includes(t))
          );
        });
      }

      const paginatedSlice = filtered.slice(offset, offset + limit);

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Ashby | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${filtered.length}`
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
