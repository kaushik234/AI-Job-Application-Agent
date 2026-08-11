/**
 * @file src/services/__tests__/DemoVerificationMode.spec.ts
 * @description Spec Test Suite for SENTINEL AI - Demo / Verification Mode. Tests demo form analysis, safe autofill, Cover Letter evidence verification, network audit logging, and strict manual submission guardrails.
 */

import { applicationPreparationService } from '../ApplicationPreparationService';
import { db } from '../../database';
import { ApplicationStatus, JobListing, MasterResume } from '@sentinel/types';

describe('SENTINEL AI — Demo / Verification Mode Spec Suite', () => {
  const mockDemoJob: JobListing = {
    id: 'demo-senior-flutter-dev',
    title: 'Senior Flutter Developer',
    company: 'Demo Technologies',
    location: 'Sydney, Australia (Hybrid)',
    description: 'Demo Technologies is hiring a Senior Flutter Developer with Dart, BLoC, SQLite, and mobile architecture experience.',
    requirements: ['Flutter', 'Dart', 'BLoC', 'SQLite'],
    postedDate: '2026-08-11',
    source: 'Demo Site',
    url: 'http://localhost:3000/demo-job-application',
    platform: 'LinkedIn',
    country: 'AU',
    visaSponsorship: true,
    isRemote: false,
    createdAt: '2026-08-11T00:00:00.000Z',
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
        technologiesUsed: ['Flutter', 'Dart', 'BLoC', 'SQLite', 'Hive'],
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
    await db.saveJobs([mockDemoJob]);
    // Ensure clean application state for test run
    const existing = await db.getApplicationByJobId(mockDemoJob.id);
    if (existing) {
      existing.status = ApplicationStatus.DRAFT;
      existing.appliedAt = undefined;
      await db.upsertApplication(existing);
    }
  });

  describe('1. Demo Job Preparation & Form Analysis', () => {
    test('Prepares demo application draft without automatic submission', async () => {
      const prep = await applicationPreparationService.prepareApplication(mockDemoJob.id);
      expect(prep.application).toBeDefined();
      expect(prep.application.jobId).toBe(mockDemoJob.id);
      expect(prep.application.company).toBe('Demo Technologies');
      expect(prep.application.status).not.toBe(ApplicationStatus.SUBMITTED);
    });

    test('Classifies 16 form fields into SAFE, SENSITIVE, and UNKNOWN', async () => {
      const analysis = await applicationPreparationService.analyzeAutofillFields(mockDemoJob.id);

      expect(analysis.safeFields.length).toBeGreaterThanOrEqual(9);
      expect(analysis.requiresInputFields.length).toBeGreaterThanOrEqual(4);

      const safeEmail = analysis.classifications.find((c) => c.field === 'Email Address');
      expect(safeEmail?.category).toBe('SAFE');

      const sensitiveVisa = analysis.classifications.find((c) => c.field === 'Visa Sponsorship Requirements');
      expect(sensitiveVisa?.category).toBe('SENSITIVE');

      const unknownField = analysis.classifications.find((c) => c.field === 'Are you eligible?');
      expect(unknownField?.category).toBe('UNKNOWN');
    });
  });

  describe('2. Cover Letter Evidence Verification Audit', () => {
    test('Returns evidence verification breakdown ("Why this letter was generated")', async () => {
      const evidence = await applicationPreparationService.getCoverLetterEvidence(mockDemoJob.id);

      expect(evidence.company).toBe('Demo Technologies');
      expect(evidence.verifiedCount).toBeGreaterThan(0);
      expect(evidence.claims.some((c) => c.status === 'VERIFIED')).toBe(true);

      const expClaim = evidence.claims.find((c) => c.claim.includes('3.8 years'));
      expect(expClaim?.status).toBe('VERIFIED');
      expect(expClaim?.evidence).toContain('Master Profile');

      const unsupportedClaim = evidence.claims.find((c) => c.status === 'UNSUPPORTED');
      expect(unsupportedClaim).toBeDefined();
      expect(unsupportedClaim?.evidence).toContain('No candidate evidence');
    });
  });

  describe('3. Safe Autofill & Zero-AutoSubmit Verification', () => {
    test('Autofills safe fields, blocks sensitive/unknown fields, and NEVER mutates status to SUBMITTED', async () => {
      const autofill = await applicationPreparationService.performSafeAutofill(mockDemoJob.id);

      expect(autofill.autofilledFields.some((f) => f.field === 'First Name' && f.value === 'Kaushik')).toBe(true);
      expect(autofill.blockedSensitiveFields).toContain('Visa Sponsorship Requirements');
      expect(autofill.blockedUnknownFields).toContain('Are you eligible?');

      // Autofill MUST NEVER change submission status to SUBMITTED!
      expect(autofill.status).not.toBe(ApplicationStatus.SUBMITTED);
      expect(autofill.status).toBe(ApplicationStatus.AWAITING_USER_REVIEW);
    });

    test('Records network & event audit logs for every operation', async () => {
      const auditLogs = applicationPreparationService.getAuditLogs(`app-${mockDemoJob.id}`);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.some((l) => l.action === 'FORM_ANALYZED')).toBe(true);
      expect(auditLogs.some((l) => l.action === 'FIELD_AUTOFILLED')).toBe(true);
      expect(auditLogs.some((l) => l.action === 'SENSITIVE_FIELD_BLOCKED')).toBe(true);
    });
  });

  describe('4. Strict Manual Submission Guardrail', () => {
    test('Rejects background / programmatic auto-submit calls', async () => {
      await expect(
        applicationPreparationService.recordUserSubmission(mockDemoJob.id, false)
      ).rejects.toThrow('Automatic submission is strictly forbidden. Submissions must be manually executed by human user.');
    });

    test('Allows manual user submission exclusively when candidate explicitly clicks submit', async () => {
      const appRecord = await applicationPreparationService.recordUserSubmission(mockDemoJob.id, true);
      expect([ApplicationStatus.USER_SUBMITTED, ApplicationStatus.SUBMITTED]).toContain(appRecord.status);
      expect(appRecord.appliedAt).toBeDefined();
    });
  });
});
