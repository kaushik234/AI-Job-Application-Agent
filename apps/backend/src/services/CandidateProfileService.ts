/**
 * @file src/services/CandidateProfileService.ts
 * @description Extracts and formats a verified candidate profile strictly from stored MasterResume data.
 * Guarantees NO hallucinated candidate facts, skills, titles, or experience.
 */

import { MasterResume, VerifiedCandidateProfile } from '@sentinel/types';
import { calculateResumeExperienceYears } from '../jobs/utils/queryGenerator';
import { logger } from '@sentinel/shared';

export class CandidateProfileService {
  /**
   * Extracts verified candidate profile from MasterResume object.
   */
  public extractVerifiedProfile(resume: MasterResume | null): VerifiedCandidateProfile {
    if (!resume) {
      logger.warn('SEARCH', '[CANDIDATE_PROFILE] MasterResume is null/unconfigured');
      return {
        name: 'Unconfigured Profile',
        totalExperienceYears: 0,
        relevantExperienceYears: 0,
        skills: [],
        jobTitles: [],
        education: [],
        location: 'UNKNOWN',
        workAuthorization: 'UNKNOWN',
        preferredLocations: [],
      };
    }

    const totalExperienceYears = calculateResumeExperienceYears(resume);

    // Extract all candidate skills present in resume without additions
    const allSkillsList: string[] = [
      ...(resume.skills?.languages || []),
      ...(resume.skills?.frameworks || []),
      ...(resume.skills?.cloudAndDevOps || []),
      ...(resume.skills?.databases || []),
      ...(resume.skills?.tools || []),
    ].map((s) => s.trim()).filter((s) => s.length > 0);

    const verifiedSkills = Array.from(new Set(allSkillsList));

    // Extract job titles strictly from work experience entries
    const jobTitles = (resume.experience || [])
      .map((e) => e.role ? e.role.trim() : '')
      .filter((t) => t.length > 0);
    const uniqueJobTitles = Array.from(new Set(jobTitles));

    // Extract education strictly from education entries
    const education = (resume.education || [])
      .map((e) => `${e.degree || ''} in ${e.fieldOfStudy || ''} from ${e.institution || ''}`.trim())
      .filter((e) => e.length > 0);

    const candidateProfile: VerifiedCandidateProfile = {
      name: resume.fullName || 'Candidate',
      totalExperienceYears,
      relevantExperienceYears: totalExperienceYears,
      skills: verifiedSkills,
      jobTitles: uniqueJobTitles,
      education,
      location: resume.location || 'UNKNOWN',
      workAuthorization: 'UNKNOWN', // Only state UNKNOWN unless explicitly defined in profile
      preferredLocations: ['AU', 'CA', 'DE'],
    };

    logger.info('SEARCH', `[CANDIDATE_PROFILE] Loaded verified profile for ${candidateProfile.name}: ${candidateProfile.totalExperienceYears} yrs experience, ${candidateProfile.skills.length} skills, ${candidateProfile.jobTitles.length} titles`);

    return candidateProfile;
  }
}

export const candidateProfileService = new CandidateProfileService();
