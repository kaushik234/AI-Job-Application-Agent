/**
 * @file src/jobs/JobScraperEngine.ts
 * @description Master Job Search Engine orchestrating parallel multi-provider live crawling across 9 ATS & job board platforms with deduplication and candidate resume matching.
 * @architect Clean Architecture - Data Acquisition & Crawling Layer
 */

import { JobListing, CountryCode, JobPlatform, MasterResume } from '@sentinel/types';
import { JobRepository } from '../repositories/JobRepository';
import {
  BaseJobProvider,
  JobSearchQuery,
  PaginationOptions,
  GreenhouseProvider,
  LeverProvider,
  AshbyProvider,
  WorkableProvider,
  SeekProvider,
  IndeedProvider,
  LinkedInProvider,
  JobBankCanadaProvider,
  CompanyCareerPagesProvider,
} from './providers';
import { deduplicateJobs } from './utils/deduplication';
import { deriveSearchQueriesFromResume } from './utils/queryGenerator';
import { calculateCandidateMatchScore } from './utils/resumeMatcher';
import { jobEvaluationService } from '../services/JobEvaluationService';
import { jobRankingService } from '../services/JobRankingService';
import { db } from '../database';
import { logger } from '@sentinel/shared';

export interface SearchEngineCrawlReport {
  mode: 'WORLDWIDE' | 'CUSTOM';
  totalScrapedRaw: number;
  totalUniqueNew: number;
  duplicatesFiltered: number;
  providersProcessed: number;
  providerBreakdown: Record<string, { scraped: number; status: string; message?: string }>;
  jobs: JobListing[];
}

export class JobScraperEngine {
  private providers: BaseJobProvider[];
  private jobRepo: JobRepository;

  constructor(jobRepo?: JobRepository) {
    this.jobRepo = jobRepo || new JobRepository();

    this.providers = [
      new GreenhouseProvider(),
      new LeverProvider(),
      new AshbyProvider(),
      new WorkableProvider(),
      new SeekProvider(),
      new IndeedProvider(),
      new LinkedInProvider(),
      new JobBankCanadaProvider(),
      new CompanyCareerPagesProvider(),
    ];
  }

  public getProviders(): BaseJobProvider[] {
    return this.providers;
  }

