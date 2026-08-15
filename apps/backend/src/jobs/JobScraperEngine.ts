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
import {
  calculateCandidateMatchScore,
  isRoleRelevant,
} from './utils/resumeMatcher';
import { jobEvaluationService } from '../services/JobEvaluationService';
import { jobRankingService } from '../services/JobRankingService';
import { db } from '../database';
import { logger } from '@sentinel/shared';
import { jobVerificationService } from '../services/JobVerificationService';

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
    pagination: PaginationOptions = { page: 1, limit: 50 }
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

    const pageLimit = pagination.limit || 50;
    const targetCollectionLimit = pagination.targetLimit || 150;
    const maxPagesSafetyLimit = pagination.maxPages || 10;

    // 4. Execute provider searches concurrently with proper multi-page iteration
    const searchPromises = this.providers.map(async (provider) => {
      try {
        const providerJobs: JobListing[] = [];
        const seenIds = new Set<string>();
        let currentPage = pagination.page || 1;
        let pagesFetched = 0;

        while (pagesFetched < maxPagesSafetyLimit && providerJobs.length < targetCollectionLimit) {
          const result = await provider.search(searchQuery, { page: currentPage, limit: pageLimit });
          pagesFetched++;

          if (!result || !result.jobs || result.jobs.length === 0) {
            break;
          }

          for (const job of result.jobs) {
            const key = job.id || job.url;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              providerJobs.push(job);
            }
          }

          if (result.jobs.length < result.limit || (result.totalFound > 0 && currentPage * result.limit >= result.totalFound)) {
            break;
          }

          currentPage++;
        }

        logger.info(
          'SEARCH',
          `[JOB_COLLECTION]\nProvider: ${provider.platform}\nCollected: ${providerJobs.length}\nTarget: ${targetCollectionLimit}\nPagesFetched: ${pagesFetched}`
        );

        providerBreakdown[provider.platform] = { scraped: providerJobs.length, status: 'SUCCESS' };
        return providerJobs;
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

    // 6. Verify that every deduplicated job is still live and accessible
    logger.info(
      'SEARCH',
      `[JOB_VERIFICATION] Verifying ${deduplicated.length} deduplicated jobs before ranking/saving`
    );

    const verifiedJobs: JobListing[] = [];

    for (const job of deduplicated) {
      try {
        const verifiedJob = await jobVerificationService.verifyJobListing(job);

        if (
          verifiedJob.sourceVerified === true &&
          verifiedJob.verificationStatus === 'ACTIVE'
        ) {
          verifiedJobs.push(verifiedJob);
        } else {
          logger.info(
            'SEARCH',
            `[JOB_VERIFICATION] Excluded ${job.company} - ${job.title}: ${verifiedJob.verificationReason || verifiedJob.verificationStatus
            }`
          );
        }
      } catch (err: any) {
        logger.error(
          'ERROR',
          `[JOB_VERIFICATION] Failed for ${job.company} - ${job.title}: ${err.message}`
        );
      }
    }

    logger.info(
      'SEARCH',
      `[JOB_VERIFICATION] Active jobs: ${verifiedJobs.length}/${deduplicated.length}`
    );

    // 7. Filter verified jobs by actual career/role relevance
    const roleRelevantJobs: JobListing[] = [];

    for (const job of verifiedJobs) {
      const relevant = isRoleRelevant(job, masterResume);

      if (relevant) {
        roleRelevantJobs.push(job);
      } else {
        logger.info(
          'SEARCH',
          `[JOB_RELEVANCE] Excluded ${job.company} - ${job.title}: role is not relevant to candidate profile`,
        );
      }
    }

    logger.info(
      'SEARCH',
      `[JOB_RELEVANCE] Relevant jobs: ${roleRelevantJobs.length}/${verifiedJobs.length}`,
    );

    // 8. Calculate candidate ranking only for verified + relevant jobs
    const scoredRawJobs = jobRankingService.rankJobs(
      roleRelevantJobs,
      masterResume,
    );

    // 8. Persist only verified active jobs
    if (scoredRawJobs.length > 0) {
      await this.jobRepo.saveMany(scoredRawJobs);
    }

    // 8. Top 50 jobs ordered by priority and matchScore
    const top50Jobs = scoredRawJobs.slice(0, 50);

    logger.info(
        'SEARCH',
        `[JOB_DEDUP] After deduplication: ${deduplicated.length}`
      );
      logger.info(
        'SEARCH',
        `[JOB_VERIFICATION] After live verification: ${verifiedJobs.length}`
      );
      logger.info(
        'SEARCH',
        `[JOB_RELEVANCE] After relevance filtering: ${roleRelevantJobs.length}/${verifiedJobs.length}`
      );
      logger.info(
        'SEARCH',
        `[JOB_RANKING] After resume ranking: ${scoredRawJobs.length}`
      );
      logger.info(
        'SEARCH',
        `[JOB_SCRAPE] After top 50 selection: ${top50Jobs.length}`
      );
      logger.info(
        'SEARCH',
        `[JOB_SCRAPE] Returning: ${top50Jobs.length} jobs`
      );

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
