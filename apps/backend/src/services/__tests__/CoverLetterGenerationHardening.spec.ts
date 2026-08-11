/**
 * @file src/services/__tests__/CoverLetterGenerationHardening.spec.ts
 * @description Comprehensive test suite for Cover Letter Generation Pipeline & Experience Formatter.
 */

import { formatCandidateExperienceYears } from '../../utils/experienceFormatter';
import { coverLetterService } from '../CoverLetterService';
import { contentFabricationAuditor } from '../ContentFabricationAuditor';
import { db } from '../../database';
import { MasterResume, JobListing, CoverLetter } from '@sentinel/types';

describe('CoverLetterGenerationHardening Spec Suite', () => {
  jest.setTimeout(30000);

  const testMasterResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushikkhandalakaushik234@gmail.com',
    phone: '+91 8849170743',
    location: 'Ahmedabad, India',
    linkedIn: 'https://linkedin.com/in/kaushikkhandala',
    github: 'https://github.com/kaushikkhandala',
    portfolio: 'https://kaushikkhandala.dev',
    summary: 'Flutter Developer with 3.8 years of experience building mobile applications.',
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
        location: 'Ahmedabad, India',
        startDate: '12/2023',
        endDate: 'Present',
        highlights: ['Built cross-platform Flutter applications using BLoC state management.'],
        technologiesUsed: ['Flutter', 'Dart', 'BLoC', 'SQLite', 'Hive', 'Firebase'],
      },
      {
        company: 'Potenz Technology',
        role: 'Flutter Developer',
        location: 'Ahmedabad, India',
        startDate: '01/2023',
        endDate: '11/2023',
        highlights: ['Integrated RESTful API endpoints and state management.'],
        technologiesUsed: ['Flutter', 'Dart', 'REST APIs', 'Git'],
      },
      {
        company: 'Potenz Technology',
        role: 'Operations Manager',
        location: 'Ahmedabad, India',
        startDate: '07/2022',
        endDate: '01/2023',
        highlights: ['Managed tech team operations.'],
        technologiesUsed: ['Flutter', 'Dart', 'Operations'],
      },
    ],
    education: [
      {
        institution: 'Sal Engineering & Technical Institute',
        degree: 'B.E',
        fieldOfStudy: 'Information Technology',
        graduationYear: '2022',
      },
    ],
    certifications: [],
    projects: [],
  };

  const sapJob: JobListing = {
    id: 'sap-flutter-lead-001',
    title: 'Lead Flutter Engineer',
    company: 'SAP',
    location: 'Bangalore, India (Hybrid)',
    description: 'Looking for a Lead Flutter Engineer with deep Dart, mobile architecture, BLoC, and API integration skills.',
    requirements: ['Flutter', 'Dart', 'BLoC', 'REST APIs', 'Mobile Architecture'],
    postedDate: '2026-08-10',
    source: 'SAP Careers',
    url: 'https://careers.sap.com/jobs/001',
    platform: 'LinkedIn',
    country: 'AU',
    visaSponsorship: false,
    isRemote: false,
    createdAt: '2026-08-10T00:00:00.000Z',
  };

  beforeAll(async () => {
    await db.updateMasterResume(testMasterResume);
    await db.saveJobs([sapJob]);
  });

  describe('1. Centralized Experience Formatter Unit Tests', () => {
    test('Formats integer 3 as "3 years"', () => {
      expect(formatCandidateExperienceYears(3)).toBe('3 years');
    });

    test('Formats decimal 3.0 as "3 years"', () => {
      expect(formatCandidateExperienceYears(3.0)).toBe('3 years');
    });

    test('Formats decimal 3.5 as "3.5 years"', () => {
      expect(formatCandidateExperienceYears(3.5)).toBe('3.5 years');
    });

    test('Formats decimal 3.8 as "3.8 years"', () => {
      expect(formatCandidateExperienceYears(3.8)).toBe('3.8 years');
    });

    test('Formats integer 4 as "4 years"', () => {
      expect(formatCandidateExperienceYears(4)).toBe('4 years');
    });

    test('Formats string "3.8" as "3.8 years"', () => {
      expect(formatCandidateExperienceYears('3.8')).toBe('3.8 years');
    });

    test('Formats string "3.8 years" as "3.8 years"', () => {
      expect(formatCandidateExperienceYears('3.8 years')).toBe('3.8 years');
    });

    test('Never produces malformed string like "3.3.8 years"', () => {
      const formatted = formatCandidateExperienceYears('3.3.8');
      expect(formatted).not.toContain('3.3.8');
      expect(formatted).toBe('3.3 years');
    });
  });

  describe('2. Cover Letter Generation Pipeline & Auditing', () => {
    test('Generates cover letter for SAP Lead Flutter Engineer with verified data', async () => {
      const res = await coverLetterService.generateCoverLetter(sapJob.id);
      expect(res.coverLetter).toBeDefined();
      expect(res.coverLetter.companyName).toBe('SAP');
      expect(res.coverLetter.jobTitle).toBe('Lead Flutter Engineer');

      const fullText = `${res.coverLetter.salutation}\n\n${res.coverLetter.contentParagraphs.join('\n\n')}\n\n${res.coverLetter.closing}`;

      // Must contain candidate name
      expect(fullText).toContain('Kaushik Khandala');

      // Must NOT contain 3.3.8 years
      expect(fullText).not.toContain('3.3.8');
      expect(fullText).not.toContain('3..8');

      // Must NOT contain unverified skills
      expect(fullText).not.toContain('TypeScript');
      expect(fullText).not.toContain('React');
      expect(fullText).not.toContain('Docker');
      expect(fullText).not.toContain('PostgreSQL');
      expect(fullText).not.toContain('Redis');

      // Must NOT contain fake institutions / degrees
      expect(fullText).not.toContain('University of Sydney');
      expect(fullText).not.toContain('Bachelor of Science');

      // Must NOT contain placeholder string "Target Company"
      expect(fullText).not.toContain('Target Company');
      expect(fullText).not.toContain('example.com');

      // Verify audit metadata attached
      expect(res.coverLetter.auditMetadata).toBeDefined();
      expect(res.coverLetter.auditMetadata?.jobId).toBe(sapJob.id);
      expect(res.coverLetter.auditMetadata?.verifiedSkillsUsed).toContain('Flutter');
    });

    test('Sanitizes malformed numeric string and unverified metrics if injected', () => {
      const testLetter: CoverLetter = {
        id: 'test_cl_1',
        jobId: sapJob.id,
        companyName: 'SAP',
        jobTitle: 'Lead Flutter Engineer',
        salutation: 'Dear Hiring Team at SAP,',
        contentParagraphs: [
          'With 3.3.8 years of experience, I am writing to apply for the position.',
          'I boosted throughput by 40% and led microservices optimizations at Target Company.',
        ],
        closing: 'Sincerely,\nKaushik Khandala',
        pdfStoragePath: '/path.pdf',
        generatedAt: new Date().toISOString(),
      };

      const audit = contentFabricationAuditor.auditAndSanitizeCoverLetter(testLetter, testMasterResume, sapJob);
      const sanitizedText = audit.sanitized.contentParagraphs.join(' ');

      expect(sanitizedText).not.toContain('3.3.8');
      expect(sanitizedText).toContain('3.8 years');
      expect(sanitizedText).not.toContain('boosted throughput by 40%');
    });
  });
});