  /**
   * Executes parallel multi-platform live job crawl across providers using candidate resume
   */
  public async executeParallelCrawl(
    query: JobSearchQuery = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<SearchEngineCrawlReport> {
    const visaOnly = query.visaOnly === true;
    const remoteOnly = query.remoteOnly === true;

    // 1. Load candidate's active Master Resume
    let masterResume: MasterResume | null = null;
    try {
      masterResume = await db.getMasterResume();
    } catch (err) {
      // ignore
    }

    // 2. Derive resume-aware search queries
    const userRawQuery = query.q || query.userQuery || (query.keywords && query.keywords.length > 0 ? query.keywords[0] : undefined);
    const derived = deriveSearchQueriesFromResume(masterResume, userRawQuery);
    const mode: 'WORLDWIDE' | 'CUSTOM' = derived.userQuery ? 'CUSTOM' : 'WORLDWIDE';

    const isWorldwide = !query.countries || query.countries.length === 0 || query.countries.includes('ALL') || query.countries.includes('WORLDWIDE');
    const searchQuery: JobSearchQuery = {
      ...query,
      userQuery: derived.userQuery,
      visaOnly,
      remoteOnly,
      keywords: derived.keywords,
      countries: isWorldwide ? (['ALL'] as any) : query.countries,
    };

    // 3. Structured JOB_SCRAPE diagnostic logs
    const candidateName = masterResume?.fullName || 'Kaushik Khandala';
    const countriesLogStr = isWorldwide ? 'ALL' : query.countries!.join(', ');
    logger.info('SEARCH', `[JOB_SCRAPE] Starting scrape`);
    logger.info('SEARCH', `[JOB_SCRAPE] Query: ${derived.userQuery || 'None'}`);
    logger.info('SEARCH', `[JOB_SCRAPE] Worldwide: ${isWorldwide ? 'true' : 'false'}`);
    logger.info('SEARCH', `[JOB_SCRAPE] Mode: ${mode}`);
    logger.info('SEARCH', `[JOB_SCRAPE] Countries: ${countriesLogStr}`);
    logger.info('SEARCH', `[JOB_SCRAPE] Visa only: ${visaOnly ? 'true' : 'false'}`);
    logger.info('SEARCH', `[JOB_SCRAPE] Remote only: ${remoteOnly ? 'true' : 'false'}`);
    logger.info('SEARCH', `[JOB_SCRAPE] Resume: ${candidateName}`);

    const providerBreakdown: Record<string, { scraped: number; status: string; message?: string }> = {};

    // 4. Execute provider searches concurrently
    const searchPromises = this.providers.map(async (provider) => {
      try {
        const result = await provider.search(searchQuery, pagination);
        providerBreakdown[provider.platform] = { scraped: result.jobs.length, status: 'SUCCESS' };
        return result.jobs;
      } catch (err: any) {
        logger.error('ERROR', `Crawl failed for provider ${provider.platform}: ${err.message}`);
        providerBreakdown[provider.platform] = { scraped: 0, status: 'FAILED', message: err.message };
        return [] as JobListing[];
      }
    });

    const results = await Promise.allSettled(searchPromises);

    const rawJobs: JobListing[] = [];
    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        rawJobs.push(...res.value);
      }
    });

    // Provider audit logging
    Object.entries(providerBreakdown).forEach(([platform, data]) => {
      logger.info('SEARCH', `[JOB_SCRAPE] ${platform} raw jobs: ${data.scraped}`);
    });
    logger.info('SEARCH', `[JOB_SCRAPE] Total raw jobs: ${rawJobs.length}`);

    // Apply strict visaOnly, remoteOnly & country filtering to raw scraped jobs
    let filteredScrapedJobs = rawJobs;
    if (!isWorldwide && query.countries && query.countries.length > 0) {
      const initialCount = filteredScrapedJobs.length;
      filteredScrapedJobs = filteredScrapedJobs.filter((j) => query.countries!.includes(j.country));
      const removedByCountry = initialCount - filteredScrapedJobs.length;
      if (removedByCountry > 0) {
        logger.info('SEARCH', `[JOB_SCRAPE] Filtered ${removedByCountry} jobs because country mismatch (allowed: ${query.countries.join(', ')})`);
      }
    }
    if (visaOnly) {
      const initialCount = filteredScrapedJobs.length;
      filteredScrapedJobs = filteredScrapedJobs.filter((j) => j.visaSponsorship === true);
      const visaFilteredCount = initialCount - filteredScrapedJobs.length;
      if (visaFilteredCount > 0) {
        logger.info('SEARCH', `[JOB_SCRAPE] Filtered ${visaFilteredCount} jobs because visaSponsorship=false`);
      }
    }
    if (remoteOnly) {
      const initialCount = filteredScrapedJobs.length;
      filteredScrapedJobs = filteredScrapedJobs.filter((j) => j.isRemote === true);
      const remoteFilteredCount = initialCount - filteredScrapedJobs.length;
      if (remoteFilteredCount > 0) {
        logger.info('SEARCH', `[JOB_SCRAPE] Filtered ${remoteFilteredCount} jobs because remoteOnly=false`);
      }
    }

    logger.info('SEARCH', `[JOB_SCRAPE] After normalization: ${filteredScrapedJobs.length}`);

    if (filteredScrapedJobs.length === 0) {
      return {
        mode,
        totalScrapedRaw: rawJobs.length,
        totalUniqueNew: 0,
        duplicatesFiltered: 0,
        providersProcessed: this.providers.length,
        providerBreakdown,
        jobs: [],
      };
    }

    // 5. Deduplicate across platforms for current scrape
    const { jobDeduplicationService } = require('../services/JobDeduplicationService');
    const deduplicated = jobDeduplicationService.deduplicateJobs(filteredScrapedJobs);
    const duplicatesRemovedCount = filteredScrapedJobs.length - deduplicated.length;

    // 6. Calculate candidate AI ranking, visa status & application priority on deduplicated jobs
    const scoredRawJobs = jobRankingService.rankJobs(deduplicated, masterResume);

    // 7. Persist new unique jobs into database repository
    if (scoredRawJobs.length > 0) {
      await this.jobRepo.saveMany(scoredRawJobs);
    }

    // 8. Top 50 jobs ordered by priority and matchScore
    const top50Jobs = scoredRawJobs.slice(0, 50);

    logger.info('SEARCH', `[JOB_SCRAPE] After deduplication: ${scoredRawJobs.length - duplicatesRemovedCount}`);
    logger.info('SEARCH', `[JOB_SCRAPE] After resume matching: ${scoredRawJobs.length}`);
    logger.info('SEARCH', `[JOB_SCRAPE] After filters: ${top50Jobs.length}`);
    logger.info('SEARCH', `[JOB_SCRAPE] Returning: ${top50Jobs.length} jobs`);

    logger.success('SEARCH', 'Completed parallel job crawl & candidate resume matching', {
      mode,
      rawScraped: rawJobs.length,
      newUniqueSaved: scoredRawJobs.length,
      duplicatesFiltered: duplicatesRemovedCount,
      freshScrapeCount: top50Jobs.length,
    });

    return {
      mode,
      totalScrapedRaw: rawJobs.length,
      totalUniqueNew: scoredRawJobs.length,
      duplicatesFiltered: duplicatesRemovedCount,
      providersProcessed: this.providers.length,
      providerBreakdown,
      jobs: top50Jobs,
    };
  }

  public async searchJobs(query: JobSearchQuery): Promise<JobListing[]> {
    const report = await this.executeParallelCrawl(query);
    return report.jobs;
  }
}

export const jobScraperEngine = new JobScraperEngine();
