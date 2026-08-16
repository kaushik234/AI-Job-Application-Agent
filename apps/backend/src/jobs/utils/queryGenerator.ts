/**
 * @file src/jobs/utils/queryGenerator.ts
 * @description Dynamic search query generator deriving targeted, role-oriented search terms from candidate's MasterResume.
 */

import { MasterResume } from '@sentinel/types';

export interface DerivedJobQueries {
  userQuery?: string;
  primaryQueries: string[];
  resumeQueries: string[];
  keywords: string[];
  primaryRole: string;
  seniorityLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  totalYearsExperience: number;
}

/**
 * Calculates candidate experience years from resume work experience items.
 */
export function calculateResumeExperienceYears(resume?: MasterResume | null): number {
  if (!resume) return 3.8;
  if (resume.explicitExperienceYears && resume.explicitExperienceYears > 0) {
    return resume.explicitExperienceYears;
  }

  // Check for explicit statements such as "FLUTTER DEVELOPER (3.8 YEARS)" or "3.8 years"
  const textToScan = `${resume.summary || ''} ${resume.fullName || ''} ${(resume.experience || []).map((e) => `${e.role} ${e.company}`).join(' ')}`;
  const explicitMatch = textToScan.match(/(\d+\.\d+|\d+)\s*(?:years|yrs)/i);
  if (explicitMatch && explicitMatch[1]) {
    const val = parseFloat(explicitMatch[1]);
    if (val > 0 && val <= 30) {
      return val;
    }
  }

  if (!resume.experience || resume.experience.length === 0) {
    return 3.8;
  }
  let totalMonths = 0;
  for (const exp of resume.experience) {
    if (exp.startDate) {
      const start = new Date(exp.startDate);
      const end = exp.endDate && exp.endDate.toLowerCase() !== 'present' ? new Date(exp.endDate) : new Date();
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += Math.max(1, diffMonths);
      } else {
        totalMonths += 12;
      }
    }
  }
  return Math.max(1, Number((totalMonths / 12).toFixed(1)));
}

/**
 * Derives clean, candidate-specific job search keywords from MasterResume dynamically.
 * If userQuery is provided explicitly, it is prioritized as the primary effective search keyword.
 */
