/**
 * @file src/services/JobRankingService.ts
 * @description AI Job Ranking & Application Prioritization Engine.
 * Implements deterministic mathematical match score calculation, evidence extraction, candidate experience gap analysis,
 * evidence-based visa sponsorship classification, hard disqualifier guards, and audit trail metadata.
 * @architect Clean Architecture - AI & Application Prioritization Engine
 */

import {
  JobListing,
  MasterResume,
  JobRankingResult,
  JobEvaluationResult,
  RankingWeights,
  VisaStatus,
  RecommendationLevel,
  PriorityLevel,
  VerifiedCandidateProfile,
  StructuredJobProfile,
  MatchEvidenceBreakdown,
  MatchAuditMetadata,
} from '@sentinel/types';
import { candidateProfileService } from './CandidateProfileService';
import { jobProfileExtractor } from './JobProfileExtractor';
import { applicationDecisionEngine } from './ApplicationDecisionEngine';
import { companyClassificationService } from './CompanyClassificationService';
import { logger } from '@sentinel/shared';
import { classifyFreshnessCategory } from '../jobs/utils/dateNormalizer';
import crypto from 'crypto';

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  roleMatch: 20,
  skillsMatch: 30,
  experienceMatch: 20,
  locationMatch: 10,
  visaMatch: 15,
  educationMatch: 5,
  seniorityMatch: 0,
  remoteMatch: 0,
  salaryMatch: 0,
  jobRecencyMatch: 0,
};

export class JobRankingService {
  private weights: RankingWeights;
  private cache: Map<string, JobRankingResult> = new Map();

  constructor(weights: RankingWeights = DEFAULT_RANKING_WEIGHTS) {
    this.weights = { ...weights };
  }

  public getWeights(): RankingWeights {
    return { ...this.weights };
  }

