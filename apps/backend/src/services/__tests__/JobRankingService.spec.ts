/**
 * @file src/services/__tests__/JobRankingService.spec.ts
 * @description Comprehensive unit & scenario test suite for JobRankingService.
 * Validates candidate profile experience gap calculation, evidence-based visa classification,
 * deterministic score calculation, recommendation levels, hard disqualifiers, and audit trail metadata.
 */

import { JobRankingService } from '../JobRankingService';
import { MasterResume, JobListing } from '@sentinel/types';

describe('JobRankingService', () => {
  let rankingService: JobRankingService;

  const mockCandidateResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushik.khandala@example.com',
    phone: '+61 412 345 678',
    location: 'Sydney, Australia',
    linkedIn: 'https://linkedin.com/in/kaushikkhandala',
    github: 'https://github.com/kaushikkhandala',
    portfolio: 'https://kaushikkhandala.dev',
    summary: 'Flutter Developer with 3.8 years of experience building mobile applications.',
    explicitExperienceYears: 3.8,
    experienceSource: 'RESUME_EXPLICIT',
    skills: {
      languages: ['Dart', 'TypeScript', 'JavaScript', 'SQL', 'Kotlin', 'Swift'],
      frameworks: ['Flutter', 'Node.js', 'Express', 'BLoC'],
      cloudAndDevOps: ['Docker', 'Firebase'],
      databases: ['SQLite', 'Hive', 'PostgreSQL'],
      tools: ['Git', 'VSCode', 'Android Studio', 'Xcode'],
    },
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '2023-12',
        endDate: 'Present',
        highlights: ['Built Flutter cross-platform mobile apps with BLoC and Firebase.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC', 'Firebase'],
      },
      {
        company: 'Potenz Technology',
        role: 'Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '2023-01',
        endDate: '2023-11',
        highlights: ['Developed iOS and Android mobile features using Flutter & Dart.'],
        technologiesUsed: ['Flutter', 'Dart', 'REST APIs'],
      },
    ],
    education: [
      {
        institution: 'University of Sydney',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        graduationYear: '2022',
      },
    ],
    certifications: ['Certified Mobile Application Developer (Flutter)'],
    projects: [
      {
        title: 'AI Job Search Assistant',
        description: 'Automated job search engine in Flutter & Node.js',
        technologies: ['Flutter', 'Node.js', 'TypeScript'],
      },
    ],
  };

  beforeEach(() => {
    rankingService = new JobRankingService();
  });

  it('1. Candidate experience comes ONLY from profile (3.8 years)', () => {
    const job: JobListing = {
      id: 'job-exp-check',
      platform: 'Greenhouse',
      company: 'TechCorp',
      title: 'Flutter Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://example.com/job1',
      description: 'Looking for a Flutter Developer with 5+ years of experience.',
      requirements: ['Flutter', 'Dart'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    expect(ranking.experienceGap).toBe(1.2); // 5 - 3.8 = 1.2
    expect(ranking.reasonsToSkip.some((r) => r.includes('3.8 years'))).toBe(true);
    expect(ranking.reasonsToSkip.some((r) => r.includes('5+ years'))).toBe(true);
  });

  it('2. SCENARIO A: Flutter job requiring 2 years -> Strong match & APPLY_NOW/HIGH priority', () => {
    const job: JobListing = {
      id: 'scenario-a',
      platform: 'Lever',
      company: 'MobileStudio',
      title: 'Flutter App Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://example.com/scenario-a',
      description: 'Seeking Flutter Developer with 2+ years experience in Dart, BLoC, and SQLite. Visa sponsorship available.',
      requirements: ['Flutter', 'Dart', 'SQLite', 'BLoC'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    expect(ranking.matchScore).toBeGreaterThanOrEqual(80);
    expect(ranking.experienceGap).toBeNull(); // 3.8 >= 2
    expect(ranking.applicationPriority).toBe('HIGH');
    expect(ranking.recommendation).toMatch(/APPLY_NOW|TAILOR_AND_APPLY/);
    expect(ranking.reasonsToApply.length).toBeGreaterThan(0);
  });

  it('3. SCENARIO B: Flutter job requiring 5+ years -> Experience gap visible (1.2 years gap)', () => {
    const job: JobListing = {
      id: 'scenario-b',
      platform: 'Ashby',
      company: 'Enterprise App Inc',
      title: 'Senior Flutter Specialist',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: false,
      url: 'https://example.com/scenario-b',
      description: 'Requires 5+ years of hands-on Flutter and mobile architecture experience.',
      requirements: ['Flutter', 'Dart', 'Architecture'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    expect(ranking.experienceGap).toBe(1.2);
    expect(ranking.reasonsToSkip.some((r) => r.includes('gap of 1.2 yrs') || r.includes('3.8 years'))).toBe(true);
  });

  it('4. SCENARIO C: Completely unrelated role -> Low score & SKIP', () => {
    const job: JobListing = {
      id: 'scenario-c',
      platform: 'Indeed',
      company: 'City Bakery',
      title: 'Head Pastry Chef & Baker',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      url: 'https://example.com/scenario-c',
      description: 'Must have 5 years baking experience, food safety certificate, pastry decoration skills.',
      requirements: ['Pastry', 'Baking', 'Food Hygiene'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    expect(ranking.matchScore).toBeLessThan(65);
    expect(['SKIP', 'DO_NOT_APPLY']).toContain(ranking.recommendation);
    expect(ranking.applicationPriority).toBe('LOW');
  });

  it('5. SCENARIO D: Strong Flutter job with confirmed sponsorship -> HIGH priority', () => {
    const job: JobListing = {
      id: 'scenario-d',
      platform: 'Workable',
      company: 'Global Fintech',
      title: 'Flutter Mobile Engineer',
      location: 'Toronto, CA',
      country: 'CA',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://example.com/scenario-d',
      description: 'Flutter Developer (3+ years experience). Relocation and full visa sponsorship provided.',
      requirements: ['Flutter', 'Dart', 'Firebase'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    expect(ranking.visaStatus).toBe('CONFIRMED_SPONSORSHIP');
    expect(ranking.visaMatch).toBe(100);
    expect(ranking.applicationPriority).toBe('HIGH');
  });

  it('6. SCENARIO E: Strong Flutter job with unknown sponsorship -> Good match but visa status UNKNOWN', () => {
    const job: JobListing = {
      id: 'scenario-e',
      platform: 'Seek',
      company: 'Tech Agency',
      title: 'Flutter Mobile Developer',
      location: 'Berlin, DE',
      country: 'DE',
      visaSponsorship: false,
      isRemote: true,
      url: 'https://example.com/scenario-e',
      description: 'We build Flutter apps for top retail brands. Looking for Flutter & Dart developer.',
      requirements: ['Flutter', 'Dart'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    expect(ranking.visaStatus).toBe('UNKNOWN');
    expect(ranking.matchScore).toBeGreaterThanOrEqual(65);
    expect(ranking.visaMatch).toBe(50);
  });

  it('7. OpenText Cloud Analytics Engine -> Partial match (not inflated 90%)', () => {
    const job: JobListing = {
      id: 'opentext-cloud',
      platform: 'Workable',
      company: 'OpenText',
      title: 'Software Developer - Cloud Analytics Engine',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      url: 'https://example.com/opentext',
      description: 'Software Developer - Cloud Analytics Engine requiring Node.js, Express, TypeScript, PostgreSQL. LMI / Work Permit assistance.',
      requirements: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    // Role title has partial software match, but candidate is primarily Flutter
    expect(ranking.roleMatch).toBeLessThan(75);
    expect(ranking.matchScore).toBeLessThanOrEqual(85); // Must not be inflated 90%
    expect(ranking.recommendation).not.toBe('APPLY_NOW');
  });

  it('8. IMPOSSIBLE JOB VALIDATION TEST: Senior Flutter Developer requiring 15 yrs, PhD, US Citizen', () => {
    const job: JobListing = {
      id: 'impossible-job',
      platform: 'Greenhouse',
      company: 'Defense Space Corp',
      title: 'Senior Flutter Developer',
      location: 'Washington, US',
      country: 'US' as any,
      visaSponsorship: false,
      isRemote: false,
      url: 'https://example.com/impossible',
      description: 'Must have 15+ years Flutter experience, 10+ years Dart, PhD in Quantum Computing, US citizenship required with top secret security clearance.',
      requirements: ['Flutter', 'Dart', 'Quantum Computing', 'US Citizenship'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const ranking = rankingService.rankJob(job, mockCandidateResume);
    // MUST NOT return 90% or APPLY_NOW!
    expect(ranking.matchScore).toBeLessThan(70);
    expect(ranking.recommendation).not.toBe('APPLY_NOW');
    expect(ranking.applicationPriority).toBe('LOW');
    expect(ranking.experienceGap).toBeGreaterThan(10);
    expect(ranking.visaStatus).toBe('NOT_ELIGIBLE');
  });

  it('9. Rank multiple jobs sorts HIGH priority first then match score', () => {
    const jobs: JobListing[] = [
      {
        id: 'job-low',
        platform: 'Indeed',
        company: 'Bakery',
        title: 'Baker',
        location: 'Sydney',
        country: 'AU',
        visaSponsorship: false,
        isRemote: false,
        url: 'url1',
        description: 'Must have 5 years baking experience, food safety certificate, pastry decoration skills.',
        requirements: ['Pastry', 'Baking', 'Food Hygiene'],
        postedDate: '1d',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'job-high-1',
        platform: 'Greenhouse',
        company: 'AppStudio',
        title: 'Flutter Developer',
        location: 'Sydney',
        country: 'AU',
        visaSponsorship: true,
        isRemote: true,
        url: 'url2',
        description: 'Flutter & Dart developer with 2+ years exp. Visa sponsored.',
        requirements: ['Flutter', 'Dart'],
        postedDate: 'Today',
        createdAt: new Date().toISOString(),
      },
    ];

    const ranked = rankingService.rankJobs(jobs, mockCandidateResume);
    expect(ranked[0].id).toBe('job-high-1');
    expect(ranked[0].applicationPriority).toBe('HIGH');
    expect(ranked[ranked.length - 1].applicationPriority).toBe('LOW');
  });
});