export function deriveSearchQueriesFromResume(resume?: MasterResume | null, userQuery?: string): DerivedJobQueries {
  const userQueryClean = userQuery && userQuery.trim().length > 0 ? userQuery.trim() : undefined;
  const primaryQueriesSet = new Set<string>();
  const resumeQueriesSet = new Set<string>();

  const totalYearsExperience = calculateResumeExperienceYears(resume);
  let seniorityLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead' = 'Mid';
  if (totalYearsExperience >= 6) {
    seniorityLevel = 'Lead';
  } else if (totalYearsExperience >= 4) {
    seniorityLevel = 'Senior';
  } else if (totalYearsExperience < 2) {
    seniorityLevel = 'Junior';
  }

  // 1. Primary role from recent work experience
  let primaryRole = 'Software Engineer';
  if (resume?.experience && resume.experience.length > 0) {
    const recentRole = resume.experience[0].role;
    if (recentRole && recentRole.trim().length > 0) {
      primaryRole = recentRole.trim();
      primaryQueriesSet.add(primaryRole);
      resumeQueriesSet.add(primaryRole);
    }
  }

  const allSkills = [
    ...(resume?.skills?.languages || []),
    ...(resume?.skills?.frameworks || []),
    ...(resume?.skills?.cloudAndDevOps || []),
    ...(resume?.skills?.databases || []),
    ...(resume?.skills?.tools || []),
  ].map((s) => s.trim()).filter((s) => s.length > 0);

  const skillsLower = allSkills.map((s) => s.toLowerCase());

  // 2. High-value primary role derivations
  const isFlutter = skillsLower.some((s) => s.includes('flutter') || s.includes('dart'));
  const isReact = skillsLower.some((s) => s.includes('react') || s.includes('vue') || s.includes('angular') || s.includes('next'));
  const isBackend = skillsLower.some((s) => s.includes('node') || s.includes('python') || s.includes('java') || s.includes('go') || s.includes('express'));
  const isDevOps = skillsLower.some((s) => s.includes('aws') || s.includes('docker') || s.includes('kubernetes') || s.includes('devops') || s.includes('terraform'));

  if (isFlutter) {
    primaryQueriesSet.add('Flutter Developer');
    primaryQueriesSet.add('Flutter Engineer');
    primaryQueriesSet.add('Mobile Developer');
    primaryQueriesSet.add('Mobile Engineer');
    primaryQueriesSet.add('Software Engineer - Mobile');

    resumeQueriesSet.add('Flutter Developer');
    resumeQueriesSet.add('Flutter Engineer');
    resumeQueriesSet.add('Mobile Developer');
    resumeQueriesSet.add('Mobile Engineer');
    resumeQueriesSet.add('Software Engineer - Mobile');
    if (seniorityLevel === 'Senior' || seniorityLevel === 'Lead') {
      resumeQueriesSet.add('Senior Flutter Developer');
      resumeQueriesSet.add('Senior Flutter Engineer');
      resumeQueriesSet.add('Lead Mobile Engineer');
    }
    resumeQueriesSet.add('Cross Platform Developer');
    resumeQueriesSet.add('Dart Developer');
  }

  if (isReact) {
    primaryQueriesSet.add('Frontend Engineer');
    primaryQueriesSet.add('Frontend Developer');
    primaryQueriesSet.add('Full Stack Engineer');
    primaryQueriesSet.add('React Developer');

    resumeQueriesSet.add('Frontend Engineer');
    resumeQueriesSet.add('Frontend Developer');
    resumeQueriesSet.add('Full Stack Engineer');
    resumeQueriesSet.add('React Developer');
    if (seniorityLevel === 'Senior' || seniorityLevel === 'Lead') {
      resumeQueriesSet.add('Senior Frontend Engineer');
      resumeQueriesSet.add('Senior Full Stack Engineer');
    }
  }

  if (isBackend) {
    primaryQueriesSet.add('Backend Engineer');
    primaryQueriesSet.add('Software Engineer');

    resumeQueriesSet.add('Backend Engineer');
    resumeQueriesSet.add('Software Engineer');
    resumeQueriesSet.add('Node.js Developer');
    if (seniorityLevel === 'Senior' || seniorityLevel === 'Lead') {
      resumeQueriesSet.add('Senior Backend Engineer');
    }
  }

  if (isDevOps) {
    primaryQueriesSet.add('DevOps Engineer');
    primaryQueriesSet.add('Cloud Engineer');

    resumeQueriesSet.add('DevOps Engineer');
    resumeQueriesSet.add('Cloud Engineer');
    resumeQueriesSet.add('Infrastructure Engineer');
  }

  // Secondary/expansion variations (not in primaryQueries)
  if (isFlutter) {
    resumeQueriesSet.add('Flutter Developer startup');
    resumeQueriesSet.add('Flutter Engineer startup');
    resumeQueriesSet.add('Flutter Developer SaaS');
    resumeQueriesSet.add('Flutter Developer scale-up');
    resumeQueriesSet.add('Mobile Developer startup');
    resumeQueriesSet.add('Flutter Developer product company');
  } else if (isReact) {
    resumeQueriesSet.add('Frontend Engineer startup');
    resumeQueriesSet.add('Full Stack Engineer SaaS');
    resumeQueriesSet.add('React Developer scale-up');
  } else if (isBackend) {
    resumeQueriesSet.add('Node.js Developer startup');
    resumeQueriesSet.add('Backend Engineer SaaS');
    resumeQueriesSet.add('Backend Engineer scale-up');
  }

  const primaryQueries = Array.from(primaryQueriesSet).slice(0, 5);
  if (primaryQueries.length === 0) {
    primaryQueries.push('Software Engineer', 'Developer');
  }

  const resumeQueries = Array.from(resumeQueriesSet).slice(0, 25);

  let effectiveKeywords: string[];
  if (userQueryClean) {
    effectiveKeywords = [userQueryClean];
  } else {
    effectiveKeywords = [...resumeQueries];
  }

  return {
    userQuery: userQueryClean,
    primaryQueries,
    resumeQueries,
    keywords: effectiveKeywords,
    primaryRole,
    seniorityLevel,
    totalYearsExperience,
  };
}

/**
 * Returns expanded city and remote locations for target country.
 */
export function getExpandedLocationsForCountry(countryCode?: string): string[] {
  const code = (countryCode || '').toUpperCase().trim();
  if (code === 'AU' || code === 'AUSTRALIA') {
    return ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Gold Coast', 'Newcastle', 'Remote Australia'];
  }
  if (code === 'CA' || code === 'CANADA') {
    return ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Remote Canada'];
  }
  if (code === 'DE' || code === 'GERMANY') {
    return ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Remote Germany'];
  }
  return ['Remote'];
}
