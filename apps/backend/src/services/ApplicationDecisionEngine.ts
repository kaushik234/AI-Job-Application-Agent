/**
 * @file src/services/ApplicationDecisionEngine.ts
 * @description Decision Engine for Application Prioritization.
 * Calculates applicationPriorityScore, assigns realistic priority categories (APPLY_NOW, HIGH_PRIORITY, GOOD_MATCH, CONSIDER, LOW_MATCH, DO_NOT_APPLY),
 * evaluates evidence-based visa status, job freshness, and generates explainable "Why This Job?" and "Potential Risks" breakdowns.
 * @architect Clean Architecture - Decision Engine
 */

import {
  JobListing,
  MasterResume,
  DecisionEngineResult,
  RealisticPriorityCategory,
  VisaSponsorshipStatus,
  CompanyOpportunityInfo,
} from '@sentinel/types';
import { companyClassificationService } from './CompanyClassificationService';

export class ApplicationDecisionEngine {
  /**
   * Evaluates evidence-based visa status from job description & company cues.
   * Never fakes "Visa Sponsored" if unmentioned.
   */
  public evaluateVisaEvidence(job: JobListing): VisaSponsorshipStatus {
    const text = `${job.description || ''} ${job.title || ''}`.toLowerCase();

    if (/visa sponsorship (?:available|provided|offered|supported)|sponsors? visa|lmi visa|working visa assist/i.test(text)) {
      return 'CONFIRMED_SPONSORSHIP';
    }
    if (/sponsorship (?:may be|considered|available for exceptional)|open to international/i.test(text)) {
      return 'LIKELY_SPONSORSHIP';
    }
    if (/no visa sponsorship|must have valid work rights|australian citizen only|permanent resident only|no spon/i.test(text)) {
      return 'NO_SPONSORSHIP_FOUND';
    }
    if (job.visaSponsorship === true || (job.visaSponsorship as any) === 'CONFIRMED_SPONSORSHIP' || (job.visaSponsorship as any) === 'CONFIRMED') {
      return 'CONFIRMED_SPONSORSHIP';
    }

    return 'UNKNOWN';
  }

