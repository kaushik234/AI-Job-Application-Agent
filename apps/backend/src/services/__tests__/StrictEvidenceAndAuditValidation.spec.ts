/**
 * @file src/services/__tests__/StrictEvidenceAndAuditValidation.spec.ts
 * @description Mandatory Automated Test Suite for Strict Evidence-Based Match Audit & Anti-Fabrication Generation.
 * Validates exact TEST 1 through TEST 8 scenarios required by Sentinel AI specification.
 */

import { jobRankingService } from '../JobRankingService';
import { coverLetterService } from '../CoverLetterService';
import { applicationDecisionEngine } from '../ApplicationDecisionEngine';
import { JobRepository } from '../../repositories/JobRepository';
import { db } from '../../database';
import { JobListing, MasterResume } from '@sentinel/types';

const jobRepository = new JobRepository();

describe('StrictEvidenceAndAuditValidation', () => {
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
    certifications: ['Certified Mobile Application Developer'],
    projects: [],
  };

  beforeAll(async () => {
    await db.updateMasterResume(masterResume);
  });

  test('TEST 1: Candidate 3.8 yrs Flutter/Dart + Senior Flutter Developer Job -> Good Match & No Inventions', async () => {
    const job: JobListing = {
      id: 'test-1-flutter',
      platform: 'Greenhouse',
      company: 'Canva',
      title: 'Senior Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2026-08-09',
      url: 'https://canva.com/jobs/flutter',
      description: 'Looking for a Senior Flutter Developer skilled in Flutter and Dart.',
      requirements: ['Flutter', 'Dart', 'BLoC'],
      createdAt: new Date().toISOString(),
    };
    await jobRepository.saveMany([job]);

    const ranking = jobRankingService.rankJob(job, masterResume);
    expect(ranking.matchScore).toBeGreaterThanOrEqual(75);
    expect(['APPLY_NOW', 'HIGH_PRIORITY', 'GOOD_MATCH']).toContain(ranking.recommendation);

    const clResult = await coverLetterService.generateCoverLetter(job.id);
    const letterText = clResult.coverLetter.contentParagraphs.join(' ');

    expect(letterText).toContain('Flutter');
    expect(letterText).not.toContain('React');
    expect(letterText).not.toContain('Docker');
    expect(letterText).not.toContain('AWS');
  });

  test('TEST 2: Candidate 3.8 yrs Flutter/Dart + Backend Engineer (Go + Kubernetes + AWS) -> DO_NOT_APPLY', async () => {
    const job: JobListing = {
      id: 'test-2-backend-go',
      platform: 'Lever',
      company: 'CloudCorp',
      title: 'Backend Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: true,
      postedDate: 'Today',
      url: 'https://cloudcorp.io/jobs/go',
      description: 'Backend Engineer needed with Go, Kubernetes, and AWS infrastructure experience.',
      requirements: ['Go', 'Kubernetes', 'AWS', 'gRPC'],
      createdAt: new Date().toISOString(),
    };
    await jobRepository.saveMany([job]);

    const ranking = jobRankingService.rankJob(job, masterResume);
    expect(ranking.recommendation).toBe('DO_NOT_APPLY');
    expect(ranking.reasonsToSkip.some((r) => r.includes('Go') || r.includes('Kubernetes'))).toBe(true);

    const clResult = await coverLetterService.generateCoverLetter(job.id);
    const letterText = clResult.coverLetter.contentParagraphs.join(' ');
    expect(letterText).not.toContain('experience in Go');
    expect(letterText).not.toContain('experience in Kubernetes');
  });

  test('TEST 3: Senior Flutter Developer requiring 5+ years -> Experience gap ~1.2 years', async () => {
    const job: JobListing = {
      id: 'test-3-experience-gap',
      platform: 'Workable',
      company: 'Fintech Mobile',
      title: 'Lead Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: 'Today',
      url: 'https://fintech.io/jobs/lead-flutter',
      description: 'Must have 5+ years experience building mobile apps in Flutter.',
      requirements: ['5+ years experience', 'Flutter', 'Dart'],
      createdAt: new Date().toISOString(),
    };
    await jobRepository.saveMany([job]);

    const ranking = jobRankingService.rankJob(job, masterResume);
    expect(ranking.experienceGap).toBeCloseTo(1.2, 1);
  });

  test('TEST 4: Job posted 2 days ago -> FRESH', () => {
    const freshJob: JobListing = {
      id: 'test-4-fresh',
      platform: 'Seek',
      company: 'Fresh Company',
      title: 'Mobile Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2 days ago',
      url: 'https://example.com/fresh',
      createdAt: new Date().toISOString(),
    };

    const freshness = applicationDecisionEngine.evaluateFreshnessLabel(freshJob);
    expect(freshness.label).toBe('FRESH');
    expect(freshness.score).toBeGreaterThanOrEqual(90);
  });

  test('TEST 5: Job posted in 2024 -> STALE', () => {
    const staleJob: JobListing = {
      id: 'test-5-stale',
      platform: 'Seek',
      company: 'Old Company',
      title: 'Mobile Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: '2024-08-05',
      url: 'https://example.com/stale',
      createdAt: '2024-08-05T00:00:00.000Z',
    };

    const freshness = applicationDecisionEngine.evaluateFreshnessLabel(staleJob);
    expect(freshness.label).toBe('STALE');
    expect(freshness.score).toBeLessThanOrEqual(20);
  });

  test('TEST 6: Job has no sponsorship information -> Visa status = UNKNOWN', () => {
    const unmentionedJob: JobListing = {
      id: 'test-6-unknown-visa',
      platform: 'Seek',
      company: 'Local Business',
      title: 'Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      postedDate: 'Today',
      url: 'https://example.com/job6',
      description: 'Mobile developer role in Sydney CBD.',
      createdAt: new Date().toISOString(),
    };

    const visaStatus = applicationDecisionEngine.evaluateVisaEvidence(unmentionedJob);
    expect(visaStatus).toBe('UNKNOWN');
  });

  test('TEST 7: Job explicitly says sponsorship available -> CONFIRMED_SPONSORSHIP with evidence', () => {
    const confirmedJob: JobListing = {
      id: 'test-7-confirmed-visa',
      platform: 'Greenhouse',
      company: 'Global Scaleup',
      title: 'Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: 'Today',
      url: 'https://example.com/job7',
      description: 'Visa sponsorship provided for qualified international candidates.',
      createdAt: new Date().toISOString(),
    };

    const visaStatus = applicationDecisionEngine.evaluateVisaEvidence(confirmedJob);
    expect(visaStatus).toBe('CONFIRMED_SPONSORSHIP');
  });

  test('TEST 8: Generate cover letters for two different jobs -> Strict job identity & zero cross-contamination', async () => {
    const jobX: JobListing = {
      id: 'test-8-job-x',
      platform: 'Greenhouse',
      company: 'Company X',
      title: 'iOS Flutter Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: 'Today',
      url: 'https://companyx.com/jobs/1',
      description: 'Flutter iOS specialist needed.',
      requirements: ['Flutter', 'iOS'],
      createdAt: new Date().toISOString(),
    };

    const jobY: JobListing = {
      id: 'test-8-job-y',
      platform: 'Workable',
      company: 'Company Y',
      title: 'Android Flutter Developer',
      location: 'Melbourne, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      postedDate: 'Today',
      url: 'https://companyy.com/jobs/2',
      description: 'Flutter Android specialist needed.',
      requirements: ['Flutter', 'Android'],
      createdAt: new Date().toISOString(),
    };

    await jobRepository.saveMany([jobX, jobY]);

    const clX = await coverLetterService.generateCoverLetter(jobX.id);
    const clY = await coverLetterService.generateCoverLetter(jobY.id);

    expect(clX.coverLetter.companyName).toBe('Company X');
    expect(clX.coverLetter.jobTitle).toBe('iOS Flutter Engineer');
    expect(clX.coverLetter.jobId).toBe(jobX.id);

    expect(clY.coverLetter.companyName).toBe('Company Y');
    expect(clY.coverLetter.jobTitle).toBe('Android Flutter Developer');
    expect(clY.coverLetter.jobId).toBe(jobY.id);

    expect(clX.coverLetter.companyName).not.toBe(clY.coverLetter.companyName);
  });
});
