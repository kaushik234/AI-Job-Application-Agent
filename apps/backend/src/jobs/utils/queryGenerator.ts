/**
 * @file src/jobs/utils/queryGenerator.ts
 * @description Dynamic search query generator deriving targeted, role-oriented search terms from candidate's MasterResume.
 */

import { MasterResume } from '@sentinel/types';

export interface QueryGenerationExplanation {
  query: string;
  source: 'candidate_role_profile' | 'primary_tech_stack' | 'role_family' | 'custom_user_query';
  evidence: string[];
  confidence: number;
}

export interface DerivedJobQueries {
  userQuery?: string;
  primaryQueries: string[];
  resumeQueries: string[];
  keywords: string[];
  primaryRole: string;
  seniorityLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  totalYearsExperience: number;
  targetRoles: string[];
  roleFamilies: string[];
  primaryTechnologies: string[];
  supportingTechnologies: string[];
  queryExplanations: QueryGenerationExplanation[];
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

import { deriveCandidateTargetProfile } from './resumeMatcher';

/**
 * Derives clean, candidate-specific job search keywords from MasterResume dynamically.
 * If userQuery is provided explicitly, it is prioritized as the primary effective search keyword.
 */
export function deriveSearchQueriesFromResume(resume?: MasterResume | null, userQuery?: string): DerivedJobQueries {
  const userQueryClean = userQuery && userQuery.trim().length > 0 ? userQuery.trim() : undefined;

  const profile = deriveCandidateTargetProfile(resume);
  const totalYearsExperience = profile.experienceYears;
  const seniorityLevel = profile.seniority;

  // Diagnostic Candidate Target Profile Log
  console.log('[CANDIDATE_TARGET_PROFILE]', JSON.stringify({
    primaryRoles: profile.primaryRoles,
    coreTechnologies: profile.coreTechnologies,
    roleFamilies: profile.roleFamilies,
    seniority: profile.seniority,
    experienceYears: profile.experienceYears,
  }, null, 2));

  // If no candidate resume or target skills exist and in WORLDWIDE mode
  if (!userQueryClean && profile.primaryRoles.length === 0 && profile.coreTechnologies.length === 0) {
    console.log('[SEARCH_QUERY_GENERATOR]', JSON.stringify({
      generatedQueries: [],
      reason: 'No candidate resume or target skills found to derive target discovery queries.',
    }, null, 2));

    return {
      userQuery: undefined,
      primaryQueries: [],
      resumeQueries: [],
      keywords: [],
      primaryRole: 'None',
      seniorityLevel: 'Mid',
      totalYearsExperience: 0,
      targetRoles: [],
      roleFamilies: [],
      primaryTechnologies: [],
      supportingTechnologies: [],
      queryExplanations: [],
    };
  }

  const generatedQueriesSet = new Set<string>();

  // Excluded non-engineering role terms to prevent non-engineering titles (like Operations Manager) from becoming target queries
  const nonEngineeringRoleTerms = [
    'account executive', 'account manager', 'sales manager', 'marketing manager',
    'recruiter', 'hr manager', 'finance manager', 'legal counsel', 'operations manager',
    'project coordinator', 'administrative', 'customer support', 'content writer',
    'social media manager', 'event marketing', 'gtm strategist'
  ];

  // A. Role Title Permutations (only clean engineering role titles)
  for (const role of profile.primaryRoles) {
    const rClean = role.trim();
    if (!rClean) continue;

    const rLower = rClean.toLowerCase();
    if (nonEngineeringRoleTerms.some((term) => rLower.includes(term))) {
      continue;
    }

    generatedQueriesSet.add(rClean);

    // Swap Developer <-> Engineer
    if (rLower.includes('developer')) {
      generatedQueriesSet.add(rClean.replace(/developer/i, 'Engineer'));
    } else if (rLower.includes('engineer')) {
      generatedQueriesSet.add(rClean.replace(/engineer/i, 'Developer'));
    }

    // Add base role without Senior/Lead/Junior prefix
    const baseRole = rClean.replace(/^(senior|lead|junior|principal|staff|associate)\s+/i, '').trim();
    if (baseRole && baseRole !== rClean) {
      generatedQueriesSet.add(baseRole);
      if (baseRole.toLowerCase().includes('developer')) {
        generatedQueriesSet.add(baseRole.replace(/developer/i, 'Engineer'));
      } else if (baseRole.toLowerCase().includes('engineer')) {
        generatedQueriesSet.add(baseRole.replace(/engineer/i, 'Developer'));
      }
    }

    // Add Senior / Lead prefix if supported
    if ((seniorityLevel === 'Senior' || seniorityLevel === 'Lead') && !rLower.startsWith('senior') && !rLower.startsWith('lead')) {
      generatedQueriesSet.add(`Senior ${rClean}`);
      if (baseRole) {
        generatedQueriesSet.add(`Senior ${baseRole}`);
      }
    }
  }

  // B. Core Technology + Relevant Role Permutations
  // Restrict strictly to primary frameworks & major languages.
  // Supporting technologies (Git, SQLite, BLoC, Firebase, VS Code, SQL, Dart, etc.) MUST NOT become job titles!
  const QUERY_ELIGIBLE_TECHS = new Set([
    'flutter', 'react native', 'react', 'next.js', 'vue', 'angular', 'node', 'node.js', 'nodejs',
    'python', 'django', 'fastapi', 'java', 'spring', 'golang', 'go', 'ruby', 'rails', 'c#', '.net', 'cpp', 'c++',
    'spark', 'snowflake', 'kotlin', 'swift'
  ]);

  for (const tech of profile.primaryTechnologies) {
    const tClean = tech.trim();
    if (tClean.length < 2) continue;

    if (!QUERY_ELIGIBLE_TECHS.has(tClean.toLowerCase())) {
      continue;
    }

    // Capitalize tech nicely
    let tCap = tClean.charAt(0).toUpperCase() + tClean.slice(1);
    if (tClean.toLowerCase() === 'node' || tClean.toLowerCase() === 'node.js' || tClean.toLowerCase() === 'nodejs') {
      tCap = 'Node.js';
    }

    if (profile.roleFamilies.includes('cross_platform_mobile') || profile.roleFamilies.includes('mobile')) {
      generatedQueriesSet.add(`${tCap} Developer`);
      generatedQueriesSet.add(`${tCap} Engineer`);
      generatedQueriesSet.add(`${tCap} Mobile Engineer`);
    } else if (profile.roleFamilies.includes('backend_systems') || profile.roleFamilies.includes('backend')) {
      generatedQueriesSet.add(`${tCap} Developer`);
      generatedQueriesSet.add(`${tCap} Engineer`);
      generatedQueriesSet.add(`${tCap} Backend Engineer`);
    } else if (profile.roleFamilies.includes('web_frontend') || profile.roleFamilies.includes('frontend')) {
      generatedQueriesSet.add(`${tCap} Developer`);
      generatedQueriesSet.add(`${tCap} Engineer`);
      generatedQueriesSet.add(`${tCap} Frontend Engineer`);
    } else if (profile.roleFamilies.includes('data_engineering') || profile.roleFamilies.includes('data')) {
      generatedQueriesSet.add(`${tCap} Engineer`);
      generatedQueriesSet.add(`${tCap} Data Engineer`);
    } else if (profile.roleFamilies.includes('devops') || profile.roleFamilies.includes('cloud')) {
      generatedQueriesSet.add(`${tCap} Engineer`);
      generatedQueriesSet.add(`${tCap} DevOps Engineer`);
    } else {
      generatedQueriesSet.add(`${tCap} Developer`);
      generatedQueriesSet.add(`${tCap} Engineer`);
    }
  }

  // C. Role Family Base Queries (only when supported by profile.roleFamilies)
  for (const family of profile.roleFamilies) {
    if (family === 'cross_platform_mobile' || family === 'mobile') {
      generatedQueriesSet.add('Mobile Developer');
      generatedQueriesSet.add('Mobile Engineer');
      generatedQueriesSet.add('Software Engineer - Mobile');
      generatedQueriesSet.add('Cross Platform Mobile Developer');
    } else if (family === 'backend_systems' || family === 'backend') {
      generatedQueriesSet.add('Backend Engineer');
      generatedQueriesSet.add('Backend Developer');
      generatedQueriesSet.add('Software Engineer - Backend');
    } else if (family === 'web_frontend' || family === 'frontend') {
      generatedQueriesSet.add('Frontend Engineer');
      generatedQueriesSet.add('Frontend Developer');
    } else if (family === 'fullstack') {
      generatedQueriesSet.add('Full Stack Engineer');
      generatedQueriesSet.add('Full Stack Developer');
    } else if (family === 'data_engineering' || family === 'data') {
      generatedQueriesSet.add('Data Engineer');
      generatedQueriesSet.add('Data Platform Engineer');
    } else if (family === 'devops' || family === 'cloud') {
      generatedQueriesSet.add('DevOps Engineer');
      generatedQueriesSet.add('Cloud Engineer');
    }
  }

  const generatedQueries = Array.from(generatedQueriesSet);

  // Diagnostic Generated Search Queries Log
  console.log('[SEARCH_QUERY_GENERATOR]', JSON.stringify({
    generatedQueries,
    queryCount: generatedQueries.length,
  }, null, 2));

  const primaryQueries = generatedQueries.slice(0, 5);
  const resumeQueries = generatedQueries.slice(0, 25);

  let effectiveKeywords: string[];
  if (userQueryClean) {
    effectiveKeywords = [userQueryClean];
  } else {
    effectiveKeywords = [...resumeQueries];
  }

  const queryExplanations: QueryGenerationExplanation[] = [];

  if (userQueryClean) {
    queryExplanations.push({
      query: userQueryClean,
      source: 'custom_user_query',
      evidence: [`Explicit user input search term "${userQueryClean}"`],
      confidence: 1.0,
    });
  }

  for (const q of generatedQueries) {
    let source: QueryGenerationExplanation['source'] = 'role_family';
    let confidence = 0.88;
    const evidence: string[] = [];

    const matchedRole = profile.primaryRoles.find((r) => q.toLowerCase().includes(r.toLowerCase()));
    const matchedTech = profile.primaryTechnologies.find((t) => q.toLowerCase().includes(t.toLowerCase()));

    if (matchedRole && matchedTech) {
      source = 'candidate_role_profile';
      confidence = 0.95;
      evidence.push(`Technology "${matchedTech}" appears in primary skills`, `Candidate experience includes role "${matchedRole}"`);
    } else if (matchedRole) {
      source = 'candidate_role_profile';
      confidence = 0.94;
      evidence.push(`Candidate experience includes role "${matchedRole}"`);
    } else if (matchedTech) {
      source = 'primary_tech_stack';
      confidence = 0.92;
      evidence.push(`Technology "${matchedTech}" appears in primary skill stack`, `Inferred role family [${profile.roleFamilies[0] || 'engineering'}]`);
    } else {
      source = 'role_family';
      confidence = 0.88;
      evidence.push(`Role family taxonomy expansion for [${profile.roleFamilies.join(', ')}]`);
    }

    queryExplanations.push({
      query: q,
      source,
      evidence,
      confidence,
    });
  }

  return {
    userQuery: userQueryClean,
    primaryQueries,
    resumeQueries,
    keywords: effectiveKeywords,
    primaryRole: profile.primaryRoles[0] || (generatedQueries[0] ?? 'Software Engineer'),
    seniorityLevel,
    totalYearsExperience,
    targetRoles: profile.primaryRoles,
    roleFamilies: profile.roleFamilies,
    primaryTechnologies: profile.primaryTechnologies,
    supportingTechnologies: profile.supportingTechnologies,
    queryExplanations,
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
