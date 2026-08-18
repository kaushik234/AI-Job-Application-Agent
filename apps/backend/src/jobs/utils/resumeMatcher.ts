/**
 * @file src/jobs/utils/resumeMatcher.ts
 * @description Dynamic candidate resume matching and role relevance validation engine.
 */

import { JobListing, MasterResume } from '@sentinel/types';
import { calculateResumeExperienceYears } from './queryGenerator';

export interface CandidateTargetProfile {
  primaryRoles: string[];
  coreTechnologies: string[];
  primaryTechnologies: string[];
  supportingTechnologies: string[];
  secondaryTechnologies: string[];
  roleFamilies: string[];
  prohibitedRoleTerms: string[];
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  experienceYears: number;
}

/**
 * Derives a generic CandidateTargetProfile from a MasterResume.
 * Does NOT hardcode any candidate-specific strings statically.
 */
export function deriveCandidateTargetProfile(resume?: MasterResume | null): CandidateTargetProfile {
  if (!resume) {
    return {
      primaryRoles: [],
      coreTechnologies: [],
      primaryTechnologies: [],
      supportingTechnologies: [],
      secondaryTechnologies: [],
      roleFamilies: [],
      prohibitedRoleTerms: [],
      seniority: 'Mid',
      experienceYears: 0,
    };
  }

  const rawLanguages = (resume.skills?.languages || []).map((s) => s.trim());
  const rawFrameworks = (resume.skills?.frameworks || []).map((s) => s.trim());
  const rawDatabases = (resume.skills?.databases || []).map((s) => s.trim());
  const rawTools = (resume.skills?.tools || []).map((s) => s.trim());
  const rawCloud = (resume.skills?.cloudAndDevOps || []).map((s) => s.trim());

  const allSkills = Array.from(new Set([...rawLanguages, ...rawFrameworks, ...rawDatabases, ...rawTools, ...rawCloud])).filter((s) => s.length > 0);
  const skillsLower = allSkills.map((s) => s.toLowerCase());

  const experienceYears = calculateResumeExperienceYears(resume);
  let seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' = 'Mid';
  if (experienceYears >= 6) seniority = 'Lead';
  else if (experienceYears >= 4) seniority = 'Senior';
  else if (experienceYears < 2) seniority = 'Junior';

  const nonEngTerms = [
    'account executive', 'account manager', 'sales manager', 'marketing manager',
    'recruiter', 'hr manager', 'finance manager', 'legal counsel', 'operations manager',
    'project coordinator', 'administrative', 'customer support', 'content writer',
    'social media manager', 'event marketing', 'gtm strategist'
  ];

  const primaryRoles = (resume.experience || [])
    .map((e) => e.role)
    .filter((r): r is string => !!r && r.trim().length > 0 && !nonEngTerms.some((term) => r.toLowerCase().includes(term)));

  const coreTechnologies: string[] = [...allSkills];
  const roleFamilies: string[] = [];

  const rolesText = primaryRoles.join(' ').toLowerCase();
  const frameworksText = rawFrameworks.join(' ').toLowerCase();
  const languagesText = rawLanguages.join(' ').toLowerCase();
  const expHighlights = (resume.experience || []).flatMap((e) => e.highlights || []).join(' ').toLowerCase();

  const primaryTechScan = `${rolesText} ${frameworksText} ${languagesText} ${expHighlights}`;

  if (/\b(?:flutter|dart)\b/.test(primaryTechScan)) {
    roleFamilies.push('flutter', 'cross_platform_mobile', 'mobile');
  }
  if (/\b(?:kotlin)\b/.test(primaryTechScan) || (/\b(?:android)\b/.test(rolesText) && !/\bflutter\b/.test(rolesText))) {
    roleFamilies.push('native_android', 'mobile');
  }
  if (/\b(?:swift|uikit)\b/.test(primaryTechScan) || (/\b(?:ios)\b/.test(rolesText) && !/\bflutter\b/.test(rolesText))) {
    roleFamilies.push('native_ios', 'mobile');
  }
  if (/\b(?:vue|angular|frontend)\b/.test(rolesText) || (/\b(?:react)\b/.test(rolesText) && !/\b(?:react\s+native)\b/.test(rolesText))) {
    roleFamilies.push('web_frontend', 'frontend');
  }
  if (/\b(?:node|nodejs|python|django|fastapi|golang|express|backend)\b/.test(rolesText) || (/\bjava\b/.test(rolesText) && !/\bjavascript\b/.test(rolesText))) {
    roleFamilies.push('backend_systems', 'backend');
  }
  if (/\b(?:spark|snowflake|data\s+engineer|etl|hadoop)\b/.test(rolesText) || /\b(?:data\s+engineer)\b/.test(primaryTechScan)) {
    roleFamilies.push('data_engineering', 'data');
  }
  if (/\b(?:devops|kubernetes|terraform)\b/.test(rolesText) || /\b(?:devops\s+engineer)\b/.test(primaryTechScan)) {
    roleFamilies.push('devops', 'cloud');
  }

  const prohibitedRoleTerms: string[] = [];
  const hasFlutter = roleFamilies.includes('flutter');
  const hasAndroidNative = roleFamilies.includes('native_android');
  const hasIosNative = roleFamilies.includes('native_ios');

  if (hasFlutter && !hasAndroidNative) {
    prohibitedRoleTerms.push('android systems engineer', 'android os', 'android kernel', 'android engineer', 'android developer', 'android sdk');
  }
  if (hasFlutter && !hasIosNative) {
    prohibitedRoleTerms.push('ios engineer', 'ios developer', 'swift engineer');
  }

  const PRIMARY_TECH_SET = new Set([
    'flutter', 'react native', 'react', 'next.js', 'vue', 'angular', 'node', 'node.js', 'nodejs', 'python', 'django',
    'fastapi', 'java', 'spring', 'golang', 'go', 'ruby', 'rails', 'c#', '.net', 'cpp', 'c++',
    'spark', 'snowflake', 'kotlin', 'swift'
  ]);

  const primaryTechs = Array.from(new Set(coreTechnologies.filter((t) => PRIMARY_TECH_SET.has(t.toLowerCase()))));
  const supportingTechs = Array.from(new Set(coreTechnologies.filter((t) => !PRIMARY_TECH_SET.has(t.toLowerCase()))));

  const primaryRolesSet = new Set<string>();
  for (const r of primaryRoles) {
    primaryRolesSet.add(r);
    const base = r.replace(/^(senior|lead|junior|principal|staff|associate)\s+/i, '').trim();
    if (base && base.length > 0) {
      primaryRolesSet.add(base);
    }
  }

  return {
    primaryRoles: Array.from(primaryRolesSet),
    coreTechnologies: Array.from(new Set(coreTechnologies)),
    primaryTechnologies: primaryTechs,
    supportingTechnologies: supportingTechs,
    secondaryTechnologies: [],
    roleFamilies: Array.from(new Set(roleFamilies)),
    prohibitedRoleTerms,
    seniority,
    experienceYears,
  };
}

