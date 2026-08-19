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
 * If no resume or experience is available, returns 0.
 */
export function calculateResumeExperienceYears(resume?: MasterResume | null): number {
  if (!resume) return 0;
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
    return 0;
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
  return Math.max(0, Number((totalMonths / 12).toFixed(1)));
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

  // If no candidate resume or target skills exist and no custom query
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
  const queryEvidenceMap = new Map<string, { source: QueryGenerationExplanation['source']; evidence: string[]; confidence: number }>();

  // Excluded non-engineering role terms to prevent non-engineering titles from becoming target queries
  const nonEngineeringRoleTerms = [
    'account executive', 'account manager', 'sales manager', 'marketing manager',
    'recruiter', 'hr manager', 'finance manager', 'legal counsel', 'operations manager',
    'project coordinator', 'administrative', 'customer support', 'content writer',
    'social media manager', 'event marketing', 'gtm strategist'
  ];

  // A. Role Title Permutations derived directly from candidate experience roles
  for (const role of profile.primaryRoles) {
    const rClean = role.trim();
    if (!rClean) continue;

    const rLower = rClean.toLowerCase();
    if (nonEngineeringRoleTerms.some((term) => rLower.includes(term))) {
      continue;
    }

    // 1. Direct role title from experience
    generatedQueriesSet.add(rClean);
    queryEvidenceMap.set(rClean, {
      source: 'candidate_role_profile',
      evidence: [`Candidate has professional experience title "${rClean}"`],
      confidence: 0.98,
    });

    // 2. Developer <-> Engineer variant
    if (rLower.includes('developer')) {
      const variant = rClean.replace(/developer/i, 'Engineer');
      generatedQueriesSet.add(variant);
      queryEvidenceMap.set(variant, {
        source: 'candidate_role_profile',
        evidence: [`Engineering title variant derived from experience title "${rClean}"`],
        confidence: 0.95,
      });
    } else if (rLower.includes('engineer')) {
      const variant = rClean.replace(/engineer/i, 'Developer');
      generatedQueriesSet.add(variant);
      queryEvidenceMap.set(variant, {
        source: 'candidate_role_profile',
        evidence: [`Developer title variant derived from experience title "${rClean}"`],
        confidence: 0.95,
      });
    }

    // 3. Base role title without Senior/Lead/Junior prefix
    const baseRole = rClean.replace(/^(senior|lead|junior|principal|staff|associate)\s+/i, '').trim();
    if (baseRole && baseRole !== rClean) {
      generatedQueriesSet.add(baseRole);
      queryEvidenceMap.set(baseRole, {
        source: 'candidate_role_profile',
        evidence: [`Base role concept derived from experience title "${rClean}"`],
        confidence: 0.94,
      });

      if (baseRole.toLowerCase().includes('developer')) {
        const baseVariant = baseRole.replace(/developer/i, 'Engineer');
        generatedQueriesSet.add(baseVariant);
        queryEvidenceMap.set(baseVariant, {
          source: 'candidate_role_profile',
          evidence: [`Engineering base variant derived from experience title "${rClean}"`],
          confidence: 0.92,
        });
      } else if (baseRole.toLowerCase().includes('engineer')) {
        const baseVariant = baseRole.replace(/engineer/i, 'Developer');
        generatedQueriesSet.add(baseVariant);
        queryEvidenceMap.set(baseVariant, {
          source: 'candidate_role_profile',
          evidence: [`Developer base variant derived from experience title "${rClean}"`],
          confidence: 0.92,
        });
      }
    }

    // 4. Senior / Lead prefix if candidate seniority supports it
    if ((seniorityLevel === 'Senior' || seniorityLevel === 'Lead') && !rLower.startsWith('senior') && !rLower.startsWith('lead')) {
      const srQuery = `Senior ${rClean}`;
      generatedQueriesSet.add(srQuery);
      queryEvidenceMap.set(srQuery, {
        source: 'candidate_role_profile',
        evidence: [`Seniority alignment (${seniorityLevel}, ${totalYearsExperience} yrs) applied to experience role "${rClean}"`],
        confidence: 0.93,
      });

      if (baseRole && baseRole !== rClean) {
        const srBaseQuery = `Senior ${baseRole}`;
        generatedQueriesSet.add(srBaseQuery);
        queryEvidenceMap.set(srBaseQuery, {
          source: 'candidate_role_profile',
          evidence: [`Seniority alignment (${seniorityLevel}, ${totalYearsExperience} yrs) applied to base role "${baseRole}"`],
          confidence: 0.91,
        });
      }
    }
  }

  // B. Dynamic Primary Technology + Professional Role Permutations
  // Supporting technologies (Git, SQLite, BLoC, Firebase, VS Code, SQL, Dart, etc.) MUST NEVER become job titles!
  for (const tech of profile.primaryTechnologies) {
    const tClean = tech.trim();
    if (tClean.length < 2) continue;

    let tCap = tClean.charAt(0).toUpperCase() + tClean.slice(1);
    if (tClean.toLowerCase() === 'node' || tClean.toLowerCase() === 'node.js' || tClean.toLowerCase() === 'nodejs') {
      tCap = 'Node.js';
    }

    // Combine with candidate's primary engineering role concepts
    if (profile.roleFamilies.includes('cross_platform_mobile') || profile.roleFamilies.includes('mobile')) {
      const qDev = `${tCap} Developer`;
      const qEng = `${tCap} Engineer`;
      generatedQueriesSet.add(qDev);
      generatedQueriesSet.add(qEng);

      queryEvidenceMap.set(qDev, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" used in mobile application development experience`],
        confidence: 0.94,
      });
      queryEvidenceMap.set(qEng, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" used in mobile engineering experience`],
        confidence: 0.94,
      });
    } else if (profile.roleFamilies.includes('backend_systems') || profile.roleFamilies.includes('backend')) {
      const qDev = `${tCap} Developer`;
      const qEng = `${tCap} Engineer`;
      generatedQueriesSet.add(qDev);
      generatedQueriesSet.add(qEng);

      queryEvidenceMap.set(qDev, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" used in backend systems experience`],
        confidence: 0.94,
      });
      queryEvidenceMap.set(qEng, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" used in backend engineering experience`],
        confidence: 0.94,
      });
    } else if (profile.roleFamilies.includes('web_frontend') || profile.roleFamilies.includes('frontend')) {
      const qDev = `${tCap} Developer`;
      const qEng = `${tCap} Engineer`;
      generatedQueriesSet.add(qDev);
      generatedQueriesSet.add(qEng);

      queryEvidenceMap.set(qDev, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" used in web frontend experience`],
        confidence: 0.94,
      });
      queryEvidenceMap.set(qEng, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" used in web frontend engineering experience`],
        confidence: 0.94,
      });
    } else {
      const qDev = `${tCap} Developer`;
      const qEng = `${tCap} Engineer`;
      generatedQueriesSet.add(qDev);
      generatedQueriesSet.add(qEng);

      queryEvidenceMap.set(qDev, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" in candidate skill stack`],
        confidence: 0.90,
      });
      queryEvidenceMap.set(qEng, {
        source: 'primary_tech_stack',
        evidence: [`Primary technology "${tCap}" in candidate skill stack`],
        confidence: 0.90,
      });
    }
  }

  // C. Inferred Domain Role Concepts (derived semantically from candidate profile evidence)
  for (const family of profile.roleFamilies) {
    if (family === 'cross_platform_mobile' || family === 'mobile') {
      const mobDev = 'Mobile Developer';
      const mobEng = 'Mobile Engineer';
      generatedQueriesSet.add(mobDev);
      generatedQueriesSet.add(mobEng);

      if (!queryEvidenceMap.has(mobDev)) {
        queryEvidenceMap.set(mobDev, {
          source: 'role_family',
          evidence: [`Mobile software development domain concept derived from candidate profile [${profile.primaryRoles.join(', ')}]`],
          confidence: 0.89,
        });
      }
      if (!queryEvidenceMap.has(mobEng)) {
        queryEvidenceMap.set(mobEng, {
          source: 'role_family',
          evidence: [`Mobile engineering domain concept derived from candidate profile [${profile.primaryRoles.join(', ')}]`],
          confidence: 0.89,
        });
      }
    } else if (family === 'backend_systems' || family === 'backend') {
      const beEng = 'Backend Engineer';
      const beDev = 'Backend Developer';
      generatedQueriesSet.add(beEng);
      generatedQueriesSet.add(beDev);

      if (!queryEvidenceMap.has(beEng)) {
        queryEvidenceMap.set(beEng, {
          source: 'role_family',
          evidence: [`Backend systems domain concept derived from candidate profile [${profile.primaryRoles.join(', ')}]`],
          confidence: 0.89,
        });
      }
      if (!queryEvidenceMap.has(beDev)) {
        queryEvidenceMap.set(beDev, {
          source: 'role_family',
          evidence: [`Backend development domain concept derived from candidate profile [${profile.primaryRoles.join(', ')}]`],
          confidence: 0.89,
        });
      }
    } else if (family === 'web_frontend' || family === 'frontend') {
      const feEng = 'Frontend Engineer';
      const feDev = 'Frontend Developer';
      generatedQueriesSet.add(feEng);
      generatedQueriesSet.add(feDev);

      if (!queryEvidenceMap.has(feEng)) {
        queryEvidenceMap.set(feEng, {
          source: 'role_family',
          evidence: [`Frontend engineering domain concept derived from candidate profile [${profile.primaryRoles.join(', ')}]`],
          confidence: 0.89,
        });
      }
    } else if (family === 'fullstack') {
      const fsEng = 'Full Stack Engineer';
      generatedQueriesSet.add(fsEng);

      if (!queryEvidenceMap.has(fsEng)) {
        queryEvidenceMap.set(fsEng, {
          source: 'role_family',
          evidence: [`Fullstack engineering concept derived from candidate profile [${profile.primaryRoles.join(', ')}]`],
          confidence: 0.89,
        });
      }
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
    const meta = queryEvidenceMap.get(q) || {
      source: 'role_family' as const,
      evidence: [`Inferred from candidate role families [${profile.roleFamilies.join(', ')}]`],
      confidence: 0.85,
    };

    queryExplanations.push({
      query: q,
      source: meta.source,
      evidence: meta.evidence,
      confidence: meta.confidence,
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
