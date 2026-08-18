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
import { classifyFreshnessCategory } from './utils/dateNormalizer';

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
  discovery?: Record<
    string,
    {
      attempted: number;
      succeeded: number;
      failed: number;
      timedOut: number;
      jobs: number;
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
  discoveryRunId?: string;
  pipeline?: {
    rawJobsCollected: number;
    afterDeduplication: number;
    afterQueryFilter: number;
    afterRoleRelevance: number;
    afterLocationFilter: number;
    afterVerification: number;
    afterCandidateMatching: number;
    afterApplyDecision: number;
    roleRelevant: number;
    verifiedActive: number;
    recommended: number;
    consider: number;
    rejected: number;
    recommendedJobs: number;
    considerJobs: number;
    rejectedJobs: number;
    returned: number;
  };
  debug: {
    queriesGenerated: string[];
    queryExplanations?: any[];
    rawJobsCollected: number;
    afterQueryFilter: number;
    afterRoleRelevance: number;
    afterLocationFilter: number;
    afterVerification: number;
    afterCandidateMatching: number;
    afterApplyDecision: number;
    recommendedJobs?: number;
    considerJobs?: number;
    rejectedJobs?: number;
    finalJobs: number;
    pipeline: any;
    discovery: any;
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
  recommendedJobs: JobListing[];
  considerJobs: JobListing[];
  rejectedJobs: JobListing[];
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
    pagination: PaginationOptions = { page: 1, limit: 50 },
    discoveryRunId?: string
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

    const activeSubQueries = derived.userQuery
      ? [derived.userQuery]
      : (derived.keywords || []);

    if (activeSubQueries.length === 0) {
      logger.warn('SEARCH', '[SCRAPE_ABORTED] No candidate resume or keywords available to derive target discovery queries.');
      return {
        mode,
        discoveryRunId: discoveryRunId || `disc_${Date.now()}_empty`,
        totalScrapedRaw: 0,
        freshJobsReturned: 0,
        totalUniqueNew: 0,
        duplicatesFiltered: 0,
        providersProcessed: this.providers.length,
        providerBreakdown: {},
        rejectionStats: {},
        pipeline: {
          rawJobsCollected: 0,
          afterDeduplication: 0,
          afterQueryFilter: 0,
          afterRoleRelevance: 0,
          afterLocationFilter: 0,
          afterVerification: 0,
          afterCandidateMatching: 0,
          afterApplyDecision: 0,
          roleRelevant: 0,
          verifiedActive: 0,
          recommended: 0,
          consider: 0,
          rejected: 0,
          recommendedJobs: 0,
          considerJobs: 0,
          rejectedJobs: 0,
          returned: 0,
        },
        debug: {
          queriesGenerated: [],
          rawJobsCollected: 0,
          afterQueryFilter: 0,
          afterRoleRelevance: 0,
          afterLocationFilter: 0,
          afterVerification: 0,
          afterCandidateMatching: 0,
          afterApplyDecision: 0,
          recommendedJobs: 0,
          considerJobs: 0,
          rejectedJobs: 0,
          finalJobs: 0,
          pipeline: {},
          discovery: {},
        },
        rejectionSamples: [],
        jobs: [],
        recommendedJobs: [],
        considerJobs: [],
        rejectedJobs: [],
      };
    }

    // 4. Execute provider searches concurrently with per-provider error isolation and 12s timeout safety
    const searchPromises = this.providers.map(async (provider) => {
      const controller = new AbortController();
      const timeoutMs = 16000;
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
      STALE: 0,
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
      if (rejectionSamples.length < 10) {
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

    // 6. STEP 2: Search Query Relevance Filter (TASK 1)
    const userSearchTerm = (query.q || query.userQuery || '').trim();
    const queryFilteredJobs: JobListing[] = [];
    for (const job of deduplicated) {
      if (userSearchTerm) {
        const queryCheck = jobVerificationService.verifySearchQueryRelevance(job, userSearchTerm, job.title, job.description);
        if (queryCheck.searchRelevanceVerified) {
          queryFilteredJobs.push(job);
        } else {
          rejectionStats.SEARCH_QUERY_MISMATCH++;
          logRejection(job, 'SEARCH_QUERY_MISMATCH', queryCheck.searchRelevanceReason);
        }
      } else {
        queryFilteredJobs.push(job);
      }
    }

    // 7. STEP 3: Role Relevance Filter
    const roleRelevantJobs: JobListing[] = [];
    const targetProfile = deriveCandidateTargetProfile(masterResume);

    for (const job of queryFilteredJobs) {
      const roleDiag = checkRoleRelevanceDetails(job, masterResume, derived.userQuery);

      console.log('[ROLE_RELEVANCE]', JSON.stringify({
        job: `${job.company} - ${job.title}`,
        decision: roleDiag.isRelevant ? 'PASS' : 'REJECT',
        matchedRoleEvidence: roleDiag.matchedKeywords,
        matchedTechnologyEvidence: roleDiag.matchedKeywords,
        missingEvidence: roleDiag.missingKeywords,
        reason: roleDiag.reason,
      }, null, 2));

      if (roleDiag.isRelevant) {
        roleRelevantJobs.push(job);
      } else {
        rejectionStats.ROLE_NOT_RELEVANT++;
        logRejection(job, 'ROLE_NOT_RELEVANT', roleDiag.reason, roleDiag.matchedKeywords, roleDiag.missingKeywords);
      }
    }

    // 8. STEP 4: Country & Location Compatibility Filter
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

    // 9. STEP 5: Live External Source Verification & Search Query Gate
    const verifiedActiveJobs: JobListing[] = [];

    // Verify ALL candidate jobs in parallel chunks of 10
    const candidatesToVerify = countryFilteredJobs;
    const chunkSize = 10;

    for (let i = 0; i < candidatesToVerify.length; i += chunkSize) {
      const chunk = candidatesToVerify.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (job) => {
          try {
            const verifiedJob = await jobVerificationService.verifyJobListing(job, userSearchTerm, { isCustomUserQuery: !!derived.userQuery });
            return { job, verifiedJob, error: null };
          } catch (err: any) {
            return { job, verifiedJob: null, error: err };
          }
        })
      );

      for (const res of chunkResults) {
        if (res.status === 'fulfilled' && res.value) {
          const { job, verifiedJob, error } = res.value;

          console.log('[VERIFICATION]', JSON.stringify({
            job: `${job.company} - ${job.title}`,
            urlLive: verifiedJob?.sourceVerified ?? false,
            contentFetched: !!verifiedJob?.description,
            queryEvidence: verifiedJob?.searchRelevance?.searchQuery || userSearchTerm || 'WORLDWIDE',
            candidateProfileEvidence: targetProfile.primaryRoles.join(', '),
            decision: verifiedJob?.sourceVerified && verifiedJob.verificationStatus === 'ACTIVE' ? 'ACTIVE' : (verifiedJob?.verificationStatus || 'REJECTED'),
            reason: verifiedJob?.verificationReason || 'Verification check completed',
          }, null, 2));

          if (error) {
            rejectionStats.OTHER++;
            logRejection(job, 'VERIFICATION', error.message);
          } else if (verifiedJob) {
            const freshnessCat = classifyFreshnessCategory(verifiedJob.postedDate || verifiedJob.postedAt);
            verifiedJob.freshnessCategory = freshnessCat;

            if (
              verifiedJob.sourceVerified === true &&
              verifiedJob.verificationStatus === 'ACTIVE' &&
              verifiedJob.jobIdentityVerified !== false
            ) {
              verifiedActiveJobs.push(verifiedJob);
            } else {
              const statusKey = String(verifiedJob.verificationStatus || 'EXPIRED');
              rejectionStats[statusKey] = (rejectionStats[statusKey] || 0) + 1;
              logRejection(
                job,
                'VERIFICATION',
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

    // 10. STEP 6: Candidate Matching & Ranking
    const scoredRawJobs = jobRankingService.rankJobs(verifiedActiveJobs, masterResume);

    // 11. STEP 7: Application Decision & Categorization (Requirements 7, 8, 9)
    const recommendedJobs: JobListing[] = [];
    const considerJobs: JobListing[] = [];
    const rejectedJobs: JobListing[] = [];

    scoredRawJobs.forEach((job) => {
      const rec = (job.recommendation || (job as any).priorityCategory || '').toUpperCase();
      const matchScore = job.matchScore ?? 50;

      if (rec === 'DO_NOT_APPLY' || rec === 'SKIP') {
        job.applicationDecision = 'DO_NOT_APPLY' as any;
        rejectedJobs.push(job);
        logRejection(
          job,
          'APPLY_DECISION',
          `Job classified as DO_NOT_APPLY (Match score: ${matchScore}%).`,
          [],
          [],
          job.matchScore
        );
      } else if (matchScore >= 60 || rec === 'APPLY_NOW' || rec === 'TAILOR_AND_APPLY' || rec === 'HIGH_PRIORITY' || rec === 'GOOD_MATCH') {
        job.applicationDecision = 'APPLY' as any;
        recommendedJobs.push(job);
      } else if (matchScore >= 40 || rec === 'CONSIDER') {
        job.applicationDecision = 'CONSIDER' as any;
        considerJobs.push(job);
      } else {
        job.applicationDecision = 'DO_NOT_APPLY' as any;
        rejectedJobs.push(job);
        logRejection(
          job,
          'APPLY_DECISION',
          `Low overall candidate match score (${matchScore}%).`,
          [],
          [],
          job.matchScore
        );
      }
    });

    const qualifyingJobs = [...recommendedJobs, ...considerJobs];
    const initialReturnedJobs = qualifyingJobs.slice(0, 50);

    // Absolute zero-rejected-job safety filter
    const returnedJobs = initialReturnedJobs.filter((job) => {
      const dec = (job.applicationDecision || job.recommendation || '').toUpperCase();
      const status = (job.verificationStatus || job.jobStatus || '').toUpperCase();
      const isRejectedDecision = ['DO_NOT_APPLY', 'REJECTED', 'SKIP'].includes(dec);
      const isInvalidStatus = ['EXPIRED', 'INVALID_URL', 'SOURCE_MISMATCH', 'COUNTRY_MISMATCH', 'ROLE_NOT_RELEVANT', 'SEARCH_QUERY_MISMATCH', 'NOT_APPLYABLE'].includes(status);
      return !isRejectedDecision && !isInvalidStatus;
    });

    // Build discovery telemetry per provider
    const discoveryTelemetry: Record<string, any> = {};
    this.providers.forEach((p) => {
      const pKey = p.platform.toLowerCase();
      const pInfo = providerBreakdown[p.platform];
      const diag = pInfo?.diagnostics;

      discoveryTelemetry[pKey] = {
        attempted: diag?.attempted ?? 1,
        succeeded: diag?.succeeded ?? (pInfo?.scraped ? 1 : 0),
        failed: diag?.failed ?? (pInfo?.status === 'FAILED' || pInfo?.status === 'PARSER_FAILED' ? 1 : 0),
        timedOut: diag?.timedOut ?? (pInfo?.status === 'TIMEOUT' ? 1 : 0),
        jobs: pInfo?.scraped ?? 0,
      };
    });

    discoveryTelemetry.generatedQueries = derived.queryExplanations.map((e) => e.query);
    discoveryTelemetry.queryEvidence = derived.queryExplanations.map((e) => ({ query: e.query, source: e.source, evidence: e.evidence }));
    discoveryTelemetry.queryConfidence = derived.queryExplanations.map((e) => ({ query: e.query, confidence: e.confidence }));

    const pipeline = {
      rawJobsCollected: rawJobs.length,
      afterDeduplication: deduplicated.length,
      afterQueryFilter: queryFilteredJobs.length,
      afterRoleRelevance: roleRelevantJobs.length,
      afterLocationFilter: countryFilteredJobs.length,
      afterVerification: verifiedActiveJobs.length,
      afterCandidateMatching: scoredRawJobs.length,
      afterApplyDecision: qualifyingJobs.length,
      roleRelevant: roleRelevantJobs.length,
      verifiedActive: verifiedActiveJobs.length,
      recommended: recommendedJobs.length,
      consider: considerJobs.length,
      qualifying: qualifyingJobs.length,
      rejected: rejectedJobs.length,
      recommendedJobs: recommendedJobs.length,
      considerJobs: considerJobs.length,
      rejectedJobs: rejectedJobs.length,
      returned: returnedJobs.length,
      generatedQueries: derived.queryExplanations.map((e) => e.query),
      queryEvidence: derived.queryExplanations.map((e) => ({ query: e.query, source: e.source, evidence: e.evidence })),
      queryConfidence: derived.queryExplanations.map((e) => ({ query: e.query, confidence: e.confidence })),
    };

    const debug = {
      queriesGenerated: activeSubQueries,
      generatedQueries: derived.queryExplanations.map((e) => e.query),
      queryEvidence: derived.queryExplanations.map((e) => ({ query: e.query, source: e.source, evidence: e.evidence })),
      queryConfidence: derived.queryExplanations.map((e) => ({ query: e.query, confidence: e.confidence })),
      queryExplanations: derived.queryExplanations,
      rawJobsCollected: rawJobs.length,
      afterQueryFilter: queryFilteredJobs.length,
      afterRoleRelevance: roleRelevantJobs.length,
      afterLocationFilter: countryFilteredJobs.length,
      afterVerification: verifiedActiveJobs.length,
      afterCandidateMatching: scoredRawJobs.length,
      afterApplyDecision: qualifyingJobs.length,
      recommendedJobs: recommendedJobs.length,
      considerJobs: considerJobs.length,
      qualifyingJobs: qualifyingJobs.length,
      rejectedJobs: rejectedJobs.length,
      finalJobs: returnedJobs.length,
      pipeline,
      discovery: discoveryTelemetry,
    };

    // Print top 10 rejection samples per stage (Requirement 12)
    const stageRejections: Record<string, any[]> = {};
    rejectionDiagnostics.forEach((diag) => {
      if (!stageRejections[diag.stage]) {
        stageRejections[diag.stage] = [];
      }
      if (stageRejections[diag.stage].length < 10) {
        stageRejections[diag.stage].push({
          title: diag.title,
          company: diag.company,
          provider: diag.provider,
          reason: diag.rejectionReason,
        });
      }
    });

    console.log('[DISCOVERY_DEBUG_SUMMARY]', JSON.stringify(debug, null, 2));
    console.log('[STAGE_REJECTION_DIAGNOSTICS_TOP_10]', JSON.stringify(stageRejections, null, 2));

    // Store verified active jobs in Transient Discovery Store (NO database write)
    const runId = discoveryRunId || `disc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (returnedJobs.length > 0) {
      discoveryJobStore.saveJobs(returnedJobs, runId);
    }

    logger.info('SEARCH', `[JOB_DEDUP] After deduplication: ${deduplicated.length}`);
    logger.info('SEARCH', `[ROLE_RELEVANCE] relevant=${roleRelevantJobs.length}/${deduplicated.length}`);
    logger.info('SEARCH', `[VERIFICATION] active=${verifiedActiveJobs.length}/${countryFilteredJobs.length}`);
    logger.info('SEARCH', `[MATCHING] scored=${scoredRawJobs.length}`);
    logger.info('SEARCH', `[APPLY_DECISION] qualifying=${qualifyingJobs.length}/${scoredRawJobs.length} (rec=${recommendedJobs.length}, consider=${considerJobs.length}, rejected=${rejectedJobs.length})`);
    logger.info('SEARCH', `[SCRAPE_COMPLETE] returned=${returnedJobs.length} (Transient stored, 0 DB writes, runId=${runId})`);

    logger.success('SEARCH', 'Completed parallel job crawl & candidate resume matching', {
      mode,
      discoveryRunId: runId,
      rawScraped: rawJobs.length,
      freshJobsReturned: returnedJobs.length,
      duplicatesFiltered: duplicatesRemovedCount,
      freshScrapeCount: returnedJobs.length,
    });

    return {
      mode,
      discoveryRunId: runId,
      totalScrapedRaw: rawJobs.length,
      freshJobsReturned: returnedJobs.length,
      totalUniqueNew: returnedJobs.length,
      duplicatesFiltered: duplicatesRemovedCount,
      providersProcessed: this.providers.length,
      providerBreakdown,
      discovery: discoveryTelemetry,
      rejectionStats,
      pipeline,
      debug,
      rejectionSamples: rejectionSamples.slice(0, 10),
      jobs: returnedJobs,
      recommendedJobs,
      considerJobs,
      rejectedJobs,
    };
  }

  public async searchJobs(query: JobSearchQuery): Promise<JobListing[]> {
    const report = await this.executeParallelCrawl(query);
    return report.jobs;
  }
}

export const jobScraperEngine = new JobScraperEngine();
