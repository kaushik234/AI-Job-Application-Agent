/**
 * @file src/services/JobEvaluationService.ts
 * @description Comprehensive AI & Deterministic Job Evaluation & Application Priority Engine.
 * Evaluates candidate fit across 9 weighted dimensions, computes transparent Application Priority scores, and generates explainable recommendations.
 * @architect Clean Architecture - AI & Decision Support Service
 */

import { JobListing, MasterResume, JobEvaluationResult, EvaluationWeights } from '@sentinel/types';
import { calculateResumeExperienceYears } from '../jobs/utils/queryGenerator';
import { logger } from '@sentinel/shared';

export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  skillMatch: 30,
  experienceMatch: 20,
  roleMatch: 15,
  seniorityMatch: 10,
  mandatoryRequirements: 10,
  locationCompatibility: 5,
  visaCompatibility: 5,
  remoteCompatibility: 3,
  educationMatch: 2,
};

export class JobEvaluationService {
  private cache: Map<string, JobEvaluationResult> = new Map();
  private weights: EvaluationWeights;

  constructor(weights: EvaluationWeights = DEFAULT_EVALUATION_WEIGHTS) {
    this.weights = weights;
  }

  public getWeights(): EvaluationWeights {
    return { ...this.weights };
  }

  public setWeights(customWeights: Partial<EvaluationWeights>): void {
    this.weights = { ...this.weights, ...customWeights };
  }

  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Generates a cache key based on job ID and resume properties
   */
  private getCacheKey(job: JobListing, resume: MasterResume | null): string {
    const resumeHash = resume ? `${resume.fullName}_${(resume.skills?.frameworks || []).join(',')}_${resume.experience?.length || 0}` : 'empty_resume';
    return `${job.id}::${resumeHash}`;
  }

  /**
   * Evaluates a job listing against the candidate's master resume
   */
  public evaluateJob(job: JobListing, resume: MasterResume | null): JobEvaluationResult {
    const cacheKey = this.getCacheKey(job, resume);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      logger.info('SEARCH', `[JOB_EVALUATION] Cache hit for job: ${job.id}`);
      return cached;
    }

    logger.info('SEARCH', `[JOB_EVALUATION] Evaluating job: ${job.id} - ${job.title} (${job.company})`);

    const fullJobText = `${job.title} ${job.company} ${job.location} ${job.description || ''} ${(job.requirements || []).join(' ')}`.toLowerCase();

    // Handle empty/null candidate resume
    if (!resume) {
      const emptyResult: JobEvaluationResult = {
        jobId: job.id,
        matchScore: 0,
        applicationPriority: 0,
        recommendation: 'SKIP',
        qualificationLevel: 'DOES_NOT_QUALIFY',
        confidence: 'LOW',
        skillMatch: { score: 0, matched: [], missing: job.requirements || [] },
        experienceMatch: { score: 0, candidateYears: 0, requiredYears: 3 },
        roleMatch: { score: 0 },
        seniorityMatch: { score: 0 },
        mandatoryRequirements: { score: 0, met: [], missing: ['Master Resume profile not configured'] },
        visaCompatibility: { status: 'UNKNOWN', score: 50, evidence: 'Candidate profile missing' },
        locationCompatibility: { status: 'UNKNOWN', score: 50 },
        educationMatch: { score: 0, institutionMatch: false },
        strengths: [],
        risks: ['Candidate profile is missing/empty'],
        reasoning: 'SKIP recommendation (Application Priority: 0/100). Candidate master profile is empty or unconfigured.',
        evaluatedAt: new Date().toISOString(),
      };
      this.cache.set(cacheKey, emptyResult);
      return emptyResult;
    }

    // 1. Skill Match (30%)
    const skillAnalysis = this.evaluateSkills(job, resume, fullJobText);

    // 2. Experience Match (20%)
    const expAnalysis = this.evaluateExperience(job, resume, fullJobText);

    // 3. Role/Title Match (15%)
    const roleScore = this.evaluateRoleTitle(job, resume);

    // 4. Seniority Match (10%)
    const seniorityScore = this.evaluateSeniority(job, resume, fullJobText);

    // 5. Mandatory Requirements Match (10%)
    const mandatoryAnalysis = this.evaluateMandatoryRequirements(job, resume, fullJobText);

    // 6. Visa Compatibility (5%)
    const visaAnalysis = this.evaluateVisaCompatibility(job, fullJobText);

    // 7. Location Compatibility (5%)
    const locationAnalysis = this.evaluateLocationCompatibility(job, resume);

    // 8. Remote Compatibility (3%)
    const remoteScore = this.evaluateRemoteCompatibility(job);

    // 9. Education & Certification Match (2%)
    const eduAnalysis = this.evaluateEducation(job, resume, fullJobText);