/**
 * Calculates a dynamic, candidate-specific ATS compatibility match score (0-100%)
 */
export function calculateCandidateMatchScore(job: JobListing, resume?: MasterResume | null): number {
  if (!resume) {
    return 75;
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

  if (matchedTechCount === 0 && rolePts <= 4) {
    return Math.min(25, Math.max(10, totalScore));
  }

  return Math.min(99, Math.max(15, Math.round(totalScore)));
}

export interface RoleRelevanceDiagnostic {
  isRelevant: boolean;
  matchedKeywords: string[];
  missingKeywords: string[];
  reason: string;
}

/**
 * Determines whether a job belongs to the candidate's actual career/role family and returns detailed diagnostics.
 */
/**
 * Determines whether a job belongs to the candidate's actual career/role family and returns detailed diagnostics.
 */
export function checkRoleRelevanceDetails(
  job: JobListing,
  resume?: MasterResume | null,
  userQuery?: string
): RoleRelevanceDiagnostic {
  if (!resume) {
    return {
      isRelevant: true,
      matchedKeywords: ['broad_match'],
      missingKeywords: [],
      reason: 'No resume provided; defaulting to relevant.',
    };
  }

  const title = (job.title || '').toLowerCase().trim();
  const description = (job.description || '').toLowerCase();
  const requirements = Array.isArray(job.requirements)
    ? job.requirements.join(' ').toLowerCase()
    : '';

  const fullContent = `${title} ${description} ${requirements}`;

  // 1. Excluded non-engineering roles
  const excludedRoleTerms = [
    'account director', 'account executive', 'account manager', 'sales director',
    'sales manager', 'sales executive', 'marketing manager', 'marketing director',
    'recruiter', 'recruitment', 'human resources', 'hr manager', 'finance manager',
    'financial analyst', 'legal counsel', 'lawyer', 'operations manager',
    'project coordinator', 'administrative', 'customer success', 'customer support',
    'technical writer', 'content writer', 'copywriter', 'technical program manager',
    'program manager', 'product manager', 'product designer', 'sales engineer',
    'revenue operations', 'event marketing', 'gtm strategist', 'social media manager'
  ];

  const matchedExcluded = excludedRoleTerms.filter((term) => title.includes(term));
  if (matchedExcluded.length > 0) {
    return {
      isRelevant: false,
      matchedKeywords: matchedExcluded,
      missingKeywords: ['software_engineering'],
      reason: `Excluded non-engineering role title containing "${matchedExcluded.join(', ')}"`,
    };
  }

  const targetProfile = deriveCandidateTargetProfile(resume);

  // 2. User Query Explicit Override (CUSTOM Mode)
  const userQueryClean = (userQuery || '').toLowerCase().trim();
  if (userQueryClean.length > 0) {
    const qTokens = userQueryClean.split(/\s+/).filter((t) => t.length > 2);
    const isMatch = qTokens.some((t) => fullContent.includes(t) || title.includes(t));
    if (isMatch) {
      return {
        isRelevant: true,
        matchedKeywords: qTokens.filter((t) => fullContent.includes(t) || title.includes(t)),
        missingKeywords: [],
        reason: `Job content or title matches custom user query "${userQueryClean}".`,
      };
    }
  }

  // 3. Prohibited Role Terms & Native Title Check
  const titleLower = title.toLowerCase();
  const matchedProhibited = targetProfile.prohibitedRoleTerms.filter((term) => titleLower.includes(term.toLowerCase()));
  if (matchedProhibited.length > 0) {
    return {
      isRelevant: false,
      matchedKeywords: [],
      missingKeywords: matchedProhibited,
      reason: `Role title contains prohibited term "${matchedProhibited.join(', ')}" incompatible with candidate profile.`,
    };
  }

  const isMobileCandidate = targetProfile.roleFamilies.some((f) =>
    ['flutter', 'cross_platform_mobile', 'mobile'].includes(f)
  );
  const isBackendCandidate = targetProfile.roleFamilies.some((f) =>
    ['backend_systems', 'backend'].includes(f)
  );
  const isFrontendCandidate = targetProfile.roleFamilies.some((f) =>
    ['web_frontend', 'frontend'].includes(f)
  );
  const isDataCandidate = targetProfile.roleFamilies.some((f) =>
    ['data_engineering', 'data'].includes(f)
  );
  const isDevOpsCandidate = targetProfile.roleFamilies.some((f) =>
    ['devops', 'cloud'].includes(f)
  );

  const hasAndroidNative = targetProfile.roleFamilies.includes('native_android');
  const hasIosNative = targetProfile.roleFamilies.includes('native_ios');

  if (isMobileCandidate && !hasAndroidNative) {
    if (titleLower.includes('android') && !titleLower.includes('flutter') && !description.includes('flutter')) {
      return {
        isRelevant: false,
        matchedKeywords: [],
        missingKeywords: ['flutter'],
        reason: `Native Android role title "${job.title}" is incompatible with candidate Flutter profile.`,
      };
    }
  }

  if (isMobileCandidate && !hasIosNative) {
    if (
      (titleLower.includes('ios engineer') || titleLower.includes('ios developer') || titleLower.includes('swift engineer') || titleLower.includes('swift developer')) &&
      !titleLower.includes('flutter') &&
      !description.includes('flutter')
    ) {
      return {
        isRelevant: false,
        matchedKeywords: [],
        missingKeywords: ['flutter'],
        reason: `Native iOS role title "${job.title}" is incompatible with candidate Flutter profile.`,
      };
    }
  }

  // 4. Role Family & Tech Matching
  const matchedTechs = targetProfile.coreTechnologies.filter(
    (tech) => fullContent.includes(tech.toLowerCase()) || title.includes(tech.toLowerCase())
  );
  const matchedPrimaryTechs = targetProfile.primaryTechnologies.filter(
    (tech) => fullContent.includes(tech.toLowerCase()) || title.includes(tech.toLowerCase())
  );

  const isJobMobile =
    title.includes('mobile') ||
    title.includes('flutter') ||
    title.includes('dart') ||
    title.includes('ios') ||
    title.includes('android') ||
    title.includes('swift') ||
    title.includes('kotlin') ||
    description.includes('flutter') ||
    description.includes('mobile architecture') ||
    description.includes('ios/android');

  const isJobBackend =
    title.includes('backend') ||
    title.includes('node') ||
    title.includes('python') ||
    title.includes('django') ||
    title.includes('java') ||
    title.includes('express') ||
    title.includes('api engineer') ||
    (description.includes('golang') && description.includes('kubernetes')) ||
    (description.includes('microservices') && description.includes('distributed systems'));

  const isJobData =
    title.includes('data engineer') ||
    title.includes('etl') ||
    title.includes('pyspark') ||
    title.includes('snowflake') ||
    title.includes('data platform');

  const isJobDevOps =
    title.includes('devops') ||
    title.includes('infrastructure') ||
    title.includes('cloud engineer') ||
    title.includes('site reliability');

  // Domain Alignment Logic
  if (isMobileCandidate) {
    if ((isJobBackend && !isBackendCandidate) || (isJobData && !isDataCandidate) || (isJobDevOps && !isDevOpsCandidate)) {
      if (!isJobMobile && !description.includes('flutter') && !description.includes('mobile')) {
        return {
          isRelevant: false,
          matchedKeywords: [],
          missingKeywords: targetProfile.primaryTechnologies,
          reason: `Job content for "${job.title}" specifies an incompatible backend/data/cloud stack.`,
        };
      }
    }

    if (isJobMobile || matchedPrimaryTechs.length > 0) {
      return {
        isRelevant: true,
        matchedKeywords: matchedTechs.length > 0 ? matchedTechs : ['mobile_role'],
        missingKeywords: [],
        reason: `Mobile software engineering role "${job.title}" aligns with candidate target profile.`,
      };
    }
  }

  if (isBackendCandidate) {
    if (isJobBackend || matchedPrimaryTechs.length > 0) {
      return {
        isRelevant: true,
        matchedKeywords: matchedTechs.length > 0 ? matchedTechs : ['backend_role'],
        missingKeywords: [],
        reason: `Backend software engineering role "${job.title}" aligns with candidate target profile.`,
      };
    }
    if ((isJobMobile && !isMobileCandidate) || (isJobData && !isDataCandidate)) {
      return {
        isRelevant: false,
        matchedKeywords: [],
        missingKeywords: targetProfile.coreTechnologies,
        reason: `Job content for "${job.title}" specifies a mobile/data domain incompatible with backend profile.`,
      };
    }
  }

  if (isDataCandidate) {
    if (isJobData || matchedPrimaryTechs.length > 0) {
      return {
        isRelevant: true,
        matchedKeywords: matchedTechs.length > 0 ? matchedTechs : ['data_role'],
        missingKeywords: [],
        reason: `Data engineering role "${job.title}" aligns with candidate target profile.`,
      };
    }
    if ((isJobMobile && !isMobileCandidate) || (isJobBackend && !isBackendCandidate)) {
      return {
        isRelevant: false,
        matchedKeywords: [],
        missingKeywords: targetProfile.coreTechnologies,
        reason: `Job content for "${job.title}" is incompatible with candidate data engineering profile.`,
      };
    }
  }

  // Generic Software Engineer / Developer Roles
  const isGenericEngineeringTitle =
    title.includes('software engineer') ||
    title.includes('software developer') ||
    title.includes('full stack') ||
    title.includes('full-stack') ||
    title.includes('application engineer') ||
    title.includes('developer');

  if (isGenericEngineeringTitle) {
    // If description has explicit conflicting domain tech with 0 candidate tech matches, reject
    if (
      matchedTechs.length === 0 &&
      ((description.includes('kubernetes') && description.includes('golang')) ||
        (description.includes('c++') && description.includes('embedded')) ||
        (description.includes('spark') && description.includes('hadoop')))
    ) {
      return {
        isRelevant: false,
        matchedKeywords: [],
        missingKeywords: targetProfile.coreTechnologies,
        reason: `Generic engineering role "${job.title}" description requires incompatible domain tech with 0 candidate skill match.`,
      };
    }

    return {
      isRelevant: true,
      matchedKeywords: matchedTechs.length > 0 ? matchedTechs : ['software_engineering'],
      missingKeywords: [],
      reason: `Software engineering role "${job.title}" is compatible with candidate profile.`,
    };
  }

  return {
    isRelevant: false,
    matchedKeywords: matchedTechs,
    missingKeywords: targetProfile.coreTechnologies,
    reason: `Job title "${job.title}" does not align with candidate target profile families [${targetProfile.roleFamilies.join(', ')}].`,
  };
}

/**
 * Legacy boolean wrapper for role relevance.
 */
export function isRoleRelevant(
  job: JobListing,
  resume?: MasterResume | null,
  userQuery?: string
): boolean {
  return checkRoleRelevanceDetails(job, resume, userQuery).isRelevant;
}
