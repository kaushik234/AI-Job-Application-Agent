/**
 * @file src/services/__tests__/AIMatchDataIntegrity.spec.ts
 * @description Test suite validating AI Job Match data integrity and strict Candidate vs Job context isolation.
 */

import { aiService } from '../AIService';
import { isValidResumeText } from '../GeminiAIService';
import { MasterResume, JobListing } from '@sentinel/types';

describe('AI Match Data Integrity & Context Isolation Suite', () => {
  let candidate35Years: MasterResume;

  beforeEach(() => {
    candidate35Years = {
      fullName: 'Kaushik Khandala',
      email: 'kaushik@example.com',
      phone: '+61400000000',
      location: 'Sydney, Australia',
      linkedIn: '',
      github: '',
      portfolio: '',
      summary: 'Mobile Engineer with 3.5 years of Flutter & Dart experience.',
      skills: {
        languages: ['Dart', 'TypeScript', 'Swift', 'Kotlin'],
        frameworks: ['Flutter', 'React Native', 'Node.js'],
        cloudAndDevOps: ['Docker', 'Firebase'],
        databases: ['PostgreSQL', 'SQLite'],
        tools: ['Git', 'Flutter DevTools'],
      },
      experience: [
        {
          company: 'Mobile Tech',
          role: 'Flutter Developer',
          location: 'Sydney',
          startDate: '2022-07',
          endDate: '2026-01', // 3.5 years
          highlights: ['Developed Flutter mobile apps using BLoC and Firebase.'],
          technologiesUsed: ['Flutter', 'Dart', 'Firebase'],
        },
      ],
      education: [],
      certifications: [],
      projects: [],
    };
  });

  // TEST 1: Candidate 3.5 yrs vs Job 7+ yrs
  it('TEST 1: candidate 3.5 years vs job 7+ years requirement -> status BELOW_REQUIREMENT and no 7+ years claim', async () => {
    const job7Years: JobListing = {
      id: 'job-ramp-701',
      platform: 'Greenhouse',
      company: 'Ramp',
      title: 'Senior Software Engineer - Infrastructure',
      location: 'Sydney, Australia',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://ramp.com/careers/701',
      description: 'Ramp is hiring a Senior Infrastructure Engineer. Requires 7+ years experience in software engineering and cloud infrastructure.',
      requirements: ['Software Engineering', '7+ years experience', 'Cloud Infrastructure'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };

    const result = await aiService.evaluateResumeMatching(candidate35Years, job7Years);

    expect(result.experienceAnalysis.candidateYears).toBeCloseTo(3.5, 1);
    expect(result.experienceAnalysis.requiredYears).toBe(7);
    expect(result.experienceAnalysis.status).toBe('BELOW_REQUIREMENT');
    expect(result.experienceAnalysis.gapYears).toBeCloseTo(-3.5, 1);

    // Verify AI never claimed "7+ years" for candidate strengths
    const claimed7Years = result.strengths.some((s) => s.includes('7+ years'));
    expect(claimed7Years).toBe(false);
  });

  // TEST 2: Candidate 3.5 yrs vs Job 3+ yrs
  it('TEST 2: candidate 3.5 years vs job 3+ years requirement -> status MEETS_REQUIREMENT', async () => {
    const job3Years: JobListing = {
      id: 'job-flutter-301',
      platform: 'Lever',
      company: 'Canva',
      title: 'Flutter Engineer',
      location: 'Sydney, Australia',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://canva.com/careers/301',
      description: 'Requires 3+ years of Flutter engineering experience.',
      requirements: ['Flutter', 'Dart', '3+ years experience'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };

    const result = await aiService.evaluateResumeMatching(candidate35Years, job3Years);

    expect(result.experienceAnalysis.candidateYears).toBeCloseTo(3.5, 1);
    expect(result.experienceAnalysis.requiredYears).toBe(3);
    expect(result.experienceAnalysis.status).toBe('MEETS_REQUIREMENT');
    expect(result.experienceAnalysis.gapYears).toBeGreaterThanOrEqual(0);
  });

  // TEST 3: Candidate 3.5 yrs vs Job 10+ yrs
  it('TEST 3: candidate 3.5 years vs job 10+ years requirement -> status BELOW_REQUIREMENT', async () => {
    const job10Years: JobListing = {
      id: 'job-principal-1001',
      platform: 'Ashby',
      company: 'Shopify',
      title: 'Principal Architect',
      location: 'Ottawa, Canada',
      country: 'CA',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://shopify.com/careers/1001',
      description: 'Requires 10+ years of distributed systems experience.',
      requirements: ['10+ years experience'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };

    const result = await aiService.evaluateResumeMatching(candidate35Years, job10Years);

    expect(result.experienceAnalysis.candidateYears).toBeCloseTo(3.5, 1);
    expect(result.experienceAnalysis.requiredYears).toBe(10);
    expect(result.experienceAnalysis.status).toBe('BELOW_REQUIREMENT');
    expect(result.experienceAnalysis.gapYears).toBeCloseTo(-6.5, 1);
  });

  // TEST 4: Job contains 7+ years, candidate remains 3.5
  it('TEST 4: job description contains "7+ years", candidate experience remains 3.5', async () => {
    const job7: JobListing = {
      id: 'job-test-7',
      platform: 'Workable',
      company: 'Acme',
      title: 'Lead Engineer',
      location: 'Berlin, Germany',
      country: 'DE',
      visaSponsorship: false,
      isRemote: true,
      url: 'https://acme.com/7',
      description: 'We are seeking a Lead Engineer with 7+ years experience.',
      requirements: ['7+ years experience'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };

    const result = await aiService.evaluateResumeMatching(candidate35Years, job7);

    expect(result.candidate.experienceYears).toBeCloseTo(3.5, 1);
    expect(result.experienceAnalysis.candidateYears).toBeCloseTo(3.5, 1);
  });

  // TEST 5: Job mentions Python, candidate resume lacks Python -> Python MUST NOT appear in candidate skills
  it('TEST 5: job mentions Python but candidate lacks Python -> Python MUST NOT appear in candidate skills', async () => {
    const pythonJob: JobListing = {
      id: 'job-python-501',
      platform: 'LinkedIn',
      company: 'AI Solutions',
      title: 'Python Backend Engineer',
      location: 'Sydney, Australia',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://linkedin.com/jobs/501',
      description: 'Backend Developer proficient in Python, Django, and Fast API.',
      requirements: ['Python', 'Django', 'Fast API'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };

    const result = await aiService.evaluateResumeMatching(candidate35Years, pythonJob);

    expect(result.candidate.relevantSkills).not.toContain('Python');
    expect(result.candidate.relevantSkills).not.toContain('Django');
    expect(result.skillsAnalysis.missing).toContain('Python');
  });

  // TEST 6: Candidate skills [Flutter, Dart, Android], Job requires [Flutter, Dart, Python] -> Matched: [Flutter, Dart], Missing: [Python]
  it('TEST 6: correctly separates matched skills [Flutter, Dart] from missing skills [Python]', async () => {
    const candidateSkills: MasterResume = {
      ...candidate35Years,
      skills: {
        languages: ['Dart'],
        frameworks: ['Flutter'],
        cloudAndDevOps: [],
        databases: [],
        tools: ['Android Studio'],
      },
    };

    const jobReqs: JobListing = {
      id: 'job-mixed-601',
      platform: 'Company Career Page',
      company: 'Mobile Corp',
      title: 'Flutter & Python Developer',
      location: 'Sydney, Australia',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://mobilecorp.com/jobs/601',
      description: 'Position requires Flutter, Dart, and Python backend microservices.',
      requirements: ['Flutter', 'Dart', 'Python'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };

    const result = await aiService.evaluateResumeMatching(candidateSkills, jobReqs);

    expect(result.skillsAnalysis.matched).toContain('Flutter');
    expect(result.skillsAnalysis.matched).toContain('Dart');
    expect(result.skillsAnalysis.missing).toContain('Python');
    expect(result.candidate.relevantSkills).not.toContain('Python');
  });

  // TEST 7: isValidResumeText validation function
  it('TEST 7: isValidResumeText rejects garbage/PDF headers and accepts real resume text', () => {
    expect(isValidResumeText('%PDF-1.3 \x00\x01 binary garbage pdf text stream content here')).toBe(false);
    expect(isValidResumeText('test')).toBe(false);
    expect(isValidResumeText('    ')).toBe(false);
    expect(
      isValidResumeText(
        'Kaushik Khandala Flutter Developer Safal Infosoft Potenz Technology 3.8 YEARS experience with Flutter and Dart SQLite Hive'
      )
    ).toBe(true);
  });

  // TEST 8: Candidate 3.8 years explicit experience vs Job 6+ years
  it('TEST 8: candidate 3.8 years explicit experience vs job 6+ years -> candidateYears = 3.8, requiredYears = 6, status BELOW_REQUIREMENT', async () => {
    const candidate38: MasterResume = {
      ...candidate35Years,
      summary: 'FLUTTER DEVELOPER (3.8 YEARS)',
      explicitExperienceYears: 3.8,
      experienceSource: 'RESUME_EXPLICIT',
    };

    const job6Years: JobListing = {
      id: 'job-6yr-801',
      platform: 'Greenhouse',
      company: 'Canva',
      title: 'Senior Mobile Engineer',
      location: 'Sydney, Australia',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://canva.com/801',
      description: 'Requires 6+ years of verified software engineering experience.',
      requirements: ['6+ years experience', 'Flutter'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };

    const result = await aiService.evaluateResumeMatching(candidate38, job6Years);

    expect(result.candidate.experienceYears).toBe(3.8);
    expect(result.experienceAnalysis.candidateYears).toBe(3.8);
    expect(result.experienceAnalysis.requiredYears).toBe(6);
    expect(result.experienceAnalysis.status).toBe('BELOW_REQUIREMENT');
    expect(result.experienceAnalysis.gapYears).toBe(-2.2);

    const claimed6Years = result.strengths.some((s) => s.includes('6 years') || s.includes('6+ years'));
    expect(claimed6Years).toBe(false);
  });
});
