/**
 * @file src/jobs/JobScraperEngine.ts
 * @description Master Job Search Engine orchestrating parallel multi-provider live crawling across 9 ATS & job board platforms with deduplication and candidate resume matching.
 * @architect Clean Architecture - Data Acquisition & Crawling Layer
 */

import { JobListing, CountryCode, JobPlatform, MasterResume } from '@sentinel/types';
import { JobRepository } from '../repositories/JobRepository';
import { discoveryJobStore } from '../services/DiscoveryJobStore';
import {
  BaseJobProvider,
  JobSearchQuery,
  PaginationOptions,
  PaginatedJobResults,
  GreenhouseProvider,
  LeverProvider,
  AshbyProvider,
  WorkableProvider,
  SeekProvider,
  IndeedProvider,
  LinkedInProvider,
  JobBankCanadaProvider,
  CompanyCareerPagesProvider,
  ApifyProvider,
} from './providers';
import { deduplicateJobs } from './utils/deduplication';
import { deriveSearchQueriesFromResume } from './utils/queryGenerator';
import {
  calculateCandidateMatchScore,
  isRoleRelevant,
  checkRoleRelevanceDetails,
  deriveCandidateTargetProfile,
} from './utils/resumeMatcher';
import { jobEvaluationService } from '../services/JobEvaluationService';
import { jobRankingService } from '../services/JobRankingService';
import { db } from '../database';
import { logger } from '@sentinel/shared';
import { jobVerificationService } from '../services/JobVerificationService';
import { jobDeduplicationService } from '../services/JobDeduplicationService';

export interface SearchEngineCrawlReport {
  mode: 'WORLDWIDE' | 'CUSTOM';
  totalScrapedRaw: number;
  freshJobsReturned?: number;
  totalUniqueNew: number;
  duplicatesFiltered: number;
  providersProcessed: number;
  providerBreakdown: Record<
    string,
    {
      scraped: number;
      status: string;
      message?: string;
      diagnostics?: Record<string, any>;
    }
  >;
  rejectionStats: Record<string, number>;
  rejectionDiagnostics?: Array<{
    jobId: string;
    title: string;
    company: string;
    location: string;
    provider: string;
    query: string;
    stage: string;
    titleMatchScore?: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    rejectionReason: string;
  }>;
  debug: {
    queriesGenerated: string[];
    rawJobsCollected: number;
    afterQueryFilter: number;
    afterRoleRelevance: number;
    afterLocationFilter: number;
    afterVerification: number;
    finalJobs: number;
  };
  rejectionSamples: Array<{
    jobId: string;
    title: string;
    company: string;
    provider: string;
    stage: string;
    reason: string;
  }>;
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
      new ApifyProvider(),
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
    logger.info('SEARCH', `[SCRAPE_START] candidate=${candidateName}`);
    logger.info('SEARCH', `[SCRAPE_QUERY] query=${derived.userQuery || 'All'} countries=${countriesLogStr} visaOnly=${visaOnly} remoteOnly=${remoteOnly}`);

    const providerBreakdown: Record<string, { scraped: number; status: string; message?: string; diagnostics?: Record<string, any> }> = {};

    const pageLimit = pagination.limit || 50;
    const targetCollectionLimit = pagination.targetLimit || 150;
    const maxPagesSafetyLimit = pagination.maxPages || 10;

    const defaultMobileQueries = [
      'Flutter Developer',
      'Flutter Engineer',
      'Mobile Developer',
      'Mobile Engineer',
      'Software Engineer - Mobile',
      'Android Developer',
      'iOS Developer',
    ];

    const activeSubQueries = derived.userQuery
      ? Array.from(new Set([derived.userQuery, ...defaultMobileQueries]))
      : Array.from(new Set([...(derived.primaryQueries || []), ...defaultMobileQueries]));

