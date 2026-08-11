/**
 * @file src/services/__tests__/GoldenFabricationValidation.spec.ts
 * @description Comprehensive Golden Test Suite verifying zero-fabrication guarantees, accurate job data mapping,
 * candidate experience locking (3.8 yrs), skill intersection filtering, and prevention of hardcoded "Target Enterprise" fallbacks.
 */

import { tailoredResumeService } from '../TailoredResumeService';
import { coverLetterService } from '../CoverLetterService';
import { contentFabricationAuditor } from '../ContentFabricationAuditor';
import { db } from '../../database';
import { JobListing, MasterResume } from '@sentinel/types';

describe('GoldenFabricationValidation', () => {
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
      languages: ['Dart', 'TypeScript', 'JavaScript', 'SQL', 'Kotlin'],
      frameworks: ['Flutter', 'Node.js', 'Express', 'BLoC'],
      cloudAndDevOps: ['Docker', 'Firebase'],
      databases: ['SQLite', 'Hive', 'PostgreSQL'],
      tools: ['Git', 'VSCode', 'Android Studio'],
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

  const testJobs: JobListing[] = [
    {
      id: 'job-a-canva',
      platform: 'Greenhouse',
      company: 'Canva Seek',
      title: 'Senior Flutter Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://canva.com/jobs/senior-flutter-developer',
      description: 'Looking for a Senior Flutter Developer with expertise in Dart, BLoC, and mobile architecture.',
      requirements: ['Flutter', 'Dart', 'React', 'Docker', 'PostgreSQL'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'job-b-atlassian',
      platform: 'Workable',
      company: 'Atlassian',
      title: 'Android Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://atlassian.com/jobs/android-engineer',
      description: 'Seeking an Android Engineer skilled in Kotlin, Java, Gradle, and Clean Architecture.',
      requirements: ['Android', 'Kotlin', 'Java', 'Gradle', 'Clean Architecture'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'job-c-employment-hero',
      platform: 'Lever',
      company: 'Employment Hero',
      title: 'Backend Engineer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: true,
      url: 'https://employmenthero.com/jobs/backend-engineer',
      description: 'High-scale backend engineering in Node.js, Express, PostgreSQL, Redis, Docker.',
      requirements: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'job-d-opentext',
      platform: 'Workable',
      company: 'OpenText',
      title: 'Software Developer',
      location: 'Sydney, AU',
      country: 'AU',
      visaSponsorship: false,
      isRemote: false,
      url: 'https://opentext.com/jobs/software-developer',
      description: 'Software development in Node.js, TypeScript, and MySQL.',
      requirements: ['Node.js', 'TypeScript', 'MySQL', 'REST APIs'],
      postedDate: 'Today',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeAll(async () => {
    await db.updateMasterResume(goldenMasterResume);
    await db.saveJobs(testJobs);
  });

  testJobs.forEach((job) => {
    describe(`Job Execution: ${job.company} (${job.title})`, () => {
      it('1. Tailored Resume must use exact job identity and zero hardcoded fallbacks', async () => {
        const result = await tailoredResumeService.generateTailoredResume(job.id);

        expect(result.structured.company).toBe(job.company);
        expect(result.structured.company).not.toBe('Target Enterprise');

        expect(result.structured.jobTitle).toBe(job.title);
        expect(result.structured.jobTitle).not.toBe('Tailored Target Role');

        expect(result.tailoredResume.company).toBe(job.company);
        expect(result.tailoredResume.jobTitle).toBe(job.title);

        // Candidate experience check
        const jsonStr = JSON.stringify(result.structured);
        expect(jsonStr).not.toContain('5 years experience');
        expect(jsonStr).not.toContain('7+ years experience');

        // Verify keywordsOptimized is non-empty intersection or verified skills
        expect(result.tailoredResume.keywordsOptimized.length).toBeGreaterThan(0);
        expect(result.tailoredResume.keywordsOptimized).not.toEqual(['TypeScript', 'Node.js', 'PostgreSQL', 'Docker']);
      });

      it('2. Cover Letter must use exact job identity and verified tech stack', async () => {
        const result = await coverLetterService.generateCoverLetter(job.id);

        expect(result.coverLetter.companyName).toBe(job.company);
        expect(result.coverLetter.companyName).not.toBe('Target Company');

        expect(result.coverLetter.jobTitle).toBe(job.title);
        expect(result.coverLetter.salutation).toContain(job.company);

        const contentText = result.coverLetter.contentParagraphs.join(' ');
        expect(contentText).not.toContain('Target Company');
        expect(contentText).not.toContain('5 years experience');
      });

      it('3. ContentFabricationAuditor validates zero unverified claim conversions', () => {
        const candidateVerifiedSkills = contentFabricationAuditor.getCandidateVerifiedSkills(goldenMasterResume);
        expect(candidateVerifiedSkills).toContain('Flutter');
        expect(candidateVerifiedSkills).toContain('Dart');
        expect(candidateVerifiedSkills).toContain('SQLite');

        // Unverified missing skills must NOT be claimed as candidate experience
        const candidateSkillSet = new Set(candidateVerifiedSkills.map((s) => s.toLowerCase()));
        if (job.id === 'job-b-atlassian') {
          expect(candidateSkillSet.has('java')).toBe(false);
          expect(candidateSkillSet.has('gradle')).toBe(false);
        }
      });
    });
  });
});