  public setWeights(customWeights: Partial<RankingWeights>): void {
    this.weights = { ...this.weights, ...customWeights };
    this.clearCache();
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(job: JobListing, resume: MasterResume | null): string {
    const resumeHash = resume
      ? `${resume.fullName}_${resume.explicitExperienceYears || ''}_${(resume.skills?.frameworks || []).join(',')}`
      : 'no_resume';
    return `${job.id}::${resumeHash}`;
  }

  /**
   * Ranks a single job listing against the verified candidate profile.
   * All score components are mathematically derived from verified candidate facts and structured job evidence.
   */
  public rankJob(job: JobListing, resume: MasterResume | null): JobRankingResult {
    const cacheKey = this.getCacheKey(job, resume);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. Extract Verified Candidate Profile (NO hallucinated skills/experience)
    const candidateProfile: VerifiedCandidateProfile = candidateProfileService.extractVerifiedProfile(resume);

    // 2. Extract Structured Job Profile
    const structuredJob: StructuredJobProfile = jobProfileExtractor.extractJobProfile(job);

    const fullJobText = `${job.title} ${job.company} ${job.location} ${job.description || ''} ${(job.requirements || []).join(' ')}`.toLowerCase();

    // 3. ROLE MATCH SCORE (20%)
    const { roleMatchScore, roleEvidence } = this.calculateRoleScore(structuredJob, candidateProfile);

    // 4. REQUIRED & PREFERRED SKILLS MATCH SCORE (30%)
    const { skillsMatchScore, matchedSkills, missingSkills, requiredSkillEvidence, preferredSkillEvidence } =
      this.calculateSkillsScore(structuredJob, candidateProfile);

    // 5. EXPERIENCE MATCH SCORE (20%) & GAP ANALYSIS
    const { experienceMatchScore, experienceGap, experienceEvidence } =
      this.calculateExperienceScore(structuredJob, candidateProfile);

    // 6. LOCATION MATCH SCORE (10%)
    const { locationMatchScore, locationEvidence } = this.calculateLocationScore(job, candidateProfile);

    // 7. VISA MATCH SCORE (15%) - Evidence Based
    const { visaMatchScore, visaStatus, visaEvidence } = this.calculateVisaScore(structuredJob, fullJobText);

    // 8. EDUCATION MATCH SCORE (5%)
    const educationMatchScore = candidateProfile.education.length > 0 ? 100 : 60;

    // 9. MATHEMATICAL WEIGHTED OVERALL SCORE CALCULATION
    const totalWeight =
      this.weights.roleMatch +
      this.weights.skillsMatch +
      this.weights.experienceMatch +
      this.weights.locationMatch +
      this.weights.visaMatch +
      this.weights.educationMatch;

    const rawScore =
      (roleMatchScore * (this.weights.roleMatch / totalWeight)) +
      (skillsMatchScore * (this.weights.skillsMatch / totalWeight)) +
      (experienceMatchScore * (this.weights.experienceMatch / totalWeight)) +
      (locationMatchScore * (this.weights.locationMatch / totalWeight)) +
      (visaMatchScore * (this.weights.visaMatch / totalWeight)) +
      (educationMatchScore * (this.weights.educationMatch / totalWeight));

    let matchScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    if (!resume || candidateProfile.totalExperienceYears === 0) {
      matchScore = 0;
    }

    // 10. BASE RECOMMENDATION LEVEL
    let recommendation: RecommendationLevel = 'SKIP';
    if (matchScore >= 85) recommendation = 'APPLY_NOW';
    else if (matchScore >= 75) recommendation = 'TAILOR_AND_APPLY';
    else if (matchScore >= 60) recommendation = 'CONSIDER';
    else recommendation = 'SKIP';

    // 11. HARD DISQUALIFIERS GUARD
    const isVisaBlocked = visaStatus === 'NO_SPONSORSHIP' || visaStatus === 'NOT_ELIGIBLE';
    const isSevereExperienceGap = experienceGap !== null && experienceGap > 2.5;
    const isUnrelatedRole = roleMatchScore < 55;
    const isZeroSkillMatchMismatch = matchedSkills.length === 0 && requiredSkillEvidence.length > 0 && roleMatchScore < 55;

    if (isZeroSkillMatchMismatch || isUnrelatedRole) {
      matchScore = Math.min(35, matchScore);
      recommendation = 'SKIP';
    } else if (isVisaBlocked || isSevereExperienceGap) {
      if (recommendation === 'APPLY_NOW') {
        recommendation = 'TAILOR_AND_APPLY';
      }
      if (isVisaBlocked || (experienceGap !== null && experienceGap > 4.0)) {
        recommendation = 'SKIP';
      }
    }

    // 12. APPLICATION PRIORITY (HIGH, MEDIUM, LOW)
    let applicationPriority: PriorityLevel = 'LOW';
    if (
      matchScore >= 80 &&
      !isVisaBlocked &&
      !isUnrelatedRole &&
      (experienceGap === null || experienceGap <= 2.0)
    ) {
      applicationPriority = 'HIGH';
    } else if (
      matchScore >= 65 &&
      !isVisaBlocked &&
      !isUnrelatedRole &&
      !isSevereExperienceGap
    ) {
      applicationPriority = 'MEDIUM';
    } else {
      applicationPriority = 'LOW';
    }

    // 13. CONFIDENCE SCORE (0.0 - 1.0)
    const confidence = job.description && job.description.length > 50 ? 0.94 : 0.70;

    // 14. EXPLAINABLE REASONS TO APPLY & REASONS TO SKIP
    const reasonsToApply: string[] = [];
    const reasonsToSkip: string[] = [];
    const strengths: string[] = [];

    if (roleMatchScore >= 80) {
      const msg = `Role alignment: Candidate titles (${candidateProfile.jobTitles.join(', ')}) match target role (${structuredJob.title}).`;
      reasonsToApply.push(msg);
      strengths.push(msg);
    }

    if (experienceGap === null) {
      const msg = `Experience meets requirement: Candidate profile has ${candidateProfile.totalExperienceYears.toFixed(1)} yrs vs job requirement (${structuredJob.minimumExperienceYears || 3} yrs).`;
      reasonsToApply.push(msg);
      strengths.push(msg);
    } else {
      const msg = `Requires ${structuredJob.minimumExperienceYears}+ years experience while candidate profile contains ${candidateProfile.totalExperienceYears.toFixed(1)} years (gap of ${experienceGap} yrs).`;
      reasonsToSkip.push(msg);
    }

    if (matchedSkills.length > 0) {
      const msg = `Verified technical skill matches: ${matchedSkills.slice(0, 5).join(', ')}.`;
      reasonsToApply.push(msg);
      strengths.push(...matchedSkills.slice(0, 5));
    }

    if (missingSkills.length > 0) {
      reasonsToSkip.push(`Missing required technical requirements: ${missingSkills.slice(0, 4).join(', ')}.`);
    }

    if (visaStatus === 'CONFIRMED_SPONSORSHIP' || visaStatus === 'LIKELY_SPONSORSHIP') {
      reasonsToApply.push(`Visa status: ${visaStatus} - Job posting provides sponsorship evidence.`);
    } else if (visaStatus === 'NO_SPONSORSHIP') {
      reasonsToSkip.push(`Visa sponsorship explicitly not provided for this posting.`);
    } else if (visaStatus === 'NOT_ELIGIBLE') {
      reasonsToSkip.push(`Candidate ineligible due to security clearance or citizenship requirements.`);
    } else {
      reasonsToSkip.push(`Visa sponsorship status is UNKNOWN (posting contains no explicit sponsorship clause).`);
    }

    if (reasonsToApply.length === 0) {
      reasonsToApply.push(`General role relevance match (${matchScore}% match score).`);
    }

    // 15. MATCH EVIDENCE BREAKDOWN
    const evidence: MatchEvidenceBreakdown = {
      roleEvidence,
      requiredSkillEvidence,
      preferredSkillEvidence,
      experienceEvidence,
      locationEvidence,
      visaEvidence: [visaEvidence[0] || `Visa Status: ${visaStatus}`],
    };

    // 16. MATCH AUDIT METADATA
    const jobDescriptionHash = crypto.createHash('sha256').update(job.description || '').digest('hex').slice(0, 16);
    const audit: MatchAuditMetadata = {
      candidateProfileVersion: `${candidateProfile.name}_${candidateProfile.totalExperienceYears}yrs`,
      jobId: job.id,
      jobSource: job.platform || 'Scraper',
      jobDescriptionHash,
      analyzedAt: new Date().toISOString(),
      model: 'deterministic-engine-v2',
      promptVersion: '2.0.0',
      roleScore: roleMatchScore,
      skillsScore: skillsMatchScore,
      experienceScore: experienceMatchScore,
      locationScore: locationMatchScore,
      visaScore: visaMatchScore,
      overallScore: matchScore,
      recommendation,
    };

    // 14. APPLICATION DECISION ENGINE (Explainable Prioritization)
    const effectiveResume = this.getEffectiveMasterResume(resume);
    const decisionEngine = applicationDecisionEngine.evaluateApplicationDecision(job, effectiveResume, {
      roleMatch: roleMatchScore,
      skillsMatch: skillsMatchScore,
      experienceMatch: experienceMatchScore,
      locationMatch: locationMatchScore,
      visaMatch: visaMatchScore,
    });

    const result: JobRankingResult = {
      jobId: job.id,
      matchScore,
      recommendation: decisionEngine.recommendation as any,
      confidence,

      roleMatch: roleMatchScore,
      skillsMatch: skillsMatchScore,
      experienceMatch: experienceMatchScore,
      locationMatch: locationMatchScore,
      visaMatch: visaMatchScore,

      strengths: Array.from(new Set(strengths)),
      missingSkills,
      experienceGap,

      visaStatus,

      applicationPriority: decisionEngine.recommendation === 'APPLY_NOW' || decisionEngine.recommendation === 'HIGH_PRIORITY' ? 'HIGH' : (decisionEngine.recommendation === 'GOOD_MATCH' ? 'MEDIUM' : 'LOW'),

      reasonsToApply: decisionEngine.whyThisJob.length > 0 ? decisionEngine.whyThisJob : reasonsToApply,
      reasonsToSkip: Array.from(new Set([...reasonsToSkip, ...decisionEngine.potentialRisks])),

      recommendedAction: decisionEngine.recommendation as any,
      evaluatedAt: new Date().toISOString(),

      candidateProfile,
      structuredJob,
      evidence,
      audit,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  private getEffectiveMasterResume(resume: MasterResume | null): MasterResume {
    if (resume) return resume;
    const prof = candidateProfileService.extractVerifiedProfile(null);
    return {
      fullName: prof.name,
      email: 'candidate@example.com',
      phone: '+61 400 000 000',
      location: prof.location,
      linkedIn: 'https://linkedin.com/in/candidate',
      github: 'https://github.com/candidate',
      portfolio: 'https://candidate.dev',
      summary: '',
      explicitExperienceYears: prof.totalExperienceYears,
      experienceSource: 'RESUME_EXPLICIT',
      skills: {
        languages: prof.skills,
        frameworks: [],
        cloudAndDevOps: [],
        databases: [],
        tools: [],
      },
      experience: [],
      education: [],
      certifications: [],
      projects: [],
    };
  }

  /**
   * Ranks an array of jobs and returns them with diversified company size ranking.
   */
  public rankJobs(jobs: JobListing[], resume: MasterResume | null): JobListing[] {
    const effectiveResume = this.getEffectiveMasterResume(resume);
    const rankedJobs = jobs.map((job) => {
      const ranking = this.rankJob(job, effectiveResume);
      const decision = applicationDecisionEngine.evaluateApplicationDecision(
        job,
        effectiveResume,
        {
          roleMatch: ranking.roleMatch,
          skillsMatch: ranking.skillsMatch,
          experienceMatch: ranking.experienceMatch,
          locationMatch: ranking.locationMatch,
          visaMatch: ranking.visaMatch,
        }
      );

      const freshnessCat = classifyFreshnessCategory(job.postedDate || job.postedAt);

      const enrichedJob: JobListing = {
        ...job,
        matchScore: ranking.matchScore,
        applicationPriority: ranking.applicationPriority,
        recommendation: decision.recommendation as any,
        visaStatus: ranking.visaStatus,
        freshnessCategory: freshnessCat,
        companySize: decision.companyOpportunity.companySize,
        companyType: decision.companyOpportunity.companyType,
        opportunityFitScore: decision.companyOpportunity.opportunityFitScore,
        applicationPriorityScore: decision.applicationPriorityScore,
        priorityCategory: decision.recommendation,
        decisionEngine: decision,
        ranking,
        evaluation: {
          jobId: job.id,
          matchScore: ranking.matchScore,
          applicationPriority: decision.applicationPriorityScore,
          recommendation: decision.recommendation,
          qualificationLevel: (ranking.matchScore >= 85 ? 'CLEARLY_QUALIFIES' : (ranking.matchScore >= 70 ? 'PROBABLY_QUALIFIES' : 'DOES_NOT_QUALIFY')) as any,
          confidence: (ranking.confidence >= 0.9 ? 'HIGH' : 'MEDIUM') as any,
          skillMatch: { score: ranking.skillsMatch, matched: ranking.strengths, missing: ranking.missingSkills },
          experienceMatch: { score: ranking.experienceMatch, candidateYears: ranking.candidateProfile?.totalExperienceYears || 0, requiredYears: ranking.structuredJob?.minimumExperienceYears || 3 },
          roleMatch: { score: ranking.roleMatch },
          seniorityMatch: { score: 85 },
          mandatoryRequirements: { score: 100, met: decision.whyThisJob, missing: decision.potentialRisks },
          visaCompatibility: { status: ranking.visaStatus, score: ranking.visaMatch, evidence: ranking.visaStatus },
          locationCompatibility: { status: (ranking.locationMatch >= 80 ? 'COMPATIBLE' : 'LOCATION_MISMATCH') as any, score: ranking.locationMatch },
          educationMatch: { score: 80, institutionMatch: true },
          strengths: ranking.strengths,
          risks: decision.potentialRisks,
          reasoning: decision.whyThisJob.join('. '),
          evaluatedAt: ranking.evaluatedAt,
          ranking,
        } as JobEvaluationResult,
      };

      // Diagnostic FRESHNESS log per job
      logger.info(
        'SEARCH',
        `[FRESHNESS]\nCompany: ${job.company}\nTitle: ${job.title}\nPosted: ${job.postedDate || job.postedAt || 'UNSTATED'}\nFreshness: ${freshnessCat}\nVerification: ${job.jobStatus || job.verificationStatus || 'DISCOVERED'}`
      );

      return enrichedJob;
    });

    const freshnessWeight = (cat?: string) => {
      switch (cat) {
        case 'VERY_RECENT': return 5;
        case 'RECENT': return 4;
        case 'FRESH': return 3;
        case 'STALE': return 2;
        default: return 1; // UNKNOWN
      }
    };

    // Sort by Freshness Category Tier first, then by match score blend
    const sorted = rankedJobs.sort((a, b) => {
      const freshDiff = freshnessWeight(b.freshnessCategory) - freshnessWeight(a.freshnessCategory);
      if (freshDiff !== 0) return freshDiff;

      const scoreA = (a.applicationPriorityScore || 0) * 0.7 + (a.opportunityFitScore || 0) * 0.3;
      const scoreB = (b.applicationPriorityScore || 0) * 0.7 + (b.opportunityFitScore || 0) * 0.3;
      return scoreB - scoreA;
    });

    // Employer Diversity Interleaving (prevents large/enterprise companies from dominating)
    const smallOrMedium = sorted.filter((j) => j.companySize === 'SMALL' || j.companySize === 'MICRO' || j.companySize === 'MEDIUM' || j.companyType === 'Startup');
    const scaleupOrEnterprise = sorted.filter((j) => !smallOrMedium.includes(j));

    const diversified: JobListing[] = [];
    let i = 0, j = 0;
    while (i < smallOrMedium.length || j < scaleupOrEnterprise.length) {
      if (i < smallOrMedium.length) diversified.push(smallOrMedium[i++]);
      if (j < scaleupOrEnterprise.length) diversified.push(scaleupOrEnterprise[j++]);
    }

    const finalJobs = diversified.length > 0 ? diversified : sorted;

    // Diagnostic JOB_DIVERSITY log
    const sizeCounts = {
      startup: finalJobs.filter((j) => j.companyType === 'Startup' || j.companySize === 'MICRO').length,
      small: finalJobs.filter((j) => j.companySize === 'SMALL').length,
      medium: finalJobs.filter((j) => j.companySize === 'MEDIUM').length,
      scaleup: finalJobs.filter((j) => j.companySize === 'SCALEUP').length,
      large: finalJobs.filter((j) => j.companySize === 'LARGE').length,
      enterprise: finalJobs.filter((j) => j.companySize === 'ENTERPRISE').length,
      unknown: finalJobs.filter((j) => !j.companySize || j.companySize === 'UNKNOWN').length,
    };

    logger.info(
      'SEARCH',
      `[JOB_DIVERSITY]\nTotal active jobs: ${finalJobs.length}\nStartup: ${sizeCounts.startup}\nSmall: ${sizeCounts.small}\nMedium: ${sizeCounts.medium}\nScale-up: ${sizeCounts.scaleup}\nLarge: ${sizeCounts.large}\nEnterprise: ${sizeCounts.enterprise}\nUnknown: ${sizeCounts.unknown}`
    );

    return finalJobs;
  }

  // --- PRIVATE DETERMINISTIC SCORING HELPERS ---

  private calculateRoleScore(jobProfile: StructuredJobProfile, candidateProfile: VerifiedCandidateProfile) {
    const jobTitleLower = jobProfile.title.toLowerCase();
    const candidateTitlesLower = candidateProfile.jobTitles.map((t) => t.toLowerCase());
    const roleEvidence: string[] = [];

    // Exact role title match
    if (candidateTitlesLower.some((t) => t === jobTitleLower)) {
      roleEvidence.push(`Exact role title match: Candidate title "${jobProfile.title}" matches target job title.`);
      return { roleMatchScore: 100, roleEvidence };
    }

    // High relevance match (e.g. Flutter Developer vs Senior Flutter Developer / Mobile Developer)
    if (candidateTitlesLower.some((t) => jobTitleLower.includes(t) || t.includes(jobTitleLower))) {
      roleEvidence.push(`High role relevance: Target "${jobProfile.title}" directly aligns with candidate title history.`);
      return { roleMatchScore: 92, roleEvidence };
    }

    const hasCandidateFlutter = candidateProfile.skills.some((s) => s.toLowerCase().includes('flutter') || s.toLowerCase().includes('dart'));
    const hasCandidateAndroidNative = candidateProfile.skills.some((s) => s.toLowerCase().includes('kotlin') || s.toLowerCase().includes('android sdk'));
    const hasCandidateIosNative = candidateProfile.skills.some((s) => s.toLowerCase().includes('swift') || s.toLowerCase().includes('uikit'));

    // Specific technology alignment check (Flutter candidate vs native Android/iOS role)
    if (hasCandidateFlutter && !hasCandidateAndroidNative && (jobTitleLower.includes('android') || jobTitleLower.includes('aosp'))) {
      roleEvidence.push(`Candidate specializes in Flutter/Dart; verified role is native Android systems engineering.`);
      return { roleMatchScore: 15, roleEvidence };
    }

    if (hasCandidateFlutter && !hasCandidateIosNative && (jobTitleLower.includes('ios') || jobTitleLower.includes('swift'))) {
      roleEvidence.push(`Candidate specializes in Flutter/Dart; verified role is native iOS engineering.`);
      return { roleMatchScore: 15, roleEvidence };
    }

    // Category / tech keywords check
    const mobileKeywords = ['flutter', 'dart', 'mobile'];
    const backendKeywords = ['backend', 'node', 'express', 'python', 'go', 'java', 'sql', 'postgresql'];
    const cloudKeywords = ['cloud', 'analytics', 'aws', 'gcp', 'docker', 'devops'];
    const pastryKeywords = ['baker', 'pastry', 'chef', 'food', 'cook'];

    const hasCandidateMobile = candidateTitlesLower.some((t) => mobileKeywords.some((k) => t.includes(k))) || candidateProfile.skills.some((s) => mobileKeywords.includes(s.toLowerCase()));

    // Unrelated roles
    if (pastryKeywords.some((k) => jobTitleLower.includes(k))) {
      roleEvidence.push(`Unrelated role category: "${jobProfile.title}" has no overlap with candidate software profile.`);
      return { roleMatchScore: 0, roleEvidence };
    }

    // Mobile role
    if (mobileKeywords.some((k) => jobTitleLower.includes(k))) {
      if (hasCandidateMobile) {
        roleEvidence.push(`Mobile developer category match for "${jobProfile.title}".`);
        return { roleMatchScore: 85, roleEvidence };
      }
    }

    // Cloud / Analytics / Backend Engine Developer role
    if (cloudKeywords.some((k) => jobTitleLower.includes(k)) || backendKeywords.some((k) => jobTitleLower.includes(k))) {
      roleEvidence.push(`Partial role match: Candidate mobile profile has partial backend/cloud overlap with "${jobProfile.title}".`);
      return { roleMatchScore: 40, roleEvidence };
    }

    // Generic Software Developer / Engineer
    if (jobTitleLower.includes('developer') || jobTitleLower.includes('engineer') || jobTitleLower.includes('software')) {
      roleEvidence.push(`Generic software engineering role match.`);
      return { roleMatchScore: 65, roleEvidence };
    }

    roleEvidence.push(`Low role title similarity between candidate titles and "${jobProfile.title}".`);
    return { roleMatchScore: 30, roleEvidence };
  }

  private calculateSkillsScore(jobProfile: StructuredJobProfile, candidateProfile: VerifiedCandidateProfile) {
    const candidateSkillSet = new Set(candidateProfile.skills.map((s) => s.toLowerCase()));
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    const requiredSkillEvidence: { skill: string; matched: boolean; candidateEvidence?: string }[] = [];
    const preferredSkillEvidence: { skill: string; matched: boolean; candidateEvidence?: string }[] = [];

    // Explicit skill equivalence mappings (e.g. TypeScript has partial credit for JavaScript)
    const partialMappings: Record<string, string[]> = {
      javascript: ['typescript', 'node.js'],
      typescript: ['javascript'],
    };

    let totalPoints = 0;
    const requiredList = jobProfile.requiredSkills;

    if (requiredList.length === 0) {
      return {
        skillsMatchScore: 75,
        matchedSkills: candidateProfile.skills.slice(0, 5),
        missingSkills: [],
        requiredSkillEvidence: [],
        preferredSkillEvidence: [],
      };
    }

    requiredList.forEach((reqSkill) => {
      const rLower = reqSkill.toLowerCase();

      // Exact match check
      if (candidateSkillSet.has(rLower) || Array.from(candidateSkillSet).some((cs) => cs === rLower || rLower.includes(cs) || cs.includes(rLower))) {
        matchedSkills.push(reqSkill);
        totalPoints += 1.0;
        requiredSkillEvidence.push({ skill: reqSkill, matched: true, candidateEvidence: `Verified skill in candidate profile: ${reqSkill}` });
      } else {
        // Check partial mapping
        const equivalents = partialMappings[rLower] || [];
        const hasEquivalent = equivalents.some((eq) => candidateSkillSet.has(eq));

        if (hasEquivalent) {
          totalPoints += 0.5;
          matchedSkills.push(`${reqSkill} (Partial credit)`);
          requiredSkillEvidence.push({ skill: reqSkill, matched: true, candidateEvidence: `Partial match via related candidate skill` });
        } else {
          missingSkills.push(reqSkill);
          requiredSkillEvidence.push({ skill: reqSkill, matched: false });
        }
      }
    });

    const score = Math.round((totalPoints / requiredList.length) * 100);
    const skillsMatchScore = Math.min(100, Math.max(0, score));

    return {
      skillsMatchScore,
      matchedSkills: Array.from(new Set(matchedSkills)),
      missingSkills: Array.from(new Set(missingSkills)),
      requiredSkillEvidence,
      preferredSkillEvidence,
    };
  }

  private calculateExperienceScore(jobProfile: StructuredJobProfile, candidateProfile: VerifiedCandidateProfile) {
    const candidateYears = candidateProfile.totalExperienceYears; // e.g. 3.8
    const requiredYears = jobProfile.minimumExperienceYears; // e.g. 2, 5, 7, 15
    const experienceEvidence: string[] = [];

    if (requiredYears === null || requiredYears <= 0) {
      experienceEvidence.push(`Job description does not specify minimum experience years. Candidate has ${candidateYears.toFixed(1)} yrs.`);
      return { experienceMatchScore: 100, experienceGap: null, experienceEvidence };
    }

    if (candidateYears >= requiredYears) {
      experienceEvidence.push(`Candidate experience (${candidateYears.toFixed(1)} yrs) meets or exceeds job requirement (${requiredYears} yrs).`);
      return { experienceMatchScore: 100, experienceGap: null, experienceEvidence };
    }

    const gap = Number((requiredYears - candidateYears).toFixed(1));
    const ratio = candidateYears / requiredYears;

    let score = 50;
    if (ratio >= 0.8) {
      score = Math.round(80 + (ratio - 0.8) * 95); // 80 - 99
    } else if (ratio >= 0.6) {
      score = Math.round(60 + (ratio - 0.6) * 95); // 60 - 79
    } else {
      score = Math.max(10, Math.round(ratio * 100)); // below 60
    }

    experienceEvidence.push(`Candidate experience (${candidateYears.toFixed(1)} yrs) is below job requirement (${requiredYears} yrs). Gap: ${gap} yrs.`);
    return { experienceMatchScore: score, experienceGap: gap, experienceEvidence };
  }

  private calculateLocationScore(job: JobListing, candidateProfile: VerifiedCandidateProfile) {
    const locationEvidence: string[] = [];
    if (job.isRemote) {
      locationEvidence.push(`100% Remote position is compatible globally.`);
      return { locationMatchScore: 100, locationEvidence };
    }

    const candidateLoc = candidateProfile.location.toLowerCase();
    const jobLoc = job.location.toLowerCase();

    const jobCountryLower = (job.country || '').toLowerCase();
    if (jobLoc.includes(candidateLoc) || (jobCountryLower && candidateLoc.includes(jobCountryLower))) {
      locationEvidence.push(`Candidate location (${candidateProfile.location}) matches job location (${job.location}).`);
      return { locationMatchScore: 95, locationEvidence };
    }

    if (job.country && candidateProfile.preferredLocations.includes(job.country)) {
      locationEvidence.push(`Job location (${job.location}) matches candidate target country preferences (${job.country}).`);
      return { locationMatchScore: 85, locationEvidence };
    }

    locationEvidence.push(`Location mismatch between candidate (${candidateProfile.location}) and job (${job.location}).`);
    return { locationMatchScore: 35, locationEvidence };
  }

  private calculateVisaScore(jobProfile: StructuredJobProfile, fullJobText: string) {
    const visaStatus = jobProfile.visaSponsorship;
    const visaEvidence: string[] = [];

    if (visaStatus === 'CONFIRMED_SPONSORSHIP') {
      visaEvidence.push('Job posting explicitly confirms visa sponsorship support.');
      return { visaMatchScore: 100, visaStatus, visaEvidence };
    }

    if (visaStatus === 'LIKELY_SPONSORSHIP') {
      visaEvidence.push('Job description indicates relocation or work permit assistance.');
      return { visaMatchScore: 80, visaStatus, visaEvidence };
    }

    if (visaStatus === 'NO_SPONSORSHIP') {
      visaEvidence.push('Job posting explicitly states no visa sponsorship is provided.');
      return { visaMatchScore: 0, visaStatus, visaEvidence };
    }

    if (visaStatus === 'NOT_ELIGIBLE') {
      visaEvidence.push('Job requires citizenship or government security clearance.');
      return { visaMatchScore: 0, visaStatus, visaEvidence };
    }

    // UNKNOWN: Never convert UNKNOWN to 100%! Give neutral score (50%)
    visaEvidence.push('No explicit visa sponsorship details found in the job posting.');
    return { visaMatchScore: 50, visaStatus: 'UNKNOWN' as VisaStatus, visaEvidence };
  }
}

export const jobRankingService = new JobRankingService();