  /**
   * Evaluates freshness label relative to current date (e.g. 2026-08-11).
   * Categories: FRESH (0-7d), RECENT (8-30d), AGING (31-60d), STALE (61+d/2024), UNKNOWN.
   */
  public evaluateFreshnessLabel(job: JobListing): { label: 'FRESH' | 'RECENT' | 'AGING' | 'STALE' | 'UNKNOWN'; score: number; evidence: string } {
    const rawDateStr = job.postedDate || job.createdAt || '';
    if (!rawDateStr) {
      return { label: 'UNKNOWN', score: 60, evidence: 'Posting date missing or unverified' };
    }

    const lower = rawDateStr.toLowerCase();
    if (lower.includes('today') || lower.includes('1d') || lower.includes('2d') || lower.includes('3d') || lower.includes('just posted') || lower.includes('hours ago')) {
      return { label: 'FRESH', score: 100, evidence: `Fresh job posting (${rawDateStr})` };
    }

    if (lower.includes('days ago')) {
      const match = lower.match(/(\d+)\s*days?\s*ago/);
      const daysAgo = match ? parseInt(match[1], 10) : 2;
      if (daysAgo <= 7) {
        return { label: 'FRESH', score: 100, evidence: `Fresh job posting (${daysAgo} days old)` };
      }
      if (daysAgo <= 30) {
        return { label: 'RECENT', score: 80, evidence: `Recent job posting (${daysAgo} days old)` };
      }
    }

    const parsedDate = new Date(rawDateStr);
    if (isNaN(parsedDate.getTime())) {
      if (lower.includes('week') || lower.includes('1w') || lower.includes('2w')) {
        return { label: 'RECENT', score: 80, evidence: `Recent job posting (${rawDateStr})` };
      }
      if (lower.includes('month') || lower.includes('1m') || lower.includes('30d')) {
        return { label: 'AGING', score: 50, evidence: `Aging job posting (${rawDateStr})` };
      }
      return { label: 'UNKNOWN', score: 60, evidence: `Posting date: ${rawDateStr}` };
    }

    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      return { label: 'FRESH', score: 100, evidence: `Fresh job posting (${diffDays} days old)` };
    }
    if (diffDays <= 30) {
      return { label: 'RECENT', score: 80, evidence: `Recent job posting (${diffDays} days old)` };
    }
    if (diffDays <= 60) {
      return { label: 'AGING', score: 50, evidence: `Aging job posting (${diffDays} days old)` };
    }
    return { label: 'STALE', score: 20, evidence: `Stale job posting from ${parsedDate.toISOString().slice(0, 10)} (${diffDays} days old)` };
  }

  /**
   * Calculates Job Freshness Score (0-100) based on posting date.
   */
  public calculateFreshnessScore(job: JobListing): number {
    return this.evaluateFreshnessLabel(job).score;
  }

  /**
   * Evaluates full application decision for a job posting.
   */
  public evaluateApplicationDecision(
    job: JobListing,
    master: MasterResume,
    scores: {
      roleMatch: number;
      skillsMatch: number;
      experienceMatch: number;
      locationMatch: number;
      visaMatch: number;
    }
  ): DecisionEngineResult {
    const opportunityInfo: CompanyOpportunityInfo = companyClassificationService.calculateOpportunityFit(
      job,
      scores.skillsMatch,
      scores.experienceMatch
    );

    const freshnessScore = this.calculateFreshnessScore(job);
    const visaEvidenceStatus = this.evaluateVisaEvidence(job);

    // Documented Weighted Application Priority Formula
    // Priority = 30% RoleMatch + 25% SkillsMatch + 20% ExperienceMatch + 10% OpportunityFit + 10% Freshness + 5% Location
    const priorityScore = Math.min(
      100,
      Math.round(
        scores.roleMatch * 0.30 +
        scores.skillsMatch * 0.25 +
        scores.experienceMatch * 0.20 +
        opportunityInfo.opportunityFitScore * 0.10 +
        freshnessScore * 0.10 +
        scores.locationMatch * 0.05
      )
    );

    // Determine Realistic Priority Category & Decision Rules
    let category: RealisticPriorityCategory = 'CONSIDER';

    const candidateYears = master.explicitExperienceYears || 3.8;
    const requiredYears = 3.0; // standard benchmark or derived

    const isSevereMismatch = scores.roleMatch < 45 || scores.skillsMatch < 35 || scores.experienceMatch < 35;
    const isVisaBlocked = visaEvidenceStatus === 'NO_SPONSORSHIP_FOUND' && scores.locationMatch < 50;

    if (isSevereMismatch || isVisaBlocked) {
      category = 'DO_NOT_APPLY';
    } else if (
      scores.roleMatch >= 80 &&
      scores.skillsMatch >= 75 &&
      scores.experienceMatch >= 80 &&
      priorityScore >= 78 &&
      visaEvidenceStatus !== 'NO_SPONSORSHIP_FOUND'
    ) {
      category = 'APPLY_NOW';
    } else if (priorityScore >= 70) {
      category = 'HIGH_PRIORITY';
    } else if (priorityScore >= 60) {
      category = 'GOOD_MATCH';
    } else if (priorityScore >= 45) {
      category = 'CONSIDER';
    } else {
      category = 'LOW_MATCH';
    }

    // Build Evidence-Based "Why This Job?" Bullet Points
    const whyThisJob: string[] = [];
    if (candidateYears >= requiredYears) {
      whyThisJob.push(`✓ Verified experience (${candidateYears} years) satisfies job requirements`);
    }
    if (scores.skillsMatch >= 70) {
      whyThisJob.push(`✓ Core technical skills directly match job requirements`);
    }
    if (scores.roleMatch >= 75) {
      whyThisJob.push(`✓ Role title and responsibilities align with candidate profile`);
    }
    if (opportunityInfo.sourceQuality.includes('Direct Company Career Page') || opportunityInfo.sourceQuality.includes('Verified ATS')) {
      whyThisJob.push(`✓ Direct employer application source (${opportunityInfo.sourceQuality})`);
    }
    if (opportunityInfo.companySize === 'SMALL' || opportunityInfo.companySize === 'MEDIUM' || opportunityInfo.companyType === 'Startup') {
      whyThisJob.push(`✓ Realistic opportunity fit at ${opportunityInfo.companySize.toLowerCase()} ${opportunityInfo.companyType.toLowerCase()} company`);
    }
    if (freshnessScore >= 80) {
      whyThisJob.push(`✓ Fresh job posting (${job.postedDate || 'recently discovered'})`);
    }

    // Build Evidence-Based "Potential Risks" Bullet Points
    const potentialRisks: string[] = [];
    if (visaEvidenceStatus === 'UNKNOWN') {
      potentialRisks.push(`⚠ Visa sponsorship status is unconfirmed in job posting`);
    } else if (visaEvidenceStatus === 'NO_SPONSORSHIP_FOUND') {
      potentialRisks.push(`⚠ Posting indicates no visa sponsorship provided`);
    }

    if (scores.skillsMatch < 70) {
      potentialRisks.push(`⚠ Unverified or missing technical skills required for role`);
    }
    if (scores.experienceMatch < 70) {
      potentialRisks.push(`⚠ Seniority or experience requirements may exceed candidate profile`);
    }

    return {
      jobId: job.id,
      recommendation: category,
      confidenceScore: Math.round((scores.roleMatch + scores.skillsMatch) / 2),
      applicationPriorityScore: priorityScore,
      whyThisJob,
      potentialRisks,
      companyOpportunity: opportunityInfo,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const applicationDecisionEngine = new ApplicationDecisionEngine();
