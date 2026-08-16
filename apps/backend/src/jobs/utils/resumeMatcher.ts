/**
 * @file src/jobs/utils/resumeMatcher.ts
 * @description Dynamic candidate resume matching and role relevance validation engine.
 */

import { JobListing, MasterResume } from '@sentinel/types';
import { calculateResumeExperienceYears } from './queryGenerator';

export interface CandidateTargetProfile {
  primaryRoles: string[];
  coreTechnologies: string[];
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
  const languages = (resume?.skills?.languages || []).map((s) => s.toLowerCase().trim());
  const frameworks = (resume?.skills?.frameworks || []).map((s) => s.toLowerCase().trim());
  const databases = (resume?.skills?.databases || []).map((s) => s.toLowerCase().trim());
  const tools = (resume?.skills?.tools || []).map((s) => s.toLowerCase().trim());
  const cloud = (resume?.skills?.cloudAndDevOps || []).map((s) => s.toLowerCase().trim());

  const allSkills = Array.from(new Set([...languages, ...frameworks, ...databases, ...tools, ...cloud])).filter((s) => s.length > 0);

  const experienceYears = resume ? calculateResumeExperienceYears(resume) : 3;
  let seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' = 'Mid';
  if (experienceYears >= 6) seniority = 'Senior';
  else if (experienceYears < 2) seniority = 'Junior';

  const primaryRoles = (resume?.experience || [])
    .map((e) => e.role)
    .filter((r): r is string => !!r && r.trim().length > 0);

  if (primaryRoles.length === 0) {
    if (frameworks.includes('flutter') || languages.includes('dart')) {
      primaryRoles.push('Flutter Developer');
    } else if (languages.includes('kotlin') || frameworks.includes('android')) {
      primaryRoles.push('Android Developer');
    } else if (languages.includes('swift') || frameworks.includes('uikit')) {
      primaryRoles.push('iOS Developer');
    } else {
      primaryRoles.push('Software Engineer');
    }
  }

  const coreTechnologies: string[] = [];
  const roleFamilies: string[] = [];

  const hasFlutter = allSkills.some((s) => s.includes('flutter') || s.includes('dart'));
  const hasAndroidNative = allSkills.some((s) => s.includes('kotlin') || s.includes('android sdk') || s.includes('aosp') || s.includes('jetpack'));
  const hasIosNative = allSkills.some((s) => s.includes('swift') || s.includes('uikit') || s.includes('xcode') || s.includes('objective-c'));
  const hasWebFrontend = allSkills.some((s) => s.includes('react') || s.includes('vue') || s.includes('angular') || s.includes('next') || s.includes('typescript'));
  const hasBackend = allSkills.some((s) => s.includes('node') || s.includes('express') || s.includes('python') || s.includes('django') || s.includes('java') || s.includes('spring') || s.includes('golang') || s.includes('go'));

  if (hasFlutter) {
    coreTechnologies.push('flutter', 'dart');
    roleFamilies.push('flutter', 'cross_platform_mobile', 'mobile');
  }
  if (hasAndroidNative) {
    coreTechnologies.push('kotlin', 'java', 'android sdk');
    roleFamilies.push('native_android', 'mobile');
  }
  if (hasIosNative) {
    coreTechnologies.push('swift', 'uikit', 'ios sdk');
    roleFamilies.push('native_ios', 'mobile');
  }
  if (hasWebFrontend) {
    roleFamilies.push('web_frontend');
  }
  if (hasBackend) {
    roleFamilies.push('backend_systems');
  }

  const prohibitedRoleTerms: string[] = [];
  // If candidate is a Flutter / Cross Platform candidate WITHOUT native Android skills in their resume:
  if (hasFlutter && !hasAndroidNative) {
    prohibitedRoleTerms.push(
      'android systems engineer',
      'android platform engineer',
      'android framework engineer',
      'android os engineer',
      'android infrastructure engineer',
      'android engineer',
      'android developer',
      'android sdk'
    );
  }
  // If candidate lacks native iOS skills:
  if (hasFlutter && !hasIosNative) {
    prohibitedRoleTerms.push(
      'ios engineer',
      'ios developer',
      'ios sdk engineer',
      'swift engineer'
    );
  }
  // Unrelated low-level or non-mobile systems engineering (unless candidate has hardware/c++ skills)
  if (hasFlutter && !allSkills.some((s) => s.includes('c++') || s.includes('embedded') || s.includes('firmware'))) {
    prohibitedRoleTerms.push(
      'camera firmware engineer',
      'camera software engineer',
      'embedded engineer',
      'firmware engineer',
      'c++ systems engineer',
      'aosp engineer'
    );
  }

