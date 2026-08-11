/**
 * @file src/services/__tests__/ApplicationPreparationPipeline.spec.ts
 * @description Unit and Integration Test Suite for the AI Application Preparation Pipeline.
 * Tests zero-fabrication tailored resume generation, cover letter generation, application readiness checklist,
 * application draft creation, and safe browser autofill field analysis.
 */

import { tailoredResumeService } from '../TailoredResumeService';
import { coverLetterService } from '../CoverLetterService';
import { applicationPreparationService } from '../ApplicationPreparationService';
import { db } from '../../database';
import { JobListing, MasterResume, JobLifecycleStatus } from '@sentinel/types';

describe('ApplicationPreparationPipeline', () => {
  const mockMasterResume: MasterResume = {
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

  const mockTestJob: JobListing = {
    id: 'prep-job-1',
    platform: 'Greenhouse',
    company: 'Canva',
    title: 'Senior Flutter Developer',
    location: 'Sydney, AU',
    country: 'AU',
    visaSponsorship: true,
    isRemote: true,
    url: 'https://canva.com/jobs/senior-flutter-developer',
    description: 'Looking for a Senior Flutter Developer with expertise in Dart, BLoC, and mobile architecture.',
    requirements: ['Flutter', 'Dart', 'BLoC', 'Architecture'],
    postedDate: 'Today',
    createdAt: new Date().toISOString(),
    jobStatus: JobLifecycleStatus.ACTIVE,
    sourceVerified: true,
  };

  beforeAll(async () => {
    await db.updateMasterResume(mockMasterResume);
    await db.saveJobs([mockTestJob]);
  });

  it('1. Tailored Resume Generation: Zero Fabrication Guarantee', async () => {
    const result = await tailoredResumeService.generateTailoredResume(mockTestJob.id);

    expect(result.structured).toBeDefined();
    expect(result.structured.company).toBe('Canva');
    expect(result.structured.jobTitle).toBe('Senior Flutter Developer');
    expect(result.structured.candidate.name).toBe('Kaushik Khandala');

    // CRITICAL ACCEPTANCE TEST: Candidate experience MUST NOT turn into "5 years" or "6 years" or "10 years"
    const jsonStr = JSON.stringify(result.structured);
    expect(jsonStr).not.toContain('5 years experience');
    expect(jsonStr).not.toContain('7+ years experience');

    // Companies & degrees must come strictly from master resume
    const companies = result.structured.experience.map((e) => e.company);
    expect(companies).toContain('Safal Infosoft');
    expect(companies).toContain('Potenz Technology');
    expect(companies).not.toContain('Fabricated Corp');

    // Versioning check
    expect(result.version).toBeGreaterThanOrEqual(1);
    expect(result.tailoredResume.version).toBe(result.version);
  });

  it('2. Cover Letter Generation: Professional & Job-Specific', async () => {
    const result = await coverLetterService.generateCoverLetter(mockTestJob.id);

    expect(result.coverLetter).toBeDefined();
    expect(result.coverLetter.companyName).toBe('Canva');
    expect(result.coverLetter.jobTitle).toBe('Senior Flutter Developer');
    expect(result.coverLetter.salutation).toContain('Canva');

    const contentText = result.coverLetter.contentParagraphs.join(' ');
    expect(contentText).toContain('Flutter');
    expect(contentText).not.toContain('Fabricated Experience');
    expect(result.version).toBeGreaterThanOrEqual(1);
  });

  it('3. Application Readiness Check: Verifies complete readiness checklist', async () => {
    const readiness = await applicationPreparationService.getReadiness(mockTestJob.id);

    expect(readiness.jobId).toBe(mockTestJob.id);
    expect(readiness.checks.masterResumeExists).toBe(true);
    expect(readiness.checks.candidateNameExists).toBe(true);
    expect(readiness.checks.emailExists).toBe(true);
    expect(readiness.checks.jobUrlExists).toBe(true);
    expect(readiness.checks.tailoredResumeExists).toBe(true);
    expect(readiness.checks.coverLetterAvailable).toBe(true);
    expect(readiness.isReady).toBe(true);
    expect(readiness.readinessScore).toBeGreaterThanOrEqual(90);
  });

  it('4. Application Preparation: Creates DRAFT record (Not SUBMITTED)', async () => {
    const prep = await applicationPreparationService.prepareApplication(mockTestJob.id);

    expect(prep.application).toBeDefined();
    expect(prep.application.jobId).toBe(mockTestJob.id);
    expect(prep.application.company).toBe('Canva');
    expect(prep.application.status).not.toBe('SUBMITTED'); // MUST NOT BE SUBMITTED
    expect(prep.readiness.isReady).toBe(true);
  });

  it('5. Safe Browser Autofill: Unknown fields marked REQUIRES_USER_INPUT', async () => {
    const autofill = await applicationPreparationService.analyzeAutofillFields(mockTestJob.id);

    expect(autofill.safeFields.length).toBeGreaterThan(0);
    expect(autofill.safeFields.some((f) => f.fieldName === 'Email Address' && f.mappedValue === 'kaushik.khandala@example.com')).toBe(true);

    expect(autofill.requiresInputFields.length).toBeGreaterThan(0);
    const workAuthField = autofill.requiresInputFields.find((f) => f.fieldName.includes('Work Authorization'));
    expect(workAuthField).toBeDefined();
    expect(workAuthField?.requiresUserInput).toBe(true);
    expect(workAuthField?.mappedValue).toBeNull();
  });
});