    // 4. Execute provider searches concurrently with per-provider error isolation and 12s timeout safety
    const searchPromises = this.providers.map(async (provider) => {
      const controller = new AbortController();
      const timeoutMs = 12000;
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        logger.info('SEARCH', `[PROVIDER_START] provider=${provider.platform}`);
        const providerJobs: JobListing[] = [];
        const seenIds = new Set<string>();

        const currentSearchQuery: JobSearchQuery = {
          ...searchQuery,
          q: derived.userQuery || activeSubQueries[0],
          userQuery: derived.userQuery,
          keywords: activeSubQueries,
        };

        if (!provider.supports(currentSearchQuery)) {
          clearTimeout(timeoutId);
          return [] as JobListing[];
        }

        let currentPage = pagination.page || 1;
        let pagesFetched = 0;
        let lastResult: PaginatedJobResults | null = null;

        while (pagesFetched < maxPagesSafetyLimit && providerJobs.length < targetCollectionLimit) {
          if (controller.signal.aborted) break;

          logger.info('SEARCH', `[DISCOVERY_START] provider=${provider.platform} query="${activeSubQueries.join(', ')}" page=${currentPage}`);
          const result = await provider.search(currentSearchQuery, {
            page: currentPage,
            limit: pageLimit,
            signal: controller.signal,
          });
          lastResult = result;
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

        clearTimeout(timeoutId);

        let outcome = lastResult?.outcomeStatus || (providerJobs.length > 0 ? 'SUCCESS_WITH_RESULTS' : 'SUCCESS_ZERO_RESULTS');
        if (providerJobs.length > 0 && outcome === 'SUCCESS_ZERO_RESULTS') {
          outcome = 'SUCCESS_WITH_RESULTS';
        }

        const diagnostics = lastResult?.diagnostics || {
          query: activeSubQueries.join(', '),
          rawJobs: providerJobs.length,
        };

        logger.info(
          'SEARCH',
          `[PROVIDER_TRACE]\nprovider=${provider.platform}\nquery="${activeSubQueries.join(', ')}"\nrawJobs=${providerJobs.length}\nstatus=${outcome}\nmessage=${lastResult?.message || ''}`
        );

        providerBreakdown[provider.platform] = {
          scraped: providerJobs.length,
          status: outcome,
          message: lastResult?.message,
          diagnostics,
        };
        return providerJobs;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isTimeout = controller.signal.aborted || err.name === 'AbortError' || (err.message || '').includes('timeout') || (err.message || '').includes('12s limit');
        const errMessage = isTimeout ? 'Provider search request timeout (12s limit)' : (err.message || 'Provider failed');
        let outcome = 'FAILED';
        if (isTimeout) {
          outcome = 'TIMEOUT';
        } else if (errMessage.includes('ECONN') || errMessage.includes('network')) {
          outcome = 'NETWORK_ERROR';
        } else {
          outcome = 'PARSER_FAILED';
        }
        logger.warn('SEARCH', `[PROVIDER_ERROR] provider=${provider.platform} outcome=${outcome} error=${errMessage}`);
        providerBreakdown[provider.platform] = {
          scraped: 0,
          status: outcome,
          message: errMessage,
          diagnostics: { query: activeSubQueries.join(', '), error: errMessage },
        };
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

    logger.info('SEARCH', `[JOB_SCRAPE] Total raw jobs collected across ${activeSubQueries.length} queries: ${rawJobs.length}`);

    // 5. STEP 1: Deduplicate across queries & providers
    const deduplicated = jobDeduplicationService.deduplicateJobs(rawJobs);
    const duplicatesRemovedCount = rawJobs.length - deduplicated.length;

    const rejectionStats: Record<string, number> = {
      SOURCE_MISMATCH: 0,
      SEARCH_QUERY_MISMATCH: 0,
      COUNTRY_MISMATCH: 0,
      EXPIRED: 0,
      INVALID_URL: 0,
      TITLE_MISMATCH: 0,
      COMPANY_MISMATCH: 0,
      NOT_APPLYABLE: 0,
      ROLE_NOT_RELEVANT: 0,
      OTHER: 0,
    };

    const rejectionDiagnostics: Array<{
      jobId: string;
      title: string;
      company: string;
      location: string;
      provider: string;
      query: string;
      stage: string;
      titleMatchScore?: number;
      matchedKeywords: string[];
      missingKeywords: string[];
      rejectionReason: string;
    }> = [];

    const rejectionSamples: Array<{
      jobId: string;
      title: string;
      company: string;
      provider: string;
      stage: string;
      reason: string;
    }> = [];

    const logRejection = (job: JobListing, stage: string, reason: string, matchedKw: string[] = [], missingKw: string[] = [], titleScore?: number) => {
      const diag = {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        provider: job.platform,
        query: derived.userQuery || 'All',
        stage,
        titleMatchScore: titleScore ?? 1.0,
        matchedKeywords: matchedKw,
        missingKeywords: missingKw,
        rejectionReason: reason,
      };
      rejectionDiagnostics.push(diag);
      if (rejectionSamples.length < 20) {
        rejectionSamples.push({
          jobId: job.id,
          title: job.title,
          company: job.company,
          provider: job.platform,
          stage,
          reason,
        });
      }
      console.log(`[REJECTION_DIAGNOSTIC] ${JSON.stringify(diag, null, 2)}`);
    };

    // 6. STEP 2: Role Relevance Filter (Phase 2 & Task 4)
    const roleRelevantJobs: JobListing[] = [];
    for (const job of deduplicated) {
      const roleDiag = checkRoleRelevanceDetails(job, masterResume, derived.userQuery);
      if (roleDiag.isRelevant) {
        roleRelevantJobs.push(job);
      } else {
        rejectionStats.ROLE_NOT_RELEVANT++;
        logRejection(job, 'ROLE_NOT_RELEVANT', roleDiag.reason, roleDiag.matchedKeywords, roleDiag.missingKeywords);
      }
    }

    // 7. STEP 3: Country & Location Compatibility Filter (Phase 7 & Task 3)
    const countryFilteredJobs: JobListing[] = [];
    if (!isWorldwide && query.countries && query.countries.length > 0) {
      const allowedCountries = query.countries.map((c) => String(c).toUpperCase());
      for (const job of roleRelevantJobs) {
        const canonical = jobVerificationService.deriveCanonicalCountry(job.location, job.country);
        job.verifiedCountry = canonical.country as any;
        const isMatch = allowedCountries.includes(canonical.country.toUpperCase());
        if (isMatch) {
          countryFilteredJobs.push(job);
        } else {
          rejectionStats.COUNTRY_MISMATCH++;
          logRejection(
            job,
            'COUNTRY_MISMATCH',
            `Canonical country "${canonical.country}" derived from location "${job.location}" is not in allowed target countries [${allowedCountries.join(', ')}]`,
            [canonical.country],
            allowedCountries
          );
        }
      }
    } else {
      countryFilteredJobs.push(...roleRelevantJobs);
    }

    // 8. STEP 4: Live External Source Verification & Search Query Gate (Phase 6 & Task 6)
    const verifiedActiveJobs: JobListing[] = [];
    const userSearchTerm = (query.q || query.userQuery || '').trim();

    // Optimize verification speed: Verify top 30 candidate jobs in parallel chunks of 10
    const candidatesToVerify = countryFilteredJobs.slice(0, 30);
    const chunkSize = 10;

    for (let i = 0; i < candidatesToVerify.length; i += chunkSize) {
      const chunk = candidatesToVerify.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (job) => {
          try {
            const verifiedJob = await jobVerificationService.verifyJobListing(job, userSearchTerm);
            return { job, verifiedJob, error: null };
          } catch (err: any) {
            return { job, verifiedJob: null, error: err };
          }
        })
      );

      for (const res of chunkResults) {
        if (res.status === 'fulfilled' && res.value) {
          const { job, verifiedJob, error } = res.value;
          if (error) {
            rejectionStats.OTHER++;
            logRejection(job, 'VERIFICATION_ERROR', error.message);
          } else if (verifiedJob) {
            if (
              verifiedJob.sourceVerified === true &&
              verifiedJob.verificationStatus === 'ACTIVE' &&
              verifiedJob.jobIdentityVerified !== false
            ) {
              verifiedActiveJobs.push(verifiedJob);
            } else {
              const statusKey = String(verifiedJob.verificationStatus || 'OTHER');
              if (statusKey in rejectionStats) {
                rejectionStats[statusKey]++;
              } else {
                rejectionStats.OTHER++;
              }
              logRejection(
                job,
                statusKey,
                verifiedJob.verificationReason || `External verification failed with status ${verifiedJob.verificationStatus}`,
                [],
                [],
                (verifiedJob as any).titleMatchScore
              );
            }
          }
        }
      }
    }

    // 9. STEP 5: Candidate Matching & Ranking (Phase 4 & Task 3)
    const scoredRawJobs = jobRankingService.rankJobs(verifiedActiveJobs, masterResume);

    const debug = {
      queriesGenerated: activeSubQueries,
      rawJobsCollected: rawJobs.length,
      afterQueryFilter: deduplicated.length,
      afterRoleRelevance: roleRelevantJobs.length,
      afterLocationFilter: countryFilteredJobs.length,
      afterVerification: verifiedActiveJobs.length,
      finalJobs: scoredRawJobs.length,
    };

    console.log('[DISCOVERY_DEBUG_SUMMARY]', JSON.stringify(debug, null, 2));

    // 10. Store verified active jobs in Transient Discovery Store (NO database write)
    const discoveryRunId = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (scoredRawJobs.length > 0) {
      discoveryJobStore.saveJobs(scoredRawJobs, discoveryRunId);
    }

    // 8. Top 50 jobs ordered by priority and matchScore
    const top50Jobs = scoredRawJobs.slice(0, 50);

    logger.info('SEARCH', `[JOB_DEDUP] After deduplication: ${deduplicated.length}`);
    logger.info('SEARCH', `[ROLE_RELEVANCE] relevant=${roleRelevantJobs.length}/${deduplicated.length}`);
    logger.info('SEARCH', `[VERIFICATION] active=${verifiedActiveJobs.length}/${countryFilteredJobs.length}`);
    logger.info('SEARCH', `[RANKING] scored=${scoredRawJobs.length}`);
    logger.info('SEARCH', `[SCRAPE_COMPLETE] returned=${top50Jobs.length} (Transient stored, 0 DB writes)`);

    logger.success('SEARCH', 'Completed parallel job crawl & candidate resume matching', {
      mode,
      rawScraped: rawJobs.length,
      freshJobsReturned: scoredRawJobs.length,
      duplicatesFiltered: duplicatesRemovedCount,
      freshScrapeCount: top50Jobs.length,
    });

    return {
      mode,
      totalScrapedRaw: rawJobs.length,
      freshJobsReturned: scoredRawJobs.length,
      totalUniqueNew: scoredRawJobs.length,
      duplicatesFiltered: duplicatesRemovedCount,
      providersProcessed: this.providers.length,
      providerBreakdown,
      rejectionStats,
      rejectionDiagnostics,
      debug,
      rejectionSamples,
      jobs: top50Jobs,
    };
  }

  public async searchJobs(query: JobSearchQuery): Promise<JobListing[]> {
    const report = await this.executeParallelCrawl(query);
    return report.jobs;
  }
}

export const jobScraperEngine = new JobScraperEngine();
