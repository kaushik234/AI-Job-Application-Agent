/**
 * @file src/services/JobProfileExtractor.ts
 * @description Parses job description and requirements into a StructuredJobProfile.
 * Extracts minimum experience years, required vs preferred skills, education, location, remote, and visa sponsorship status.
 */

import { JobListing, StructuredJobProfile, VisaStatus } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class JobProfileExtractor {
  /**
   * Extracts a StructuredJobProfile from a raw JobListing.
   */
  public extractJobProfile(job: JobListing): StructuredJobProfile {
    const fullJobText = `${job.title} ${job.company} ${job.location} ${job.description || ''} ${(job.requirements || []).join(' ')}`;
    const fullJobTextLower = fullJobText.toLowerCase();

    // 1. Extract Minimum Experience Years
    let minimumExperienceYears: number | null = null;
    const yearMatches = fullJobTextLower.match(/(\d+)\+?\s*(?:years|yrs)/i);
    if (yearMatches && yearMatches[1]) {
      const val = parseInt(yearMatches[1], 10);
      if (val >= 0 && val <= 30) {
        minimumExperienceYears = val;
      }
    }

    // 2. Separate Required vs Preferred Skills
    const requiredSkills: string[] = [];
    const preferredSkills: string[] = [];

    const rawReqs = Array.isArray(job.requirements) ? job.requirements : [];
    rawReqs.forEach((req) => {
      const rLower = req.toLowerCase();
      if (rLower.includes('nice to have') || rLower.includes('preferred') || rLower.includes('bonus') || rLower.includes('plus')) {
        preferredSkills.push(req);
      } else {
        requiredSkills.push(req);
      }
    });

    // Detect common tech keywords if requirements list is small
    const techCatalog = [
      'Flutter', 'Dart', 'React', 'TypeScript', 'JavaScript', 'Node.js', 'Express',
      'Python', 'Go', 'Kotlin', 'Swift', 'Docker', 'Kubernetes', 'AWS', 'GCP',
      'GraphQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Hive', 'C++', 'Java'
    ];

    techCatalog.forEach((tech) => {
      if (fullJobTextLower.includes(tech.toLowerCase())) {
        if (!requiredSkills.some((s) => s.toLowerCase() === tech.toLowerCase()) &&
            !preferredSkills.some((s) => s.toLowerCase() === tech.toLowerCase())) {
          requiredSkills.push(tech);
        }
      }
    });

    // 3. Extract Visa Sponsorship Evidence & Status
    let visaSponsorship: VisaStatus = 'UNKNOWN';
    if (
      fullJobTextLower.includes('no visa sponsorship') ||
      fullJobTextLower.includes('no sponsorship') ||
      fullJobTextLower.includes('must have existing work rights') ||
      fullJobTextLower.includes('no visa assistance') ||
      fullJobTextLower.includes('citizens or pr only') ||
      fullJobTextLower.includes('cannot offer sponsorship')
    ) {
      visaSponsorship = 'NO_SPONSORSHIP';
    } else if (
      fullJobTextLower.includes('australian citizen') ||
      fullJobTextLower.includes('us citizen') ||
      fullJobTextLower.includes('us citizenship') ||
      fullJobTextLower.includes('citizenship required') ||
      fullJobTextLower.includes('security clearance') ||
      fullJobTextLower.includes('must be a citizen')
    ) {
      visaSponsorship = 'NOT_ELIGIBLE';
    } else if (
      job.visaSponsorship === true ||
      fullJobTextLower.includes('visa sponsorship available') ||
      fullJobTextLower.includes('relocation & visa') ||
      fullJobTextLower.includes('lmia approved') ||
      fullJobTextLower.includes('work permit provided') ||
      fullJobTextLower.includes('eu blue card')
    ) {
      visaSponsorship = 'CONFIRMED_SPONSORSHIP';
    } else if (
      fullJobTextLower.includes('relocation') ||
      fullJobTextLower.includes('work permit assistance') ||
      fullJobTextLower.includes('sponsorship considered') ||
      fullJobTextLower.includes('international candidates welcome')
    ) {
      visaSponsorship = 'LIKELY_SPONSORSHIP';
    } else {
      visaSponsorship = 'UNKNOWN';
    }

    // 4. Education Requirements
    const educationRequirements: string[] = [];
    if (fullJobTextLower.includes('bachelor') || fullJobTextLower.includes('bs degree') || fullJobTextLower.includes('degree in computer science')) {
      educationRequirements.push('Bachelor Degree in Computer Science or related field');
    }
    if (fullJobTextLower.includes('master') || fullJobTextLower.includes('phd')) {
      educationRequirements.push('Master / PhD');
    }

    // 5. Seniority Detection
    let seniority: string | null = null;
    if (fullJobTextLower.includes('senior') || fullJobTextLower.includes('sr.') || fullJobTextLower.includes('lead') || fullJobTextLower.includes('principal')) {
      seniority = 'Senior / Lead';
    } else if (fullJobTextLower.includes('junior') || fullJobTextLower.includes('jr.') || fullJobTextLower.includes('associate') || fullJobTextLower.includes('entry')) {
      seniority = 'Junior / Entry';
    } else {
      seniority = 'Mid Level';
    }

    const structuredJob: StructuredJobProfile = {
      title: job.title,
      company: job.company,
      requiredSkills: Array.from(new Set(requiredSkills)),
      preferredSkills: Array.from(new Set(preferredSkills)),
      minimumExperienceYears,
      educationRequirements,
      location: job.location,
      remote: job.isRemote ?? false,
      visaSponsorship,
      salary: job.salaryText || null,
      seniority,
      employmentType: 'Full-time',
      source: job.platform || 'Scraper',
      postedDate: job.postedDate || '',
    };

    logger.info('SEARCH', `[JOB_PROFILE_EXTRACTOR] Extracted profile for ${job.title} at ${job.company}: Min Exp=${minimumExperienceYears ?? 'Unstated'} yrs, Visa=${visaSponsorship}, Required Skills=${structuredJob.requiredSkills.length}`);

    return structuredJob;
  }
}

export const jobProfileExtractor = new JobProfileExtractor();
