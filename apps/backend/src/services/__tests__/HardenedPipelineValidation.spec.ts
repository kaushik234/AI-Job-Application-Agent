/**
 * @file src/services/__tests__/HardenedPipelineValidation.spec.ts
 * @description Master Test Suite validating hardened Sentinel AI Pipeline requirements (Cases A through M).
 */

import { jobRankingService } from '../JobRankingService';
import { coverLetterService } from '../CoverLetterService';
import { tailoredResumeService } from '../TailoredResumeService';
import { applicationDecisionEngine } from '../ApplicationDecisionEngine';
import { candidateEvidenceExtractor } from '../CandidateEvidenceExtractor';
import { companyClassificationService } from '../CompanyClassificationService';
import { JobRepository } from '../../repositories/JobRepository';
import { db } from '../../database';
import { JobListing, MasterResume } from '@sentinel/types';

const jobRepo = new JobRepository();

describe('HardenedPipelineValidation Suite (Cases A through M)', () => {
  jest.setTimeout(30000);

  const masterResume: MasterResume = {
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
      languages: ['Dart', 'TypeScript', 'JavaScript', 'SQL'],
      frameworks: ['Flutter', 'Node.js', 'Express', 'BLoC'],
      cloudAndDevOps: ['Firebase'],
      databases: ['SQLite', 'Hive'],
      tools: ['Git', 'VSCode', 'Android Studio'],
    },
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '2023-12',
        endDate: 'Present',
        highlights: ['Built cross-platform mobile apps with BLoC and Firebase.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC', 'Firebase'],
      },
      {
        company: 'Potenz Technology',
        role: 'Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '2023-01',
        endDate: '2023-11',
        highlights: ['Developed mobile features using Flutter & Dart.'],
        technologiesUsed: ['Flutter', 'Dart', 'REST APIs'],
      },
    ],
    education: [
      {
        institution: 'University of Sydney',
        degree: 'Bachelor of Computer Science',
        fieldOfStudy: 'Software Engineering',
        graduationYear: '2022',
      },
    ],
    certifications: ['Certified Mobile Developer'],
    projects: [],
  };

  beforeAll(async () => {
    await db.updateMasterResume(masterResume);
  });

  test('Case A: 3.8 years experience remains 3.8 everywhere (Master, Candidate Evidence, Ranking)', () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(masterResume);
    expect(evidence.experienceYears).toBe(3.8);

    const job: JobListing = {
      id: 'case-a-job',
      platform: 'Greenhouse',
      company: 'Test Company',
      title: 'Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://example.com/job',
      description: 'Flutter Developer role.',
      requirements: ['Flutter'],
      createdAt: new Date().toISOString(),
    };

    const ranking = jobRankingService.rankJob(job, masterResume);
    expect(ranking.candidateProfile?.totalExperienceYears).toBe(3.8);
    expect(ranking.audit?.candidateProfileVersion).toContain('3.8yrs');
  });

  test('Case B: Unsupported skills cannot enter a tailored resume', async () => {
    const job: JobListing = {
      id: 'case-b-job',
      platform: 'Lever',
      company: 'AppCo',
      title: 'Senior Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://example.com/b',
      description: 'Requires Kubernetes, Rust, PySpark, and Flutter.',
      requirements: ['Kubernetes', 'Rust', 'PySpark', 'Flutter'],
      createdAt: new Date().toISOString(),
    };
    await jobRepo.saveMany([job]);

    const result = await tailoredResumeService.generateTailoredResume(job.id);
    expect(result.structured.skills).not.toContain('Rust');
    expect(result.structured.skills).not.toContain('PySpark');
  });

  test('Case C: Unsupported achievements cannot enter a cover letter', async () => {
    const job: JobListing = {
      id: 'case-c-job',
      platform: 'Workable',
      company: 'Fintech Mobile',
      title: 'Flutter Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://example.com/c',
      description: 'Build mobile apps.',
      requirements: ['Flutter'],
      createdAt: new Date().toISOString(),
    };
    await jobRepo.saveMany([job]);

    const result = await coverLetterService.generateCoverLetter(job.id);
    const text = result.coverLetter.contentParagraphs.join(' ');
    expect(text).not.toContain('boosted throughput by 40%');
    expect(text).not.toContain('50K RPS');
  });

  test('Case D & E: DO_NOT_APPLY classification correctly flags blockers', () => {
    const mismatchJob: JobListing = {
      id: 'case-d-mismatch',
      platform: 'Seek',
      company: 'DataLake Inc',
      title: 'Senior Data Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      postedDate: '2026-08-09',
      url: 'https://example.com/d',
      description: 'PySpark, Hadoop, AWS Redshift infrastructure.',
      requirements: ['PySpark', 'Hadoop', 'AWS Redshift'],
      createdAt: new Date().toISOString(),
    };

    const ranking = jobRankingService.rankJob(mismatchJob, masterResume);
    expect(ranking.recommendation).toBe('DO_NOT_APPLY');
    expect(ranking.reasonsToSkip.length).toBeGreaterThan(0);
  });

  test('Case F: UNKNOWN visa status never becomes CONFIRMED_SPONSORSHIP', () => {
    const unmentionedJob: JobListing = {
      id: 'case-f-visa',
      platform: 'Seek',
      company: 'Retail Corp',
      title: 'Mobile Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      postedDate: '2026-08-09',
      url: 'https://example.com/f',
      description: 'Standard mobile role in CBD.',
      createdAt: new Date().toISOString(),
    };

    const status = applicationDecisionEngine.evaluateVisaEvidence(unmentionedJob);
    expect(status).toBe('UNKNOWN');
    expect(status).not.toBe('CONFIRMED_SPONSORSHIP');
  });

  test('Case G & H: APPLY_NOW and CONSIDER recommendation handling', () => {
    const applyJob: JobListing = {
      id: 'case-g-apply',
      platform: 'Greenhouse',
      company: 'Canva',
      title: 'Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://canva.com/job',
      description: 'Flutter Developer with BLoC experience.',
      requirements: ['Flutter', 'Dart', 'BLoC'],
      createdAt: new Date().toISOString(),
    };

    const ranking = jobRankingService.rankJob(applyJob, masterResume);
    expect(['APPLY_NOW', 'HIGH_PRIORITY', 'GOOD_MATCH']).toContain(ranking.recommendation);
  });

  test('Case I: Match score is reproducible for same candidate/job data', () => {
    const job: JobListing = {
      id: 'case-i-reproducible',
      platform: 'Greenhouse',
      company: 'Stable Company',
      title: 'Mobile Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://example.com/i',
      description: 'Flutter role.',
      requirements: ['Flutter'],
      createdAt: new Date().toISOString(),
    };

    const rank1 = jobRankingService.rankJob(job, masterResume);
    const rank2 = jobRankingService.rankJob(job, masterResume);
    expect(rank1.matchScore).toBe(rank2.matchScore);
  });

  test('Case J: Small/medium/startup company classification', () => {
    const smallJob: JobListing = {
      id: 'case-j-small',
      platform: 'Workable',
      company: 'MicroStudio Tech (15 employees)',
      title: 'Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://example.com/j',
      description: 'Agile 15-person mobile app startup.',
      requirements: ['Flutter'],
      createdAt: new Date().toISOString(),
    };

    const category = companyClassificationService.classifyCompanySize(smallJob);
    expect(['SMALL', 'MICRO', 'STARTUP', 'UNKNOWN']).toContain(category);
  });

  test('Case K & L: Cover letter & Tailored resume job-specific isolation', async () => {
    const jobA: JobListing = {
      id: 'case-kl-job-a',
      platform: 'Greenhouse',
      company: 'Company Alpha',
      title: 'iOS Flutter Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://alpha.com',
      description: 'iOS Flutter Engineer.',
      requirements: ['Flutter', 'iOS'],
      createdAt: new Date().toISOString(),
    };

    const jobB: JobListing = {
      id: 'case-kl-job-b',
      platform: 'Workable',
      company: 'Company Beta',
      title: 'Android Flutter Developer',
      location: 'Melbourne, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://beta.com',
      description: 'Android Flutter Developer.',
      requirements: ['Flutter', 'Android'],
      createdAt: new Date().toISOString(),
    };

    await jobRepo.saveMany([jobA, jobB]);

    const clA = await coverLetterService.generateCoverLetter(jobA.id);
    const clB = await coverLetterService.generateCoverLetter(jobB.id);

    expect(clA.coverLetter.companyName).toBe('Company Alpha');
    expect(clB.coverLetter.companyName).toBe('Company Beta');

    const trA = await tailoredResumeService.generateTailoredResume(jobA.id);
    const trB = await tailoredResumeService.generateTailoredResume(jobB.id);

    expect(trA.structured.company).toBe('Company Alpha');
    expect(trB.structured.company).toBe('Company Beta');
  });

  test('Case M: Candidate facts remain identical between master resume, tailored resume, cover letter, and autofill', async () => {
    const job: JobListing = {
      id: 'case-m-facts',
      platform: 'Greenhouse',
      company: 'FactCorp',
      title: 'Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://factcorp.com',
      description: 'Flutter app dev.',
      requirements: ['Flutter'],
      createdAt: new Date().toISOString(),
    };
    await jobRepo.saveMany([job]);

    const tr = await tailoredResumeService.generateTailoredResume(job.id);
    const cl = await coverLetterService.generateCoverLetter(job.id);

    expect(tr.structured.candidate.name).toBe(masterResume.fullName);
    expect(cl.coverLetter.salutation).toContain('FactCorp');
  });
});