    // Compute Weighted Application Priority Score (0-100)
    let applicationPriority = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (skillAnalysis.score * this.weights.skillMatch +
            expAnalysis.score * this.weights.experienceMatch +
            roleScore * this.weights.roleMatch +
            seniorityScore * this.weights.seniorityMatch +
            mandatoryAnalysis.score * this.weights.mandatoryRequirements +
            visaAnalysis.score * this.weights.visaCompatibility +
            locationAnalysis.score * this.weights.locationCompatibility +
            remoteScore * this.weights.remoteCompatibility +
            eduAnalysis.score * this.weights.educationMatch) /
            100
        )
      )
    );

    // Determine Qualification Level
    let qualificationLevel: 'CLEARLY_QUALIFIES' | 'PROBABLY_QUALIFIES' | 'MAY_QUALIFY' | 'DOES_NOT_QUALIFY' = 'DOES_NOT_QUALIFY';
    if (applicationPriority >= 85) qualificationLevel = 'CLEARLY_QUALIFIES';
    else if (applicationPriority >= 70) qualificationLevel = 'PROBABLY_QUALIFIES';
    else if (applicationPriority >= 50) qualificationLevel = 'MAY_QUALIFY';

    // Determine Recommendation Level (APPLY, CONSIDER, SKIP)
    let recommendation: 'APPLY' | 'CONSIDER' | 'SKIP' = 'SKIP';
    if (applicationPriority >= 80) recommendation = 'APPLY';
    else if (applicationPriority >= 60) recommendation = 'CONSIDER';

    // Mandatory Failure Override: if mandatory requirements fail, cap recommendation
    if (mandatoryAnalysis.missing.length > 0) {
      if (recommendation === 'APPLY') recommendation = 'CONSIDER';
      applicationPriority = Math.min(applicationPriority, 78);
    }

    // Build Strengths, Risks & Reasoning
    const { strengths, risks, reasoning } = this.buildExplanation(
      job,
      resume,
      applicationPriority,
      recommendation,
      skillAnalysis,
      expAnalysis,
      mandatoryAnalysis,
      visaAnalysis
    );

    const result: JobEvaluationResult = {
      jobId: job.id,
      matchScore: job.matchScore ?? applicationPriority,
      applicationPriority,
      recommendation,
      qualificationLevel,
      confidence: job.description && job.description.length > 30 ? 'HIGH' : 'MEDIUM',

      skillMatch: skillAnalysis,
      experienceMatch: expAnalysis,
      roleMatch: { score: roleScore },
      seniorityMatch: { score: seniorityScore },
      mandatoryRequirements: mandatoryAnalysis,
      visaCompatibility: visaAnalysis,
      locationCompatibility: locationAnalysis,
      educationMatch: eduAnalysis,

      strengths,
      risks,
      reasoning,
      evaluatedAt: new Date().toISOString(),
    };

    // Logging output
    logger.info('SEARCH', `[JOB_EVALUATION] Skill score: ${skillAnalysis.score}`);
    logger.info('SEARCH', `[JOB_EVALUATION] Experience score: ${expAnalysis.score}`);
    logger.info('SEARCH', `[JOB_EVALUATION] Visa status: ${visaAnalysis.status}`);
    logger.info('SEARCH', `[JOB_EVALUATION] Final priority: ${applicationPriority}`);
    logger.info('SEARCH', `[JOB_EVALUATION] Recommendation: ${recommendation}`);

    this.cache.set(cacheKey, result);
    return result;
  }

  // --- PRIVATE EVALUATION HELPERS ---

  private evaluateSkills(job: JobListing, resume: MasterResume, fullJobText: string) {
    const candidateSkillSet = new Set<string>();
    const allResumeSkills = [
      ...(resume.skills?.languages || []),
      ...(resume.skills?.frameworks || []),
      ...(resume.skills?.cloudAndDevOps || []),
      ...(resume.skills?.databases || []),
      ...(resume.skills?.tools || []),
    ];

    allResumeSkills.forEach((s) => candidateSkillSet.add(s.toLowerCase()));

    const matched: string[] = [];
    const missing: string[] = [];

    allResumeSkills.forEach((skill) => {
      const sLower = skill.toLowerCase();
      if (fullJobText.includes(sLower)) {
        matched.push(skill);
      }
    });

    if (job.requirements && job.requirements.length > 0) {
      job.requirements.forEach((req) => {
        const reqLower = req.toLowerCase();
        if (!candidateSkillSet.has(reqLower) && !Array.from(candidateSkillSet).some((s) => reqLower.includes(s))) {
          missing.push(req);
        }
      });
    }

    const commonTechTerms = ['flutter', 'dart', 'react', 'typescript', 'node.js', 'go', 'python', 'kotlin', 'swift', 'docker', 'kubernetes', 'aws', 'gcp', 'graphql', 'postgresql', 'rust'];
    commonTechTerms.forEach((tech) => {
      if (fullJobText.includes(tech) && !candidateSkillSet.has(tech)) {
        missing.push(tech.charAt(0).toUpperCase() + tech.slice(1));
      }
    });

    const totalDistinctMissing = Array.from(new Set(missing));
    const score = Math.min(100, Math.max(10, Math.round((matched.length / Math.max(1, matched.length + totalDistinctMissing.length * 0.5)) * 100)));

    return { score, matched: Array.from(new Set(matched)), missing: totalDistinctMissing.slice(0, 5) };
  }

  private evaluateExperience(job: JobListing, resume: MasterResume, fullJobText: string) {
    const candidateYears = calculateResumeExperienceYears(resume);

    let requiredYears = 3;
    const yearMatches = fullJobText.match(/(\d+)\+?\s*(?:years|yrs)/i);
    if (yearMatches && yearMatches[1]) {
      requiredYears = parseInt(yearMatches[1], 10);
    }

    let score = 100;
    if (candidateYears < requiredYears) {
      const diff = requiredYears - candidateYears;
      score = Math.max(20, Math.round(100 - diff * 25));
    } else {
      score = 100;
    }

    return { score, candidateYears, requiredYears };
  }

  private evaluateRoleTitle(job: JobListing, resume: MasterResume): number {
    if (!resume.experience || resume.experience.length === 0) return 50;

    const titleLower = job.title.toLowerCase();
    const candidateRoles = resume.experience.map((e) => e.role.toLowerCase());

    if (candidateRoles.some((r) => r === titleLower)) return 100;
    if (candidateRoles.some((r) => titleLower.includes(r) || r.includes(titleLower))) return 90;

    const keywords = ['flutter', 'mobile', 'frontend', 'backend', 'full stack', 'software', 'engineer', 'developer'];
    const matchedCount = keywords.filter((k) => titleLower.includes(k) && candidateRoles.some((r) => r.includes(k))).length;

    if (matchedCount >= 2) return 85;
    if (matchedCount === 1) return 70;
    return 40;
  }

  private evaluateSeniority(job: JobListing, resume: MasterResume, fullJobText: string): number {
    const candidateYears = calculateResumeExperienceYears(resume);

    const isSeniorJob = fullJobText.includes('senior') || fullJobText.includes('sr.') || fullJobText.includes('lead') || fullJobText.includes('principal');
    const isJuniorJob = fullJobText.includes('junior') || fullJobText.includes('jr.') || fullJobText.includes('associate') || fullJobText.includes('intern');

    if (isSeniorJob && candidateYears >= 4) return 100;
    if (isSeniorJob && candidateYears < 3) return 50;
    if (isJuniorJob && candidateYears <= 3) return 100;
    if (isJuniorJob && candidateYears > 5) return 75;

    return 90;
  }

  private evaluateMandatoryRequirements(job: JobListing, resume: MasterResume, fullJobText: string) {
    const met: string[] = [];
    const missing: string[] = [];

    if (!job.description && (!job.requirements || job.requirements.length === 0)) {
      return { score: 100, met: ['Standard Software Engineer Requirements'], missing: [] };
    }

    const candidateText = `${resume.summary || ''} ${(resume.skills?.frameworks || []).join(' ')} ${(resume.experience || []).map((e) => (e.highlights || []).join(' ')).join(' ')}`.toLowerCase();

    if (fullJobText.includes('australian citizen') || fullJobText.includes('must be a citizen') || fullJobText.includes('security clearance')) {
      if (!candidateText.includes('citizen') && !candidateText.includes('security clearance')) {
        missing.push('Government Security Clearance / Australian Citizenship');
      } else {
        met.push('Work Eligibility');
      }
    }

    let score = 100;
    if (missing.length > 0) {
      score = Math.max(0, Math.round(100 - missing.length * 50));
    }

    return { score, met: Array.from(new Set(met)), missing: Array.from(new Set(missing)) };
  }

  private evaluateVisaCompatibility(job: JobListing, fullJobText: string) {
    const desc = fullJobText;

    // Check explicit denial FIRST
    if (desc.includes('no visa sponsorship') || desc.includes('no sponsorship') || desc.includes('must have existing work rights') || desc.includes('no visa assistance') || desc.includes('citizens or pr only')) {
      return {
        status: 'NOT_SUPPORTED' as const,
        score: 0,
        evidence: 'Job listing explicitly states no visa sponsorship is provided.',
      };
    }

    if (job.visaSponsorship === true || desc.includes('visa sponsorship available') || desc.includes('relocation & visa') || desc.includes('lmia approved') || desc.includes('eu blue card')) {
      return {
        status: 'CONFIRMED' as const,
        score: 100,
        evidence: 'Job listing explicitly confirms work permit & visa sponsorship support.',
      };
    }

    if (desc.includes('relocation') || desc.includes('work permit assistance') || desc.includes('sponsorship considered') || desc.includes('international candidates welcome')) {
      return {
        status: 'LIKELY' as const,
        score: 80,
        evidence: 'Job description contains relocation assistance and international applicant support clauses.',
      };
    }

    return {
      status: 'UNKNOWN' as const,
      score: 50,
      evidence: 'Visa sponsorship details not explicitly mentioned in job posting.',
    };
  }

  private evaluateLocationCompatibility(job: JobListing, resume: MasterResume) {
    if (job.isRemote) {
      return { status: 'COMPATIBLE' as const, score: 100 };
    }

    const candidateLoc = (resume.location || '').toLowerCase();
    const jobLoc = job.location.toLowerCase();

    if (candidateLoc.includes(job.country.toLowerCase()) || jobLoc.includes(candidateLoc)) {
      return { status: 'COMPATIBLE' as const, score: 95 };
    }

    return { status: 'LOCATION_MISMATCH' as const, score: 60 };
  }

  private evaluateRemoteCompatibility(job: JobListing): number {
    if (job.isRemote) return 100;
    if (job.isHybrid) return 85;
    return 70;
  }

  private evaluateEducation(job: JobListing, resume: MasterResume, fullJobText: string) {
    if (!resume.education || resume.education.length === 0) {
      return { score: 70, institutionMatch: false };
    }

    const hasDegree = resume.education.some((e) => e.degree.toLowerCase().includes('bachelor') || e.degree.toLowerCase().includes('master') || e.degree.toLowerCase().includes('computer science'));

    return {
      score: hasDegree ? 100 : 75,
      institutionMatch: hasDegree,
    };
  }

  private buildExplanation(
    job: JobListing,
    resume: MasterResume,
    priorityScore: number,
    recommendation: 'APPLY' | 'CONSIDER' | 'SKIP',
    skillAnalysis: { score: number; matched: string[]; missing: string[] },
    expAnalysis: { score: number; candidateYears: number; requiredYears: number },
    mandatoryAnalysis: { score: number; met: string[]; missing: string[] },
    visaAnalysis: { status: string; score: number; evidence: string }
  ) {
    const strengths: string[] = [];
    const risks: string[] = [];

    if (skillAnalysis.matched.length > 0) {
      strengths.push(`Strong alignment on key technical skills: ${skillAnalysis.matched.slice(0, 4).join(', ')}.`);
    }

    if (expAnalysis.candidateYears >= expAnalysis.requiredYears) {
      strengths.push(`Experience meets or exceeds required bar (${expAnalysis.candidateYears.toFixed(1)} yrs candidate vs ${expAnalysis.requiredYears} yrs required).`);
    } else {
      risks.push(`Candidate experience (${expAnalysis.candidateYears.toFixed(1)} yrs) is below stated job requirement (${expAnalysis.requiredYears} yrs).`);
    }

    if (visaAnalysis.status === 'CONFIRMED' || visaAnalysis.status === 'LIKELY') {
      strengths.push(`Visa sponsorship status: ${visaAnalysis.status} (${visaAnalysis.evidence}).`);
    } else if (visaAnalysis.status === 'NOT_SUPPORTED') {
      risks.push(`Visa sponsorship is explicitly not supported for this posting.`);
    } else {
      risks.push(`Visa sponsorship details are currently unknown.`);
    }

    if (skillAnalysis.missing.length > 0) {
      risks.push(`Missing target technical skills: ${skillAnalysis.missing.slice(0, 3).join(', ')}.`);
    }

    if (mandatoryAnalysis.missing.length > 0) {
      risks.push(`Unmet mandatory requirements: ${mandatoryAnalysis.missing.join(', ')}.`);
    }

    const matchedSkillsStr = skillAnalysis.matched.slice(0, 3).join('/') || 'Software Development';
    const reasoning = `${recommendation} recommendation (Application Priority: ${priorityScore}/100). Candidate presents strong ${matchedSkillsStr} alignment with ${expAnalysis.candidateYears.toFixed(1)} years of experience (role asks for ${expAnalysis.requiredYears}+ years). Main gap: ${skillAnalysis.missing[0] ? skillAnalysis.missing[0] : 'None'}. Visa sponsorship status: ${visaAnalysis.status}.`;

    return { strengths, risks, reasoning };
  }
}

export const jobEvaluationService = new JobEvaluationService();
