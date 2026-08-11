/**
 * @file src/services/__tests__/ApplicationExecutionPipeline.spec.ts
 * @description Comprehensive Spec Test Suite for Application Execution Pipeline, Readiness Checklist, Form Field Safety Classification, Safe Autofill, Audit Logging, and Manual Submission Safety Guardrails.
 */

import { applicationPreparationService } from '../ApplicationPreparationService';
import { db } from '../../database';
import { ApplicationStatus, JobListing, MasterResume, JobLifecycleStatus } from '@sentinel/types';

describe('ApplicationExecutionPipeline Spec Suite', () => {
  const mockMasterResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushik.khandala@example.com',
    phone: '+61 412 345 678',
    location: 'Sydney, Australia',
    summary: 'Experienced Flutter Developer with 3.8 years of verified experience.',
    linkedIn: 'https://linkedin.com/in/kaushikkhandala',
    github: 'https://github.com/kaushikkhandala',
    portfolio: 'https://kaushikkhandala.dev',
    explicitExperienceYears: 3.8,
    skills: {
      languages: ['Dart'],
      frameworks: ['Flutter', 'BLoC'],
      cloudAndDevOps: ['Firebase'],
      databases: ['SQLite', 'Hive'],
      tools: ['Git'],
    },
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Flutter Developer',
        location: 'Ahmedabad',
        startDate: '12/2023',
        endDate: 'Present',
        highlights: ['Built Flutter cross-platform applications'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC'],
      },
    ],
    education: [
      {
        institution: 'Gujarat Technological University',
        degree: 'Bachelor of Engineering',
        fieldOfStudy: 'Computer Engineering',
        graduationYear: '2023',
      },
    ],
    certifications: [],
    projects: [],
  };

  const mockJobA: JobListing = {
    id: 'sap-flutter-lead-777',
    title: 'Lead Flutter Engineer',
    company: 'SAP',
    location: 'Bangalore, India (Hybrid)',
    description: 'Seeking a Lead Flutter Engineer with Dart, BLoC, and mobile architecture experience.',
    requirements: ['Flutter', 'Dart', 'BLoC'],
    postedDate: '2026-08-10',
    source: 'SAP Careers',
    url: 'https://careers.sap.com/jobs/777',
    platform: 'LinkedIn',
    country: 'AU',
    visaSponsorship: false,
    isRemote: false,
    createdAt: '2026-08-10T00:00:00.000Z',
    jobStatus: JobLifecycleStatus.ACTIVE,
    sourceVerified: true,
  };

  const mockJobB: JobListing = {
    id: 'amazon-sde2-888',
    title: 'Software Development Engineer II',
    company: 'Amazon',
    location: 'Vancouver, Canada',
    description: 'Amazon is hiring SDE II for cloud services.',
    requirements: ['Java', 'AWS'],
    postedDate: '2026-08-10',
    source: 'Amazon Jobs',
    url: 'https://amazon.jobs/888',
    platform: 'LinkedIn',
    country: 'CA',
    visaSponsorship: true,
    isRemote: false,
    createdAt: '2026-08-10T00:00:00.000Z',
    jobStatus: JobLifecycleStatus.ACTIVE,
    sourceVerified: true,
  };

  beforeAll(async () => {
    await db.updateMasterResume(mockMasterResume);
    await db.saveJobs([mockJobA, mockJobB]);
  });

  describe('1. Application Preparation & Uniqueness (jobId + candidateId)', () => {
    test('Creates application draft with initial DRAFT / READY status', async () => {
      const prep = await applicationPreparationService.prepareApplication(mockJobA.id);
      expect(prep.application).toBeDefined();
      expect(prep.application.jobId).toBe(mockJobA.id);
      expect(prep.application.candidateId).toBe('cand_kaushik_khandala');
      expect(prep.readiness).toBeDefined();
    });

    test('Prevents duplicate application records when triggered repeatedly', async () => {
      const prep1 = await applicationPreparationService.prepareApplication(mockJobA.id);
      const prep2 = await applicationPreparationService.prepareApplication(mockJobA.id);

      expect(prep1.application.id).toBe(prep2.application.id);
      expect(prep1.application.createdAt).toBe(prep2.application.createdAt);
    });
  });

  describe('2. Readiness Verification & Strict Cross-Job Document Protection', () => {
    test('Evaluates readiness checklist and returns candidate & job facts status', async () => {
      const readiness = await applicationPreparationService.getReadiness(mockJobA.id);
      expect(readiness.jobId).toBe(mockJobA.id);
      expect(readiness.checks.candidateNameExists).toBe(true);
      expect(readiness.checks.emailExists).toBe(true);
      expect(readiness.checks.phoneExists).toBe(true);
      expect(readiness.checks.jobUrlExists).toBe(true);
    });

    test('Rejects tailored resume or cover letter belonging to ANOTHER job ID', async () => {
      // Save tailored resume for Job A
      await db.saveTailoredResume({
        id: 'tr-job-a',
        jobId: mockJobA.id,
        companyName: mockJobA.company,
        company: mockJobA.company,
        jobTitle: mockJobA.title,
        customSummary: 'Tailored summary for SAP',
        prioritizedSkills: ['Flutter', 'Dart', 'BLoC'],
        reorganizedExperience: [],
        keywordsOptimized: ['Flutter'],
        pdfStoragePath: '/resumes/job_a.pdf',
        generatedAt: new Date().toISOString(),
      });

      // Save cover letter for Job B
      await db.saveCoverLetter({
        id: 'cl-job-b',
        jobId: mockJobB.id,
        companyName: mockJobB.company,
        jobTitle: mockJobB.title,
        salutation: 'Dear Amazon Team,',
        contentParagraphs: ['Cover letter content for Job B'],
        closing: 'Sincerely,\nKaushik',
        pdfStoragePath: '/covers/job_b.pdf',
        generatedAt: new Date().toISOString(),
      });

      // Readiness for Job A should detect cover letter is missing for Job A
      const readinessA = await applicationPreparationService.getReadiness(mockJobA.id);
      expect(readinessA.checks.tailoredResumeExists).toBe(true);
      expect(readinessA.checks.coverLetterAvailable).toBe(false);
      expect(readinessA.missingItems).toContain('Cover letter for this specific job is missing');
    });
  });

  describe('3. Form Field Classification & Analysis', () => {
    test('Classifies fields into SAFE, SENSITIVE, and UNKNOWN', async () => {
      const analysis = await applicationPreparationService.analyzeAutofillFields(mockJobA.id);

      expect(analysis.safeFields.length).toBeGreaterThan(0);
      expect(analysis.requiresInputFields.length).toBeGreaterThan(0);
      expect(analysis.classifications.length).toBeGreaterThan(0);

      const safeEmail = analysis.classifications.find((c) => c.field === 'Email Address');
      expect(safeEmail?.category).toBe('SAFE');
      expect(safeEmail?.autofillAllowed).toBe(true);

      const sensitiveVisa = analysis.classifications.find((c) => c.field === 'Visa Sponsorship Requirements');
      expect(sensitiveVisa?.category).toBe('SENSITIVE');
      expect(sensitiveVisa?.autofillAllowed).toBe(false);

      const unknownField = analysis.classifications.find((c) => c.field === 'Are you eligible?');
      expect(unknownField?.category).toBe('UNKNOWN');
      expect(unknownField?.autofillAllowed).toBe(false);
    });
  });

  describe('4. Safe Autofill & Sensitive Question Protection', () => {
    test('Autofills SAFE fields and blocks sensitive/unknown fields', async () => {
      const autofill = await applicationPreparationService.performSafeAutofill(mockJobA.id);

      expect(autofill.autofilledFields.some((f) => f.field === 'First Name' && f.value === 'Kaushik')).toBe(true);
      expect(autofill.autofilledFields.some((f) => f.field === 'Email Address' && f.value === 'kaushik.khandala@example.com')).toBe(true);

      expect(autofill.blockedSensitiveFields).toContain('Visa Sponsorship Requirements');
      expect(autofill.blockedSensitiveFields).toContain('Work Authorization in Target Country');
      expect(autofill.blockedSensitiveFields).toContain('Desired Salary Expectations');

      expect(autofill.blockedUnknownFields).toContain('Are you eligible?');
      expect(autofill.status).toBe(ApplicationStatus.AWAITING_USER_REVIEW);
    });

    test('Records audit log entries for every autofilled field', async () => {
      const auditLogs = applicationPreparationService.getAuditLogs(`app-${mockJobA.id}`);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.some((l) => l.action === 'FIELD_AUTOFILLED')).toBe(true);
      expect(auditLogs.some((l) => l.action === 'SENSITIVE_FIELD_BLOCKED')).toBe(true);
    });
  });

  describe('5. Manual Submission Guardrail Enforcement', () => {
    test('Rejects automated/programmatic submission attempts', async () => {
      await expect(
        applicationPreparationService.recordUserSubmission(mockJobA.id, false)
      ).rejects.toThrow('Automatic submission is strictly forbidden. Submissions must be manually executed by human user.');
    });

    test('Allows manual user submission and transitions status to SUBMITTED', async () => {
      const record = await applicationPreparationService.recordUserSubmission(mockJobA.id, true);
      expect([ApplicationStatus.USER_SUBMITTED, ApplicationStatus.SUBMITTED]).toContain(record.status);
      expect(record.appliedAt).toBeDefined();

      const auditLogs = applicationPreparationService.getAuditLogs(record.id);
      expect(auditLogs.some((l) => l.action === 'USER_SUBMITTED' && l.userControlled === true)).toBe(true);
    });
  });
});
