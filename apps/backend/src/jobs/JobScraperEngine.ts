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
} from './providers';
import { deduplicateJobs } from './utils/deduplication';
import { deriveSearchQueriesFromResume } from './utils/queryGenerator';
import {
  calculateCandidateMatchScore,
  isRoleRelevant,
  deriveCandidateTargetProfile,
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
    logger.info('SEARCH', `[SCRAPE_START] candidate=${candidateName}`);
    logger.info('SEARCH', `[SCRAPE_QUERY] query=${derived.userQuery || 'All'} countries=${countriesLogStr} visaOnly=${visaOnly} remoteOnly=${remoteOnly}`);

    const providerBreakdown: Record<string, { scraped: number; status: string; message?: string; diagnostics?: Record<string, any> }> = {};

    const pageLimit = pagination.limit || 50;
    const targetCollectionLimit = pagination.targetLimit || 150;
    const maxPagesSafetyLimit = pagination.maxPages || 10;

    const PRIMARY_DISCOVERY_QUERY_LIMIT = 5;

    const activeSubQueries = derived.userQuery
      ? [derived.userQuery]
      : (derived.primaryQueries && derived.primaryQueries.length > 0
          ? derived.primaryQueries.slice(0, PRIMARY_DISCOVERY_QUERY_LIMIT)
          : (derived.keywords || ['Software Engineer']).slice(0, PRIMARY_DISCOVERY_QUERY_LIMIT));

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
        let lastResult: PaginatedJobResults | null = null;

        for (const subQuery of activeSubQueries) {
          if (controller.signal.aborted) break;
          if (providerJobs.length >= targetCollectionLimit) break;

          const currentSearchQuery: JobSearchQuery = {
            ...searchQuery,
            q: subQuery,
            userQuery: subQuery,
            keywords: [subQuery],
          };

          if (!provider.supports(currentSearchQuery)) continue;

          let currentPage = pagination.page || 1;
          let pagesFetched = 0;

          while (pagesFetched < maxPagesSafetyLimit && providerJobs.length < targetCollectionLimit) {
            if (controller.signal.aborted) break;

            logger.info('SEARCH', `[DISCOVERY_START] provider=${provider.platform} query="${subQuery}" page=${currentPage}`);
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

            logger.info(
              'SEARCH',
              `[DISCOVERY_PROVIDER] provider=${provider.platform} query="${subQuery}" page=${currentPage} fetched=${result.jobs.length}`
            );

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

        logger.info(
          'SEARCH',
          `[DISCOVERY_RESPONSE] provider=${provider.platform} count=${providerJobs.length} outcome=${outcome}`
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

    // Provider audit logging
    Object.entries(providerBreakdown).forEach(([platform, data]) => {
      logger.info('SEARCH', `[JOB_SCRAPE] ${platform} raw jobs: ${data.scraped}`);
    });
    logger.info('SEARCH', `[JOB_SCRAPE] Total raw jobs: ${rawJobs.length}`);

    // 5. Deduplicate across platforms for current scrape
    const { jobDeduplicationService } = require('../services/JobDeduplicationService');
    const deduplicated = jobDeduplicationService.deduplicateJobs(rawJobs);
    const duplicatesRemovedCount = rawJobs.length - deduplicated.length;

    // 6. External verification of every deduplicated job
    logger.info(
      'SEARCH',
      `[JOB_VERIFICATION] Verifying ${deduplicated.length} deduplicated jobs before ranking/saving`
    );

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

    const verifiedActiveJobs: JobListing[] = [];

    for (const job of deduplicated) {
      try {
        const verifiedJob = await jobVerificationService.verifyJobListing(job, query.q || query.userQuery);

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
          logger.info(
            'SEARCH',
            `[JOB_VERIFICATION] Excluded ${job.company} - ${job.title}: ${verifiedJob.verificationReason || verifiedJob.verificationStatus}`
          );
        }
      } catch (err: any) {
        rejectionStats.OTHER++;
        logger.error(
          'ERROR',
          `[JOB_VERIFICATION] Failed for ${job.company} - ${job.title}: ${err.message}`
        );
      }
    }

    // 7. Post-verification Country Filter (Phase 7)
    let countryFilteredJobs = verifiedActiveJobs;
    if (!isWorldwide && query.countries && query.countries.length > 0) {
      const allowedCountries = query.countries;
      countryFilteredJobs = verifiedActiveJobs.filter((j) => {
        const match = allowedCountries.includes(j.country as any) || (j.verifiedCountry && allowedCountries.includes(j.verifiedCountry as any));
        if (!match) {
          rejectionStats.COUNTRY_MISMATCH++;
          logger.info('SEARCH', `[COUNTRY_FILTER] Excluded ${j.company} - ${j.title} (Location: ${j.location}, Verified Country: ${j.country}) because not in allowed countries [${allowedCountries.join(', ')}]`);
        }
        return match;
      });
    }

    // 8. Search Query Relevance Filter (Phase 1)
    let searchRelevantJobs = countryFilteredJobs;
    const userSearchTerm = (query.q || query.userQuery || '').trim();
    if (userSearchTerm && userSearchTerm !== 'ALL' && userSearchTerm !== 'WORLDWIDE') {
      searchRelevantJobs = countryFilteredJobs.filter((j) => {
        const rel = jobVerificationService.verifySearchQueryRelevance(j, userSearchTerm, j.detectedTitle || j.title, j.description);
        j.searchRelevance = rel;
        if (!rel.searchRelevanceVerified) {
          rejectionStats.SEARCH_QUERY_MISMATCH++;
          logger.info('SEARCH', `[SEARCH_RELEVANCE] Excluded ${j.company} - ${j.title}: ${rel.searchRelevanceReason}`);
          return false;
        }
        return true;
      });
    }

    console.log('[SCRAPE_TRACE] [3] VERIFICATION & RELEVANCE', {
      stage: 'VERIFICATION',
      rawCount: rawJobs.length,
      deduplicatedCount: deduplicated.length,
      verifiedActiveCount: verifiedActiveJobs.length,
      countryFilteredCount: countryFilteredJobs.length,
      searchRelevantCount: searchRelevantJobs.length,
      rejectionStats,
      jobIds: searchRelevantJobs.map((j) => j.id),
    });

    // 9. Filter verified + relevant jobs by candidate role relevance
    const roleRelevantJobs: JobListing[] = [];
    const candidateTarget = deriveCandidateTargetProfile(masterResume);

    for (const job of searchRelevantJobs) {
      const relevant = isRoleRelevant(job, masterResume, userSearchTerm);
      const ranking = jobRankingService.rankJob(job, masterResume);

      const decisionStr =
        job.sourceVerified === true &&
        job.verificationStatus === 'ACTIVE' &&
        relevant
          ? 'ACCEPT'
          : (!relevant ? 'REJECT_ROLE_NOT_RELEVANT' : `REJECT_${job.verificationStatus}`);

      logger.info(
        'SEARCH',
        `[JOB_DECISION]\ncompany=${job.company}\ntitle=${job.title}\nmode=${mode}\ndiscoveryQuery="${(job as any).discoveryQuery || ''}"\nuserQuery="${userSearchTerm}"\ncandidatePrimaryRole="${candidateTarget.primaryRoles.join(', ')}"\ncandidateCoreTechnologies="${candidateTarget.coreTechnologies.join(',')}"\nsearchRelevant=${job.searchRelevance?.searchRelevanceVerified ?? true}\nroleRelevant=${relevant}\nmatchedCoreSkills=${ranking.strengths.length}\nmissingCoreSkills="${ranking.missingSkills.join(',')}"\nverifiedCountry=${job.verifiedCountry || job.country}\napplyability=${job.applyabilityStatus || 'UNVERIFIED'}\nrecommendation=${ranking.recommendation}\nfinalDecision=${decisionStr}`
      );

      if (relevant) {
        roleRelevantJobs.push(job);
      } else {
        rejectionStats.ROLE_NOT_RELEVANT++;
        logger.info(
          'SEARCH',
          `[JOB_RELEVANCE] Excluded ${job.company} - ${job.title}: role is not relevant to candidate profile`
        );
      }
    }

    logger.info(
      'SEARCH',
      `[JOB_RELEVANCE] Relevant jobs: ${roleRelevantJobs.length}/${searchRelevantJobs.length}`,
    );

    // 10. Calculate candidate ranking only for verified + search-relevant + role-relevant jobs
    const scoredRawJobs = jobRankingService.rankJobs(
      roleRelevantJobs,
      masterResume,
    );

    console.log('[SCRAPE_TRACE] [4] RANKING', {
      stage: 'RANKING',
      jobsCount: scoredRawJobs.length,
      verifiedCount: verifiedActiveJobs.length,
      finalCount: scoredRawJobs.length,
      jobIds: scoredRawJobs.map((j) => j.id),
    });

    // 8. Persist only verified active jobs
    if (scoredRawJobs.length > 0) {
      await this.jobRepo.saveMany(scoredRawJobs);
      console.log('[SCRAPE_TRACE] [5] REPOSITORY INSERT', {
        stage: 'REPOSITORY_INSERT',
        insertedCount: scoredRawJobs.length,
        jobIds: scoredRawJobs.map((j) => j.id),
      });

      const repoVerification = await this.jobRepo.findJobs();
      console.log('[SCRAPE_TRACE] [6] REPOSITORY QUERY', {
        stage: 'REPOSITORY_QUERY',
        jobsCount: repoVerification.length,
        jobIds: repoVerification.filter((j) => scoredRawJobs.some((s) => s.id === j.id)).map((j) => j.id),
      });
    }

    // 8. Top 50 jobs ordered by priority and matchScore
    const top50Jobs = scoredRawJobs.slice(0, 50);

    logger.info('SEARCH', `[JOB_DEDUP] After deduplication: ${deduplicated.length}`);
    logger.info('SEARCH', `[VERIFICATION] active=${verifiedActiveJobs.length}/${deduplicated.length}`);
    logger.info('SEARCH', `[ROLE_RELEVANCE] relevant=${roleRelevantJobs.length}/${searchRelevantJobs.length}`);
    logger.info('SEARCH', `[RANKING] scored=${scoredRawJobs.length}`);
    logger.info('SEARCH', `[SCRAPE_COMPLETE] returned=${top50Jobs.length}`);

    console.log('[SCRAPE_TRACE] [2] DISCOVERY ENGINE RETURN', {
      stage: 'DISCOVERY_ENGINE_RETURN',
      jobsCount: top50Jobs.length,
      rawCount: rawJobs.length,
      totalUniqueNew: scoredRawJobs.length,
      providerBreakdown,
      jobIds: top50Jobs.map((j) => j.id),
    });

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
      rejectionStats,
      jobs: top50Jobs,
    };
  }

  public async searchJobs(query: JobSearchQuery): Promise<JobListing[]> {
    const report = await this.executeParallelCrawl(query);
    return report.jobs;
  }
}

export const jobScraperEngine = new JobScraperEngine();
