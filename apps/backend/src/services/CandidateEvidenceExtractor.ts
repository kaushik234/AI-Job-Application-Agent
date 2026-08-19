/**
 * @file src/services/CandidateEvidenceExtractor.ts
 * @description Extracts strict Candidate Evidence Object from parsed Master Resume in PostgreSQL.
 * Provides the single source of truth for all AI generation prompts and validation gates.
 * @architect Clean Architecture - Candidate Evidence Engine
 */

import { MasterResume } from '@sentinel/types';

export interface CandidateEvidenceObject {
  candidateName: string;
  email: string;
  phone: string;
  location: string;
  experienceYears: number; // strictly locked (e.g. 3.8 yrs)
  skills: string[];
  companies: string[];
  roles: string[];
  verifiedAchievements: string[];
  education: string[];
  certifications: string[];
  urls: string[];
}

export class CandidateEvidenceExtractor {
  /**
   * Extracts strict candidate evidence object from Master Resume.
   */
  public extractCandidateEvidence(master: MasterResume): CandidateEvidenceObject {
    const rawSkills = [
      ...(master.skills?.languages || []),
      ...(master.skills?.frameworks || []),
      ...(master.skills?.cloudAndDevOps || []),
      ...(master.skills?.databases || []),
      ...(master.skills?.tools || []),
    ];
    const skills = Array.from(new Set(rawSkills.filter(Boolean)));

    const companies = Array.from(new Set((master.experience || []).map((e) => e.company.trim()).filter(Boolean)));
    const roles = Array.from(new Set((master.experience || []).map((e) => e.role.trim()).filter(Boolean)));

    const verifiedAchievements: string[] = [];
    (master.experience || []).forEach((e) => {
      if (Array.isArray(e.highlights)) {
        verifiedAchievements.push(...e.highlights);
      }
    });

    const education = (master.education || []).map((ed) => `${ed.degree} in ${ed.fieldOfStudy} from ${ed.institution}`);
    const certifications = master.certifications || [];
    const urls = [master.linkedIn, master.github, master.portfolio].filter(Boolean) as string[];

    return {
      candidateName: master.fullName || '',
      email: master.email || '',
      phone: master.phone || '',
      location: master.location || '',
      experienceYears: master.explicitExperienceYears || 0,
      skills,
      companies,
      roles,
      verifiedAchievements,
      education,
      certifications,
      urls,
    };
  }
}

export const candidateEvidenceExtractor = new CandidateEvidenceExtractor();
