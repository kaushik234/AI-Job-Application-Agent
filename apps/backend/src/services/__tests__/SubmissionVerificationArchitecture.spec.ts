/**
 * @file src/services/__tests__/SubmissionVerificationArchitecture.spec.ts
 * @description Automated test suite for Two-Stage Application Submission Verification Architecture.
 * Tests strict separation of internal candidate submit actions vs external platform confirmation.
 */

import { applicationPreparationService } from '../ApplicationPreparationService';
import { db } from '../../database';
import { ApplicationStatus, JobListing, MasterResume, JobLifecycleStatus } from '@sentinel/types';

describe('Application Submission Verification Architecture Spec Suite', () => {
  const mockSeekJob: JobListing = {
    id: 'canva-seek-flutter-dev-99',
    title: 'Senior Flutter Developer',
    company: 'Canva Seek',
    location: 'Sydney, Australia',
    description: 'Canva Seek is hiring a Senior Flutter Developer with Dart and BLoC expertise.',
    requirements: ['Flutter', 'Dart'],
    postedDate: '2026-08-11',
    source: 'SEEK',
    url: 'https://www.seek.com.au/job/9999',
    platform: 'Seek',
    country: 'AU',
    visaSponsorship: false,
    isRemote: false,
    createdAt: '2026-08-11T00:00:00.000Z',
    jobStatus: JobLifecycleStatus.ACTIVE,
    sourceVerified: true,
  };

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
      databases: ['SQLite'],
      tools: ['Git'],
    },
    experience: [
      {
        company: 'Safal Infosoft',
        role: 'Flutter Developer',
        location: 'Ahmedabad',
        startDate: '12/2023',
        endDate: 'Present',
        highlights: ['Built Flutter apps'],
        technologiesUsed: ['Flutter', 'Dart'],
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

  beforeAll(async () => {
    await db.updateMasterResume(mockMasterResume);
    await db.saveJobs([mockSeekJob]);

    // Clean existing state if present
    const existing = await db.getApplicationByJobId(mockSeekJob.id);
    if (existing) {
      existing.status = ApplicationStatus.DRAFT;
      existing.appliedAt = undefined;
      existing.externalVerification = undefined;
      await db.upsertApplication(existing);
    }
  });

  describe('TEST A: Internal /submit-manual succeeds with no external evidence', () => {
    test('Records USER_SUBMITTED / SUBMISSION_UNVERIFIED and NEVER marks EXTERNAL_SUBMISSION_CONFIRMED', async () => {
      const record = await applicationPreparationService.recordUserSubmission(mockSeekJob.id, true);

      expect(record.status).toBe(ApplicationStatus.USER_SUBMITTED);
      expect(record.appliedAt).toBeDefined();
      expect(record.externalVerification).toBeDefined();
      expect(record.externalVerification?.isVerified).toBe(false);
      expect(record.externalVerification?.status).toBe(ApplicationStatus.SUBMISSION_UNVERIFIED);
      expect(record.status).not.toBe(ApplicationStatus.EXTERNAL_SUBMISSION_CONFIRMED);

      const auditLogs = applicationPreparationService.getAuditLogs(record.id);
      expect(auditLogs.some((l) => l.action === 'USER_SUBMITTED')).toBe(true);
    });
  });

  describe('TEST B: External platform history contains a different job', () => {
    test('Rejects mismatching external history ("App Big Dog") and keeps status SUBMISSION_UNVERIFIED', async () => {
      const verifyResult = await applicationPreparationService.verifyExternalSubmission(mockSeekJob.id, {
        platformActivity: {
          company: 'App Big Dog',
          jobTitle: 'Founding Mobile Engineer (Flutter)',
          platform: 'SEEK',
        },
      });

      expect(verifyResult.isVerified).toBe(false);
      expect(verifyResult.application.status).toBe(ApplicationStatus.SUBMISSION_UNVERIFIED);
      expect(verifyResult.verification.verificationNotes).toContain('mismatch');
      expect(verifyResult.application.status).not.toBe(ApplicationStatus.EXTERNAL_SUBMISSION_CONFIRMED);
    });
  });

  describe('TEST C: External confirmation matches company + job + platform', () => {
    test('Confirms external submission when deterministic evidence matches target job', async () => {
      const verifyResult = await applicationPreparationService.verifyExternalSubmission(mockSeekJob.id, {
        confirmationUrl: 'https://www.seek.com.au/job/9999/applied/CONF-88712',
        confirmationNumber: 'CONF-88712',
      });

      expect(verifyResult.isVerified).toBe(true);
      expect(verifyResult.application.status).toBe(ApplicationStatus.EXTERNAL_SUBMISSION_CONFIRMED);
      expect(verifyResult.verification.confirmationNumber).toBe('CONF-88712');
      expect(verifyResult.verification.matchedCompany).toBe('Canva Seek');

      const auditLogs = applicationPreparationService.getAuditLogs(verifyResult.application.id);
      expect(auditLogs.some((l) => l.action === 'EXTERNAL_SUBMISSION_CONFIRMED')).toBe(true);
    });
  });

  describe('TEST D: Sensitive fields remain blocked for human input', () => {
    test('Blocks sensitive questions (Visa, Salary, Work Auth) from autofill', async () => {
      const analysis = await applicationPreparationService.analyzeAutofillFields(mockSeekJob.id);

      const sensitiveVisa = analysis.classifications.find((c) => c.field === 'Visa Sponsorship Requirements');
      expect(sensitiveVisa?.autofillAllowed).toBe(false);
      expect(sensitiveVisa?.verificationRequired).toBe(true);

      const sensitiveSalary = analysis.classifications.find((c) => c.field === 'Desired Salary Expectations');
      expect(sensitiveSalary?.autofillAllowed).toBe(false);

      const autofill = await applicationPreparationService.performSafeAutofill(mockSeekJob.id);
      expect(autofill.blockedSensitiveFields).toContain('Visa Sponsorship Requirements');
    });
  });

  describe('TEST E: Repeated submit calls prevent duplicate records', () => {
    test('Submitting multiple times updates existing record without creating duplicates', async () => {
      const prep1 = await applicationPreparationService.prepareApplication(mockSeekJob.id);
      const sub1 = await applicationPreparationService.recordUserSubmission(mockSeekJob.id, true);
      const sub2 = await applicationPreparationService.recordUserSubmission(mockSeekJob.id, true);

      expect(sub1.id).toBe(sub2.id);
      expect(sub1.id).toBe(prep1.application.id);
    });
  });
});
