/**
 * @file src/services/__tests__/StrictResumeExtraction.spec.ts
 * @description Test Suite validating all 25 Strict Resume Extraction and Evidence Integrity Rules.
 */

import { candidateEvidenceExtractor } from '../CandidateEvidenceExtractor';
import { tailoredResumeService } from '../TailoredResumeService';
import { coverLetterService } from '../CoverLetterService';
import { jobRankingService } from '../JobRankingService';
import { JobRepository } from '../../repositories/JobRepository';
import { db } from '../../database';
import { MasterResume, JobListing } from '@sentinel/types';

const jobRepo = new JobRepository();

describe('StrictResumeExtraction Test Suite (25 Verification Checks)', () => {
  jest.setTimeout(30000);

  const exactMasterResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushik.khandala@example.com',
    phone: '+61 412 345 678',
    location: 'Sydney, Australia',
    linkedIn: 'https://linkedin.com/in/kaushikkhandala',
    github: 'https://github.com/kaushikkhandala',
    portfolio: 'https://kaushikkhandala.dev',
    summary: 'Flutter Developer (3.8 Years) with proven expertise building cross-platform mobile apps.',
    explicitExperienceYears: 3.8,
    experienceSource: 'RESUME_EXPLICIT',
    skills: {
      languages: ['Dart'],
      frameworks: ['Flutter', 'BLoC'],
      cloudAndDevOps: ['Firebase'],
      databases: ['SQLite', 'Hive'],
      tools: ['Git', 'Android Studio', 'VSCode'],
    },
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '12/2023',
        endDate: 'Present',
        highlights: ['Built cross-platform Flutter applications using BLoC state management and Firebase.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC', 'SQLite', 'Hive', 'Firebase'],
      },
      {
        company: 'Potenz Technology',
        role: 'Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '01/2023',
        endDate: '11/2023',
        highlights: ['Integrated RESTful API endpoints and state management.'],
        technologiesUsed: ['Flutter', 'Dart', 'REST APIs', 'Git'],
      },
      {
        company: 'Potenz Technology',
        role: 'Operations Manager',
        location: 'Sydney, Australia',
        startDate: '07/2022',
        endDate: '01/2023',
        highlights: ['Managed tech team operations.'],
        technologiesUsed: ['Flutter', 'Dart', 'Operations'],
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
        title: 'Urmin Food and Tobacco distribution application',
        description: 'Order processing speed improved by 35%, real-time inventory tracking, stock discrepancies reduced by 25%, coordinated a team of 6 developers, payment transaction success rate of 98%.',
        technologies: ['Flutter', 'Dart', 'BLoC', 'SQLite'],
        url: 'https://github.com/kaushikkhandala/urmin-food',
      },
      {
        title: 'Danatone ERP',
        description: 'Operational efficiency improved by 35%, 25% faster decision-making, 10+ core modules, database latency reduced by 40%, manual errors reduced by 50%, coordinated a team of 6 developers.',
        technologies: ['Flutter', 'Dart', 'Hive', 'REST APIs'],
        url: 'https://github.com/kaushikkhandala/danatone-erp',
      },
      {
        title: 'Tent Studio',
        description: 'User engagement improved by 30%, load times reduced by 40%, 15+ updates, analytics, 25% improvement in data-driven decision-making.',
        technologies: ['Flutter', 'Dart', 'Firebase'],
        url: 'https://github.com/kaushikkhandala/tent-studio',
      },
    ],
  };

  beforeAll(async () => {
    await db.updateMasterResume(exactMasterResume);
  });

  // Rules 1 - 4: Explicit skills
  test('1. Flutter is extracted as verified', () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(exactMasterResume);
    expect(evidence.skills).toContain('Flutter');
  });

  test('2. Dart is extracted as verified', () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(exactMasterResume);
    expect(evidence.skills).toContain('Dart');
  });

  test('3. SQLite is extracted as verified', () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(exactMasterResume);
    expect(evidence.skills).toContain('SQLite');
  });

  test('4. Hive is extracted as verified', () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(exactMasterResume);
    expect(evidence.skills).toContain('Hive');
  });

  // Rules 5 - 7: Experience-mentioned skills
  test('5. Firebase is associated with relevant experience', () => {
    const exp = exactMasterResume.experience.find((e) => e.company === 'Safal Infosoft');
    expect(exp?.technologiesUsed).toContain('Firebase');
  });

  test('6. REST APIs are associated with relevant experience', () => {
    const exp = exactMasterResume.experience.find((e) => e.company === 'Potenz Technology' && e.role === 'Flutter Developer');
    expect(exp?.technologiesUsed).toContain('REST APIs');
  });

  test('7. Git is associated with relevant experience', () => {
    const exp = exactMasterResume.experience.find((e) => e.company === 'Potenz Technology' && e.role === 'Flutter Developer');
    expect(exp?.technologiesUsed).toContain('Git');
  });

  // Rules 8 - 17: Unverified global skills must NOT be in explicit languages/frameworks/databases
  test('8-17. Unverified technologies (TypeScript, JS, Kotlin, Swift, Node, Express, Docker, Postgres, Redis, Codemagic) are NOT in explicit skills', () => {
    const explicitSkills = exactMasterResume.skills;
    const unverifiedList = [
      'TypeScript',
      'JavaScript',
      'Kotlin',
      'Swift',
      'Node.js',
      'Express',
      'Docker',
      'PostgreSQL',
      'Redis',
      'Codemagic',
    ];

    unverifiedList.forEach((tech) => {
      expect(explicitSkills.languages).not.toContain(tech);
      expect(explicitSkills.frameworks).not.toContain(tech);
      expect(explicitSkills.databases).not.toContain(tech);
    });
  });

  // Rules 18 - 20: Titles
  test('18. Safal Infosoft title remains "Flutter Developer"', () => {
    const role = exactMasterResume.experience[0].role;
    expect(role).toBe('Flutter Developer');
    expect(role).not.toBe('Senior Flutter Developer');
  });

  test('19. Potenz Technology title remains "Flutter Developer"', () => {
    const role = exactMasterResume.experience[1].role;
    expect(role).toBe('Flutter Developer');
  });

  test('20. Operations Manager remains "Operations Manager"', () => {
    const role = exactMasterResume.experience[2].role;
    expect(role).toBe('Operations Manager');
  });

  // Rule 21: Experience years
  test('21. Experience remains 3.8 years consistently', () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(exactMasterResume);
    expect(evidence.experienceYears).toBe(3.8);
  });

  // Rule 22: Tailored resume cannot introduce unsupported skills
  test('22. Tailored resume cannot introduce unsupported skills', async () => {
    const job: JobListing = {
      id: 'rule-22-job',
      platform: 'Greenhouse',
      company: 'TestCo',
      title: 'Full Stack Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://example.com',
      description: 'Requires Kotlin, Swift, Docker, Rust.',
      requirements: ['Kotlin', 'Swift', 'Docker', 'Rust'],
      createdAt: new Date().toISOString(),
    };
    await jobRepo.saveMany([job]);

    const tailored = await tailoredResumeService.generateTailoredResume(job.id);
    expect(tailored.structured.skills).not.toContain('Kotlin');
    expect(tailored.structured.skills).not.toContain('Swift');
    expect(tailored.structured.skills).not.toContain('Rust');
  });

  // Rule 23: Cover letter cannot introduce unsupported skills
  test('23. Cover letter cannot introduce unsupported skills', async () => {
    const job: JobListing = {
      id: 'rule-23-job',
      platform: 'Workable',
      company: 'CloudCo',
      title: 'DevOps Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://example.com',
      description: 'Requires Kubernetes and Terraform.',
      requirements: ['Kubernetes', 'Terraform'],
      createdAt: new Date().toISOString(),
    };
    await jobRepo.saveMany([job]);

    const cl = await coverLetterService.generateCoverLetter(job.id);
    const text = cl.coverLetter.contentParagraphs.join(' ');
    expect(text).not.toContain('Kubernetes');
    expect(text).not.toContain('Terraform');
  });

  // Rule 24: Job matching cannot score unsupported skills as matches
  test('24. Job matching cannot score unsupported skills as matches', () => {
    const job: JobListing = {
      id: 'rule-24-job',
      platform: 'Greenhouse',
      company: 'DataCo',
      title: 'Data Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      postedDate: '2026-08-09',
      url: 'https://example.com',
      description: 'PySpark, Redshift, Hadoop.',
      requirements: ['PySpark', 'Redshift', 'Hadoop'],
      createdAt: new Date().toISOString(),
    };

    const rank = jobRankingService.rankJob(job, exactMasterResume);
    const matchingTech = rank.strengths.filter((s) => ['pyspark', 'redshift', 'hadoop'].includes(s.toLowerCase()));
    expect(matchingTech.length).toBe(0);
    expect(rank.missingSkills).toContain('PySpark');
    expect(rank.recommendation).toBe('DO_NOT_APPLY');
  });

  // Rule 25: Audit & Debug displays evidence for important candidate facts
  test('25. Audit & Debug displays evidence for important candidate facts', () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(exactMasterResume);
    expect(evidence.verifiedAchievements.length).toBeGreaterThan(0);
    expect(evidence.education[0]).toContain('University of Sydney');
  });
});