  return {
    primaryRoles,
    coreTechnologies: Array.from(new Set(coreTechnologies)),
    secondaryTechnologies: allSkills.filter((s) => !coreTechnologies.includes(s)),
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

/**
 * Determines whether a job belongs to the candidate's actual career/role family.
 */
export function isRoleRelevant(
  job: JobListing,
  resume?: MasterResume | null,
  userQuery?: string
): boolean {
  if (!resume) {
    return true;
  }

  const title = (job.title || '').toLowerCase().trim();
  const description = (job.description || '').toLowerCase();
  const requirements = Array.isArray(job.requirements)
    ? job.requirements.join(' ').toLowerCase()
    : '';

  const fullContent = `${title} ${description} ${requirements}`;

  // Excluded non-engineering roles
  const excludedRoleTerms = [
    'account director', 'account executive', 'account manager', 'sales director',
    'sales manager', 'sales executive', 'marketing manager', 'marketing director',
    'recruiter', 'recruitment', 'human resources', 'hr manager', 'finance manager',
    'financial analyst', 'legal counsel', 'lawyer', 'operations manager',
    'project coordinator', 'administrative', 'customer success', 'customer support',
    'technical writer', 'content writer', 'copywriter', 'technical program manager',
    'program manager', 'product manager', 'product designer',
  ];

  if (excludedRoleTerms.some((term) => title.includes(term))) {
    return false;
  }

  const userQueryClean = (userQuery || '').toLowerCase().trim();

  // BUG 6: CUSTOM SEARCH INTENT OVERRIDES DEFAULT PROFILE TARGET
  if (userQueryClean.length > 0) {
    if (userQueryClean.includes('android')) {
      if (title.includes('android') || fullContent.includes('android')) {
        return true;
      }
    }
    if (userQueryClean.includes('ios') || userQueryClean.includes('swift')) {
      if (title.includes('ios') || fullContent.includes('swift')) {
        return true;
      }
    }
    if (userQueryClean.includes('flutter')) {
      return title.includes('flutter') || fullContent.includes('flutter') || fullContent.includes('dart');
    }
    if (userQueryClean.includes('backend') || userQueryClean.includes('go') || userQueryClean.includes('python')) {
      return title.includes('backend') || fullContent.includes('backend') || fullContent.includes(userQueryClean);
    }
  }

  // WORLDWIDE MODE (or no explicit query override): ENFORCE CANDIDATE TARGET PROFILE
  const targetProfile = deriveCandidateTargetProfile(resume);

  const isFlutterCandidate = targetProfile.coreTechnologies.includes('flutter');

  if (isFlutterCandidate) {
    const isFlutterTitle = title.includes('flutter') || title.includes('dart');
    if (isFlutterTitle) {
      return true;
    }

    const isProhibitedTitle = targetProfile.prohibitedRoleTerms.some((term) => title.includes(term));
    if (isProhibitedTitle) {
      const hasExplicitFlutterRequirement = fullContent.includes('flutter') || fullContent.includes('dart');
      if (!hasExplicitFlutterRequirement) {
        return false;
      }
    }

    const isMobileTitle = title.includes('mobile developer') || title.includes('mobile engineer') || title.includes('cross platform') || title.includes('software engineer - mobile');
    const isGenericTitle = title.includes('software engineer') || title.includes('software developer') || title.includes('full stack') || title.includes('full-stack');

    if (isMobileTitle || isGenericTitle) {
      const hasFlutterOrDart = fullContent.includes('flutter') || fullContent.includes('dart') || fullContent.includes('cross-platform') || fullContent.includes('cross platform');
      if (hasFlutterOrDart) {
        return true;
      }
      const isExplicitlyNativeOnly = (fullContent.includes('kotlin') || fullContent.includes('aosp') || fullContent.includes('uikit')) && !hasFlutterOrDart;
      if (isGenericTitle && !isExplicitlyNativeOnly) {
        return true;
      }
      if (isMobileTitle && !isExplicitlyNativeOnly) {
        return true;
      }
      return false;
    }
  } else {
    const candidateSkills = [
      ...(resume.skills?.languages || []),
      ...(resume.skills?.frameworks || []),
    ].map((s) => s.toLowerCase());

    const hasSkillMatch = candidateSkills.some((skill) => skill.length > 2 && fullContent.includes(skill));
    if (hasSkillMatch) return true;
  }

  return false;
}





