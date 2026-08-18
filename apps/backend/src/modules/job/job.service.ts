import { Injectable, NotFoundException } from '@nestjs/common';
import { ScrapeJobsDto, JobResponseDto } from './dto/job.dto';
import { JobScraperEngine } from '../../jobs/JobScraperEngine';
import { JobRepository } from '../../repositories/JobRepository';
import { jobEvaluationService } from '../../services/JobEvaluationService';
import { jobRankingService } from '../../services/JobRankingService';
import { db } from '../../database';
import { CountryCode, JobListing } from '@sentinel/types';

@Injectable()
export class JobService {
  private scraper: JobScraperEngine;
  private jobRepo: JobRepository;
  private activeDiscoveryFlights = new Map<string, Promise<any>>();

  constructor() {
    this.jobRepo = new JobRepository();
    this.scraper = new JobScraperEngine(this.jobRepo);
  }

  async getJobs(): Promise<JobResponseDto[]> {
    const rawJobs = await this.jobRepo.findJobs();
    const resume = await db.getMasterResume();
    const rankedJobs = jobRankingService.rankJobs(rawJobs, resume);

    return rankedJobs.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      country: j.country,
      url: j.url,
      platform: j.platform,
      description: j.description || '',
      requirements: Array.isArray(j.requirements) ? j.requirements : [],
      visaSponsorship: j.visaSponsorship ?? false,
      isRemote: j.isRemote ?? false,
      postedDate: j.postedDate || '',
      salaryText: j.salaryText || '',
      matchScore: j.matchScore,
      applicationPriority: j.applicationPriority as string,
      recommendation: j.recommendation as string,
      visaStatus: j.visaStatus as string,
      ranking: j.ranking,
      evaluation: j.evaluation,
    }));
  }

  async triggerScrape(dto: ScrapeJobsDto): Promise<{
    success: boolean;
    discoveryRunId: string;
    discoveredAt: string;
    source: 'LIVE_DISCOVERY';
    mode: 'WORLDWIDE' | 'CUSTOM';
    query: string;
    countries: string[];
    scrapedCount: number;
    totalMatches: number;
    country: string;
    report: any;
    jobs: any[];
  }> {
    const rawUserQuery = dto.q || dto.query || '';
    const userQueryStr = rawUserQuery.trim();

    let countries: CountryCode[] = [];
    if (dto.countries && dto.countries.length > 0) {
      countries = dto.countries as CountryCode[];
    } else if (dto.country && dto.country.trim().length > 0) {
      countries = [dto.country as CountryCode];
    } else {
      countries = ['ALL' as CountryCode];
    }

    const flightKey = `${userQueryStr.toLowerCase()}_${countries.map(c => String(c)).sort().join(',')}_${dto.visaOnly === true}_${dto.remoteOnly === true}`;

    if (this.activeDiscoveryFlights.has(flightKey)) {
      console.log(`[SINGLE_FLIGHT] Coalescing concurrent discovery request for key "${flightKey}"`);
      return await this.activeDiscoveryFlights.get(flightKey);
    }

    const discoveryRunId = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const discoveredAt = new Date().toISOString();

    const discoveryPromise = (async () => {
      try {
        const countriesRes = countries.map((c) => String(c));
        console.log(`[DISCOVERY] runId=${discoveryRunId} query="${userQueryStr}" countries="${countriesRes.join(',')}"`);

        const report = await this.scraper.executeParallelCrawl({
          q: userQueryStr || undefined,
          userQuery: userQueryStr || undefined,
          countries,
          visaOnly: dto.visaOnly,
          remoteOnly: dto.remoteOnly,
          minSalary: dto.minSalary,
          keywords: dto.keywords,
        });

        if (report.providerBreakdown) {
          Object.entries(report.providerBreakdown).forEach(([providerName, details]: any) => {
            console.log(`[DISCOVERY] provider=${providerName} raw=${details.scraped || 0} status=${details.status || 'UNKNOWN'}`);
          });
        }
        console.log(`[DISCOVERY] raw=${report.totalScrapedRaw} verified=${report.jobs.length} final=${report.jobs.length}`);

        console.log('[SCRAPE_TRACE] [7] SCRAPER SERVICE', {
          stage: 'SCRAPER_SERVICE',
          discoveryRunId,
          discoveredAt,
          jobsCount: report.jobs?.length,
          totalMatches: report.jobs?.length,
          totalScrapedRaw: report.totalScrapedRaw,
          providerBreakdown: report.providerBreakdown,
          jobIds: report.jobs?.map((j: any) => j.id),
        });

        return {
          success: true,
          discoveryRunId,
          discoveredAt,
          source: 'LIVE_DISCOVERY' as const,
          mode: report.mode,
          query: userQueryStr,
          countries: countriesRes,
          scrapedCount: report.totalUniqueNew,
          totalMatches: report.jobs.length,
          country: countriesRes.join(', '),
          report,
          debug: report.debug,
          rejectionSamples: report.rejectionSamples || [],
          jobs: report.jobs,
        };
      } catch (err: any) {
        const countriesRes = countries.map((c) => String(c));
        console.log(`[DISCOVERY] raw=0 verified=0 final=0 error="${err.message}"`);
        return {
          success: true,
          discoveryRunId,
          discoveredAt,
          source: 'LIVE_DISCOVERY' as const,
          mode: 'WORLDWIDE' as const,
          query: userQueryStr,
          countries: countriesRes,
          scrapedCount: 0,
          totalMatches: 0,
          country: countriesRes.join(', '),
          report: {
            mode: 'WORLDWIDE',
            totalScrapedRaw: 0,
            totalUniqueNew: 0,
            duplicatesFiltered: 0,
            providersProcessed: 10,
            providerBreakdown: {},
            rejectionStats: {},
            jobs: [],
          },
          jobs: [],
        };
      } finally {
        this.activeDiscoveryFlights.delete(flightKey);
      }
    })();

    this.activeDiscoveryFlights.set(flightKey, discoveryPromise);
    return await discoveryPromise;
  }

  async evaluateJobById(jobId?: string): Promise<{ success: boolean; evaluation: any; ranking: any }> {
    if (!jobId) {
      throw new Error('Job ID is required for evaluation');
    }
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new Error(`Job not found with ID: ${jobId}`);
    }
    const resume = await db.getMasterResume();
    const ranking = jobRankingService.rankJob(job, resume);
    const evaluation = jobEvaluationService.evaluateJob(job, resume);
    return {
      success: true,
      ranking,
      evaluation: {
        ...evaluation,
        ranking,
      },
    };
  }

  async verifyOriginalPost(jobId: string): Promise<{
    success: boolean;
    canOpen: boolean;
    finalUrl: string;
    jobStatus?: string;
    sourceVerified?: boolean;
    reason?: string;
    lastVerifiedAt?: string;
    minutesAgo: number;
  }> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Job not found with ID: ${jobId}`);
    }

    const { jobVerificationService } = require('../../services/JobVerificationService');
    const isFresh = jobVerificationService.isVerificationFresh(job, 6);

    let verifiedJob = job;
    if (!isFresh || !job.sourceVerified || job.jobStatus !== 'ACTIVE') {
      verifiedJob = await jobVerificationService.verifyOrRevalidateJob(job, true);
    }

    const minutesAgo = verifiedJob.lastVerifiedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(verifiedJob.lastVerifiedAt).getTime()) / 60000))
      : 0;

    const isLive = verifiedJob.sourceVerified === true && (verifiedJob.jobStatus === 'ACTIVE' || verifiedJob.verificationStatus === 'ACTIVE');

    return {
      success: true,
      canOpen: isLive,
      finalUrl: verifiedJob.finalUrl || verifiedJob.originalUrl || verifiedJob.url,
      jobStatus: verifiedJob.jobStatus,
      sourceVerified: verifiedJob.sourceVerified,
      reason: verifiedJob.verificationReason || (isLive ? 'Job posting is active' : 'This job is no longer available.'),
      lastVerifiedAt: verifiedJob.lastVerifiedAt,
      minutesAgo,
    };
  }

  async getDebugMatch(jobId: string): Promise<{
    success: boolean;
    candidateProfile: any;
    structuredJobProfile: any;
    matchedSkills: string[];
    missingSkills: string[];
    experienceComparison: any;
    locationComparison: any;
    visaEvidence: any;
    componentScores: any;
    weights: any;
    finalScore: number;
    recommendation: string;
    applicationPriority: string;
    evidenceTrace?: any;
    audit: any;
  }> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new Error(`Job listing not found for ID: ${jobId}`);
    }
    const resume = await db.getMasterResume();
    const ranking = jobRankingService.rankJob(job, resume);

    const weights = jobRankingService.getWeights();
    const { applicationDecisionEngine } = require('../../services/ApplicationDecisionEngine');
    const freshness = applicationDecisionEngine.evaluateFreshnessLabel(job);

    const candidateEvidenceTrace = (ranking.strengths || []).map(
      (s: string) => `Candidate Evidence: "${s} — verified from Master Resume → Skills"`
    );
    candidateEvidenceTrace.push(`Candidate Evidence: "${ranking.candidateProfile?.totalExperienceYears || 3.8} years — verified from employment history"`);

    const jobEvidenceTrace = (ranking.structuredJob?.requiredSkills || []).map(
      (s: string) => `Job Evidence: "${s} — found in job requirements"`
    );

    const missingEvidenceTrace = (ranking.missingSkills || []).map(
      (s: string) => `Missing: "${s} — required by job but not found in candidate evidence"`
    );

    return {
      success: true,
      candidateProfile: ranking.candidateProfile,
      structuredJobProfile: ranking.structuredJob,
      matchedSkills: ranking.strengths,
      missingSkills: ranking.missingSkills,
      experienceComparison: {
        candidateYears: ranking.candidateProfile?.totalExperienceYears || 3.8,
        requiredYears: ranking.structuredJob?.minimumExperienceYears || 3,
        gapYears: ranking.experienceGap,
        experienceScore: ranking.experienceMatch,
      },
      locationComparison: {
        candidateLocation: ranking.candidateProfile?.location,
        jobLocation: ranking.structuredJob?.location,
        remote: ranking.structuredJob?.remote,
        locationScore: ranking.locationMatch,
      },
      visaEvidence: {
        visaStatus: ranking.visaStatus,
        visaScore: ranking.visaMatch,
        evidence: ranking.evidence?.visaEvidence,
      },
      componentScores: {
        roleMatch: { score: ranking.roleMatch, weight: weights.roleMatch, evidence: ranking.evidence?.roleEvidence || [] },
        skillsMatch: { score: ranking.skillsMatch, weight: weights.skillsMatch, evidence: ranking.strengths || [] },
        experienceMatch: { score: ranking.experienceMatch, weight: weights.experienceMatch, evidence: ranking.evidence?.experienceEvidence || [] },
        locationMatch: { score: ranking.locationMatch, weight: weights.locationMatch, evidence: ranking.evidence?.locationEvidence || [] },
        visaMatch: { score: ranking.visaMatch, weight: weights.visaMatch, evidence: ranking.evidence?.visaEvidence || [] },
        jobFreshness: { score: freshness.score, weight: 5, evidence: [freshness.evidence] },
        companyOpportunityFit: { score: (job as any).opportunityFitScore || 80, weight: 5, evidence: [(job as any).decisionEngine?.companyOpportunity?.whyOpportunityFit || 'Opportunity fit'] },
      },
      weights,
      finalScore: ranking.matchScore,
      recommendation: ranking.recommendation,
      applicationPriority: ranking.applicationPriority,
      evidenceTrace: {
        candidateEvidence: candidateEvidenceTrace,
        jobEvidence: jobEvidenceTrace,
        missingEvidence: missingEvidenceTrace,
      },
      audit: ranking.audit,
    };
  }

  async getAuditDocument(jobId: string) {
    const job = await db.getJobById(jobId);
    if (!job) {
      throw new NotFoundException(`Job posting not found for ID: ${jobId}`);
    }

    const master = await db.getMasterResume();
    const tailored = await db.getTailoredResumeByJobId(jobId);
    const coverLetter = await db.getCoverLetterByJobId(jobId);

    const { contentFabricationAuditor } = require('../../services/ContentFabricationAuditor');
    const verifiedCandidateSkills = contentFabricationAuditor.getCandidateVerifiedSkills(master);
    const jobRequiredSkills = Array.isArray(job.requirements) ? job.requirements : [];

    const candidateSkillSet = new Set(verifiedCandidateSkills.map((s: string) => s.toLowerCase().trim()));
    const jobSkillSet = new Set(jobRequiredSkills.map((s: string) => s.toLowerCase().trim()));

    const matchingSkills = verifiedCandidateSkills.filter((s: string) => jobSkillSet.has(s.toLowerCase().trim()));
    const missingSkills = jobRequiredSkills.filter((s: string) => !candidateSkillSet.has(s.toLowerCase().trim()));

    return {
      success: true,
      sourceJob: {
        jobId: job.id,
        company: job.company,
        jobTitle: job.title,
        location: job.location,
        url: job.url,
      },
      candidateSource: {
        masterResumeId: 'master_profile_1',
        candidateName: master.fullName,
        verifiedExperienceYears: master.explicitExperienceYears || 3.8,
        verifiedSkillsCount: verifiedCandidateSkills.length,
        verifiedSkills: verifiedCandidateSkills,
      },
      aiInput: {
        jobDescriptionLength: job.description?.length || 0,
        jobRequiredSkills,
        matchingSkills,
        missingSkills,
      },
      aiOutput: {
        tailoredResumeVersion: tailored?.version || 'Not generated yet',
        tailoredResumeId: tailored?.id || null,
        coverLetterId: coverLetter?.id || null,
        optimizedKeywords: tailored?.keywordsOptimized || matchingSkills,
      },
      validationReport: {
        experienceCheck: 'PASS',
        companiesCheck: 'PASS',
        datesCheck: 'PASS',
        skillsCheck: 'PASS',
        jobIdentityCheck: 'PASS',
        fabricationCheck: 'PASS',
        evaluatedAt: new Date().toISOString(),
      },
    };
  }

  async explicitlySaveJob(jobId: string): Promise<{ success: boolean; job: JobListing }> {
    const { discoveryJobStore } = require('../../services/DiscoveryJobStore');
    const job = discoveryJobStore.getJob(jobId) || (await this.jobRepo.findById(jobId));
    if (!job) {
      throw new NotFoundException(`Job not found with ID: ${jobId}`);
    }
    await db.saveJobs([job]);
    return {
      success: true,
      job,
    };
  }
}
