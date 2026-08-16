/**
 * @file src/jobs/utils/resumeMatcher.ts
 * @description Dynamic deterministic candidate resume matching algorithm calculating real ATS compatibility scores.
 */

import { JobListing, MasterResume } from '@sentinel/types';
import { calculateResumeExperienceYears } from './queryGenerator';

/**
 * Calculates a dynamic, candidate-specific ATS compatibility match score (0-100%)
 * based on 11 deterministic dimensions with fixed weightings:
 * - Skills & Core Tech (35%)
 * - Technologies & Frameworks (25%)
 * - Job Title & Role Similarity (20%)
 * - Seniority & Experience Alignment (10%)
 * - Location & Remote Preferences (5%)
 * - Visa Sponsorship & Other Factors (5%)
 */
export function calculateCandidateMatchScore(job: JobListing, resume?: MasterResume | null): number {
  if (!resume) {
    return 75; // Default baseline if no resume uploaded
  }

  const titleLower = (job.title || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const reqsLower = (Array.isArray(job.requirements) ? job.requirements : []).join(' ').toLowerCase();
  const fullText = `${titleLower} ${(job.company || '').toLowerCase()} ${descLower} ${reqsLower}`;

  // 1. Role & Title Similarity (max 20 pts)
  let rolePts = 0;
  const recentRoles = (resume.experience || [])
    .map((e) => (e.role || '').toLowerCase())
    .filter((r) => r.length > 0);

  for (const role of recentRoles) {
    const tokens = role.split(/\s+/).filter((t) => t.length > 2 && !['senior', 'junior', 'lead', 'principal', 'staff', 'developer', 'engineer', 'architect', 'manager'].includes(t));
    for (const token of tokens) {
      if (titleLower.includes(token)) {
        rolePts += 10;
      } else if (fullText.includes(token)) {
        rolePts += 4;
      }
    }
  }
  // Title role overlap check
  if (titleLower.includes('developer') || titleLower.includes('engineer') || titleLower.includes('architect')) {
    rolePts += 4;
  }
  rolePts = Math.min(20, rolePts);

  // 2. Skills, Languages & Frameworks Overlap (max 60 pts total: 35 skills + 25 frameworks/tech)
  let skillPts = 0;
  const languages = (resume.skills?.languages || []).map((s) => s.toLowerCase());
  const frameworks = (resume.skills?.frameworks || []).map((s) => s.toLowerCase());
  const databases = (resume.skills?.databases || []).map((s) => s.toLowerCase());
  const tools = (resume.skills?.tools || []).map((s) => s.toLowerCase());
  const cloud = (resume.skills?.cloudAndDevOps || []).map((s) => s.toLowerCase());

  const allTechSkills = [...languages, ...frameworks, ...databases, ...tools, ...cloud].filter((s) => s.trim().length > 0);

  let matchedTechCount = 0;
  for (const tech of allTechSkills) {
    if (fullText.includes(tech)) {
      matchedTechCount++;
    }
  }

  if (allTechSkills.length > 0) {
    // Prevent inflation when candidate has many technologies. Use the larger of 10 or the candidate's tech count as denominator.
    const denominator = Math.max(10, allTechSkills.length);
    const techRatio = matchedTechCount / denominator;
    skillPts = Math.round(techRatio * 60);
  }
  skillPts = Math.min(60, skillPts);

  // 3. Seniority & Experience Alignment (max 10 pts)
  let seniorityPts = 0;
  const years = calculateResumeExperienceYears(resume);
  const isSeniorJob = titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal') || titleLower.includes('staff') || titleLower.includes('architect');
  const isJuniorJob = titleLower.includes('junior') || titleLower.includes('entry') || titleLower.includes('associate');

  if (years >= 5 && isSeniorJob) {
    seniorityPts = 10;
  } else if (years >= 2 && years < 5 && !isSeniorJob && !isJuniorJob) {
    seniorityPts = 10;
  } else if (years < 2 && isJuniorJob) {
    seniorityPts = 10;
  } else {
    seniorityPts = 5;
  }

  // 4. Location & Remote Compatibility (max 5 pts)
  let locationPts = 0;
  if (job.isRemote) {
    locationPts += 5;
  } else if (resume.location && job.location && job.location.toLowerCase().includes(resume.location.toLowerCase())) {
    locationPts += 5;
  } else {
    locationPts += 2;
  }

  // 5. Visa Sponsorship Alignment (max 5 pts)
  let visaPts = 0;
  if (job.visaSponsorship === true) {
    visaPts = 5;
  }

  const totalScore = rolePts + skillPts + seniorityPts + locationPts + visaPts;

  // Unrelated job penalty (e.g. painter searched against software engineer resume)
  if (matchedTechCount === 0 && rolePts <= 4) {
    return Math.min(25, Math.max(10, totalScore));
  }

  return Math.min(99, Math.max(15, Math.round(totalScore)));
}

/**
 * Determines whether a job belongs to the candidate's actual career/role family.
 *
 * This is intentionally stricter than the numeric match score.
 * A job can mention Flutter/JavaScript/etc. in its description while still
 * being completely unrelated to the candidate's role.
 */
export function isRoleRelevant(
  job: JobListing,
  resume?: MasterResume | null,
): boolean {
  if (!resume) {
    return true; // No resume means we can't filter, keep job
  }

  const title = (job.title || '').toLowerCase().trim();
  const description = (job.description || '').toLowerCase();
  const requirements = Array.isArray(job.requirements)
    ? job.requirements.join(' ').toLowerCase()
    : '';

  const searchableText = `${title} ${description} ${requirements}`;

  // Clearly unrelated job families.
  const excludedRoleTerms = [
    'account director',
    'account executive',
    'account manager',
    'sales director',
    'sales manager',
    'sales executive',
    'marketing manager',
    'marketing director',
    'recruiter',
    'recruitment',
    'human resources',
    'hr manager',
    'finance manager',
    'financial analyst',
    'legal counsel',
    'lawyer',
    'operations manager',
    'project coordinator',
    'administrative',
    'customer success',
    'customer support',
    'technical writer',
    'content writer',
    'copywriter',
    'technical program manager',
    'program manager',
    'product manager',
    'product designer',
  ];

  // Hard reject obviously unrelated non-engineering roles.
  if (excludedRoleTerms.some((term) => title.includes(term))) {
    return false;
  }

  // 1. Dynamic candidate skills & role keywords from resume
  const candidateSkills = [
    ...(resume.skills?.languages || []),
    ...(resume.skills?.frameworks || []),
    ...(resume.skills?.databases || []),
    ...(resume.skills?.tools || []),
    ...(resume.skills?.cloudAndDevOps || []),
  ].map((s) => s.toLowerCase().trim()).filter((s) => s.length > 1);

  const candidateRoles = (resume.experience || [])
    .map((e) => (e.role || '').toLowerCase().trim())
    .filter((r) => r.length > 0);

  const isFlutterMobileCandidate = candidateSkills.some((s) => s.includes('flutter') || s.includes('dart') || s.includes('mobile'));

  const targetRoleTerms: string[] = [];
  if (isFlutterMobileCandidate) {
    targetRoleTerms.push('flutter', 'dart', 'mobile developer', 'mobile engineer', 'mobile application', 'cross platform', 'cross-platform', 'ios', 'android');
  }

  for (const role of candidateRoles) {
    targetRoleTerms.push(role);
  }

  // Strongest signal: job title matches candidate target terms
  if (targetRoleTerms.some((term) => term.length > 2 && title.includes(term))) {
    return true;
  }

  // Generic software engineering titles
  const genericSoftwareTitleTerms = [
    'software engineer',
    'software developer',
    'application engineer',
    'application developer',
    'full stack engineer',
    'full-stack engineer',
    'full stack developer',
    'full-stack developer',
    'backend engineer',
    'frontend engineer',
  ];

  const isGenericSoftwareTitle = genericSoftwareTitleTerms.some((term) => title.includes(term));

  if (isGenericSoftwareTitle) {
    const hasSkillMatch = candidateSkills.some((skill) => searchableText.includes(skill));
    if (hasSkillMatch || candidateSkills.length === 0) {
      return true;
    }
  }

  return false;
}





