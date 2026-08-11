/**
 * @file src/services/__tests__/StrictResumeUploadExtraction.spec.ts
 * @description Regression Test Suite validating Master Resume Upload & Evidence Integrity.
 */

import { candidateEvidenceExtractor } from '../CandidateEvidenceExtractor';
import { db } from '../../database';
import { MasterResume } from '@sentinel/types';

describe('StrictResumeUploadExtraction Regression Suite', () => {
  jest.setTimeout(30000);

  const verifiedUploadedResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushikkhandalakaushik234@gmail.com',
    phone: '+91 8849170743',
    location: 'Ahmedabad, India',
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
        location: 'Ahmedabad, India',
        startDate: '12/2023',
        endDate: 'Present',
        highlights: ['Built cross-platform Flutter applications using BLoC state management and Firebase.'],
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
    projects: [
      {
        title: 'Urmin Food and Tobacco distribution application',
        description: 'Order processing speed improved by 35%, real-time inventory tracking.',
        technologies: ['Flutter', 'Dart', 'BLoC', 'SQLite'],
        url: 'https://github.com/kaushikkhandala/urmin-food',
      },
      {
        title: 'Danatone ERP',
        description: 'Operational efficiency improved by 35%, 10+ core modules.',
        technologies: ['Flutter', 'Dart', 'Hive', 'REST APIs'],
        url: 'https://github.com/kaushikkhandala/danatone-erp',
      },
      {
        title: 'Tent Studio',
        description: 'User engagement improved by 30%, load times reduced by 40%.',
        technologies: ['Flutter', 'Dart', 'Firebase'],
        url: 'https://github.com/kaushikkhandala/tent-studio',
      },
    ],
  };

  beforeAll(async () => {
    await db.updateMasterResume(verifiedUploadedResume);
  });

  test('Uploaded master resume replaces stale profile data cleanly', async () => {
    const profile = await db.getMasterResume();
    expect(profile.email).toBe('kaushikkhandalakaushik234@gmail.com');
    expect(profile.phone).toBe('+91 8849170743');
    expect(profile.location).toBe('Ahmedabad, India');
  });

  test('Fake Sydney data cannot survive a new master resume upload', async () => {
    const profile = await db.getMasterResume();
    expect(profile.location).not.toContain('Sydney');
    expect(profile.phone).not.toContain('+61');
    expect(profile.email).not.toContain('example.com');
  });

  test('University of Sydney and Bachelor of Science do not appear', async () => {
    const profile = await db.getMasterResume();
    expect(profile.education[0].institution).toBe('Sal Engineering & Technical Institute');
    expect(profile.education[0].degree).toBe('B.E');
    expect(profile.education[0].fieldOfStudy).toBe('Information Technology');
  });

  test('Fake certifications are empty', async () => {
    const profile = await db.getMasterResume();
    expect(profile.certifications.length).toBe(0);
  });

  test('Unverified skills (TypeScript, JS, Kotlin, Swift, SQL, Node, Express, Docker, Postgres, Redis) are not present', async () => {
    const profile = await db.getMasterResume();
    const allSkills = [
      ...profile.skills.languages,
      ...profile.skills.frameworks,
      ...profile.skills.cloudAndDevOps,
      ...profile.skills.databases,
      ...profile.skills.tools,
    ];

    const forbidden = ['TypeScript', 'JavaScript', 'Kotlin', 'Swift', 'SQL', 'Node.js', 'Express', 'Docker', 'PostgreSQL', 'Redis'];
    forbidden.forEach((tech) => {
      expect(allSkills).not.toContain(tech);
    });
  });

  test('Verified skills (Flutter, Dart, SQLite, Hive) are present', async () => {
    const evidence = candidateEvidenceExtractor.extractCandidateEvidence(verifiedUploadedResume);
    expect(evidence.skills).toContain('Flutter');
    expect(evidence.skills).toContain('Dart');
    expect(evidence.skills).toContain('SQLite');
    expect(evidence.skills).toContain('Hive');
  });

  test('Exact job titles are preserved without inferring Seniority', async () => {
    const profile = await db.getMasterResume();
    expect(profile.experience[0].role).toBe('Flutter Developer');
    expect(profile.experience[1].role).toBe('Flutter Developer');
    expect(profile.experience[2].role).toBe('Operations Manager');
  });

  test('Explicit experience years remains 3.8 years', async () => {
    const profile = await db.getMasterResume();
    expect(profile.explicitExperienceYears).toBe(3.8);
  });
});
