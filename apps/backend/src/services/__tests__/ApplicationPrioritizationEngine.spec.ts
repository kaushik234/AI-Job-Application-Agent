/**
 * @file src/services/__tests__/ApplicationPrioritizationEngine.spec.ts
 * @description Comprehensive test suite for Application Prioritization Engine, Company Size Classification,
 * Opportunity Fit Scoring, Evidence-based Visa Evaluation, Zero-Fabrication Enforcement, and Deduplication.
 */

import { jobRankingService } from '../JobRankingService';
import { companyClassificationService } from '../CompanyClassificationService';
import { applicationDecisionEngine } from '../ApplicationDecisionEngine';
import { jobDeduplicationService } from '../JobDeduplicationService';
import { contentFabricationAuditor } from '../ContentFabricationAuditor';
import { db } from '../../database';
import { JobListing, MasterResume } from '@sentinel/types';

describe('ApplicationPrioritizationEngine', () => {
  const goldenMasterResume: MasterResume = {
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
        highlights: ['Developed mobile app features using Flutter & Dart.'],
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
    await db.updateMasterResume(goldenMasterResume);
  });

  describe('1. Small Startup vs Large Enterprise Prioritization', () => {
    const smallStartupJob: JobListing = {
      id: 'job-small-startup',
      platform: 'Workable',
      company: 'AppStudio Labs',
      title: 'Senior Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://appstudio.io/jobs/flutter',
      description: 'Small 11-50 team building cross-platform Flutter and Dart mobile apps with BLoC architecture.',
      requirements: ['Flutter', 'Dart', 'BLoC', 'Firebase'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    const enterpriseJob: JobListing = {
      id: 'job-large-enterprise',
      platform: 'Greenhouse',
      company: 'Atlassian Corp',
      title: 'Senior Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://atlassian.com/jobs/flutter',
      description: 'Enterprise 5000+ multinational seeking Senior Flutter Developer for mobile platform.',
      requirements: ['Flutter', 'Dart', 'BLoC', 'Firebase'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    it('should classify company sizes correctly without inventing employee counts', () => {
      const startupSize = companyClassificationService.classifyCompanySize(smallStartupJob);
      expect(startupSize).toBe('SMALL');

      const enterpriseSize = companyClassificationService.classifyCompanySize(enterpriseJob);
      expect(enterpriseSize).toBe('ENTERPRISE');
    });

    it('should calculate strong Opportunity Fit scores for both small and large companies', () => {
      const startupDecision = applicationDecisionEngine.evaluateApplicationDecision(smallStartupJob, goldenMasterResume, {
        roleMatch: 95,
        skillsMatch: 95,
        experienceMatch: 100,
        locationMatch: 95,
        visaMatch: 100,
      });

      expect(startupDecision.recommendation).toBe('APPLY_NOW');
      expect(startupDecision.applicationPriorityScore).toBeGreaterThanOrEqual(80);
      expect(startupDecision.whyThisJob.some((w) => w.includes('Verified experience'))).toBe(true);

      const enterpriseDecision = applicationDecisionEngine.evaluateApplicationDecision(enterpriseJob, goldenMasterResume, {
        roleMatch: 95,
        skillsMatch: 95,
        experienceMatch: 100,
        locationMatch: 95,
        visaMatch: 100,
      });

      expect(enterpriseDecision.recommendation).toBe('APPLY_NOW');
      expect(enterpriseDecision.applicationPriorityScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('2. Severe Mismatch Handling (DO_NOT_APPLY)', () => {
    const dataEngineerJob: JobListing = {
      id: 'job-mismatch-data-engineer',
      platform: 'Greenhouse',
      company: 'OpenAI',
      title: 'Senior Data Engineer - Infrastructure',
      location: 'San Francisco, US',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      url: 'https://openai.com/careers/data-engineer',
      description: 'Require 8+ years Python, PySpark, Hadoop, Kubernetes, and Data Lake architecture.',
      requirements: ['Python', 'PySpark', 'Hadoop', 'Kubernetes', 'AWS Redshift'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    it('should assign DO_NOT_APPLY recommendation for severe role and skill mismatches', () => {
      const decision = applicationDecisionEngine.evaluateApplicationDecision(dataEngineerJob, goldenMasterResume, {
        roleMatch: 20,
        skillsMatch: 15,
        experienceMatch: 30,
        locationMatch: 20,
        visaMatch: 10,
      });

      expect(decision.recommendation).toBe('DO_NOT_APPLY');
      expect(decision.potentialRisks.length).toBeGreaterThan(0);
    });
  });

  describe('3. Fabrication Protection on Unsupported Technologies', () => {
    const unsupportedTechJob: JobListing = {
      id: 'job-unsupported-tech',
      platform: 'Lever',
      company: 'CloudOps Inc',
      title: 'Full Stack Mobile Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://cloudops.io/jobs/dev',
      description: 'Full stack role requiring React, Docker, PostgreSQL, AWS, and Kubernetes.',
      requirements: ['React', 'Docker', 'PostgreSQL', 'AWS', 'Kubernetes'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    };

    it('should classify unsupported job requirements as missing and prevent fake candidate experience claims', () => {
      const verifiedSkills = contentFabricationAuditor.getCandidateVerifiedSkills(goldenMasterResume);
      const reqSkills = unsupportedTechJob.requirements || [];

      const candidateSkillSet = new Set(verifiedSkills.map((s) => s.toLowerCase()));
      const missingSkills = reqSkills.filter((s) => !candidateSkillSet.has(s.toLowerCase()));

      expect(missingSkills).toContain('React');
      expect(missingSkills).toContain('PostgreSQL');
      expect(missingSkills).toContain('Kubernetes');

      // Test auditor sanitization
      const mockCoverLetter = {
        id: 'cl_1',
        jobId: unsupportedTechJob.id,
        companyName: unsupportedTechJob.company,
        jobTitle: unsupportedTechJob.title,
        salutation: 'Dear Hiring Team,',
        contentParagraphs: [
          'I am a Senior Mobile Developer with 7 years of experience in React, Docker, and Kubernetes.',
          'I boosted throughput by 40% using automated data pipelines and led microservices optimizations.',
        ],
        closing: 'Sincerely, Kaushik',
        pdfStoragePath: '',
        generatedAt: new Date().toISOString(),
      };

      const audit = contentFabricationAuditor.auditAndSanitizeCoverLetter(mockCoverLetter, goldenMasterResume, unsupportedTechJob);
      const text = audit.sanitized.contentParagraphs.join(' ');

      expect(text).not.toContain('7 years');
      expect(text).toContain('3.8 years');
      expect(text).not.toContain('boosted throughput by 40%');
      expect(text).not.toContain('automated data pipelines');
    });
  });

  describe('4. Evidence-Based Visa Evaluation', () => {
    it('should return CONFIRMED_SPONSORSHIP when posting explicitly confirms visa support', () => {
      const confirmedJob: JobListing = {
        id: 'job-visa-1',
        platform: 'Greenhouse',
        company: 'Canva',
        title: 'Flutter Engineer',
        location: 'Sydney, AU',
        country: 'AU',
        url: '',
        visaSponsorship: true,
        isRemote: true,
        postedDate: 'Today',
        description: 'Visa sponsorship provided for international candidates relocate to Sydney.',
        requirements: ['Flutter'],
        createdAt: new Date().toISOString(),
      };

      const visaStatus = applicationDecisionEngine.evaluateVisaEvidence(confirmedJob);
      expect(visaStatus).toBe('CONFIRMED_SPONSORSHIP');
    });

    it('should return UNKNOWN when visa sponsorship is unmentioned (never fake Visa Sponsored)', () => {
      const unmentionedJob: JobListing = {
        id: 'job-visa-2',
        platform: 'Seek',
        company: 'TechCorp',
        title: 'Mobile Developer',
        location: 'Sydney, AU',
        country: 'AU',
        url: '',
        visaSponsorship: false,
        isRemote: false,
        postedDate: 'Today',
        description: 'Great role building mobile apps.',
        requirements: ['Flutter'],
        createdAt: new Date().toISOString(),
      };

      const visaStatus = applicationDecisionEngine.evaluateVisaEvidence(unmentionedJob);
      expect(visaStatus).toBe('UNKNOWN');
      expect(visaStatus).not.toBe('CONFIRMED_SPONSORSHIP');
    });
  });

  describe('5. Job Deduplication Across Sources', () => {
    it('should deduplicate same job across multiple sources and merge sourcePlatforms', () => {
      const jobFromSeek: JobListing = {
        id: 'job-seek-1',
        platform: 'Seek',
        company: 'Canva',
        title: 'Senior Flutter Developer',
        location: 'Sydney, AU',
        country: 'AU',
        visaSponsorship: true,
        isRemote: true,
        postedDate: 'Today',
        url: 'https://seek.com.au/job/12345',
        description: 'Flutter Developer needed.',
        createdAt: new Date().toISOString(),
      };

      const jobFromGreenhouse: JobListing = {
        id: 'job-gh-1',
        platform: 'Greenhouse',
        company: 'Canva',
        title: 'Senior Flutter Developer',
        location: 'Sydney, AU',
        country: 'AU',
        visaSponsorship: true,
        isRemote: true,
        postedDate: 'Today',
        url: 'https://boards.greenhouse.io/canva/jobs/12345',
        description: 'Senior Flutter Developer needed for core product.',
        createdAt: new Date().toISOString(),
      };

      const deduplicated = jobDeduplicationService.deduplicateJobs([jobFromSeek, jobFromGreenhouse]);

      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].sourcePlatforms).toContain('Seek');
      expect(deduplicated[0].sourcePlatforms).toContain('Greenhouse');
      expect(deduplicated[0].platform).toBe('Greenhouse'); // Higher priority ATS url preserved
    });
  });
});
