/**
 * @file src/services/__tests__/JobEvaluationService.spec.ts
 * @description Unit test suite validating 15 evaluation scenarios for JobEvaluationService.
 */

import { JobEvaluationService, DEFAULT_EVALUATION_WEIGHTS } from '../JobEvaluationService';
import { JobListing, MasterResume } from '@sentinel/types';

describe('JobEvaluationService Suite', () => {
  let service: JobEvaluationService;
  let mockResume: MasterResume;
  let mockJob: JobListing;

  beforeEach(() => {
    service = new JobEvaluationService();
    service.clearCache();

    mockResume = {
      fullName: 'Kaushik Khandala',
      email: 'kaushik@example.com',
      phone: '+61400000000',
      location: 'Sydney, Australia',
      linkedIn: '',
      github: '',
      portfolio: '',
      summary: 'Senior Flutter Developer with 6 years experience in Dart, Mobile, React Native, TypeScript, Node.js.',
      skills: {
        languages: ['Dart', 'TypeScript', 'JavaScript', 'Swift', 'Kotlin'],
        frameworks: ['Flutter', 'React Native', 'Node.js', 'React', 'GraphQL'],
        cloudAndDevOps: ['Docker', 'Firebase', 'AWS'],
        databases: ['PostgreSQL', 'SQLite'],
        tools: ['Git', 'Flutter DevTools', 'Xcode', 'Android Studio'],
      },
      experience: [
        {
          company: 'Apex Mobile',
          role: 'Senior Flutter Developer',
          location: 'Sydney',
          startDate: '2020-01',
          endDate: '2026-01',
          highlights: ['Built cross platform Flutter applications with BLoC and Firebase.'],
          technologiesUsed: ['Flutter', 'Dart', 'Firebase'],
        },
      ],
      education: [
        {
          institution: 'University of Sydney',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          graduationYear: '2019',
        },
      ],
      certifications: [],
      projects: [],
    };

    mockJob = {
      id: 'job-flutter-101',
      platform: 'Company Career Page',
      company: 'Canva',
      title: 'Senior Flutter Developer',
      location: 'Sydney, Australia',
      country: 'AU',
      visaSponsorship: true,
      isRemote: true,
      url: 'https://careers.canva.com/jobs/flutter-101',
      description: 'Canva is hiring a Senior Flutter Developer. 4+ years of Flutter and Dart experience required. Relocation and visa sponsorship available.',
      requirements: ['Flutter', 'Dart', 'Firebase', 'TypeScript'],
      postedDate: '2026-08-01',
      createdAt: '2026-08-01',
    };
  });

  // TEST 1: Perfect Skill Match
  it('TEST 1: should calculate high skill score for perfect skill match', () => {
    const evalResult = service.evaluateJob(mockJob, mockResume);
    expect(evalResult.skillMatch.score).toBeGreaterThanOrEqual(80);
    expect(evalResult.skillMatch.matched).toContain('Flutter');
    expect(evalResult.skillMatch.matched).toContain('Dart');
  });

  // TEST 2: Partial Skill Match
  it('TEST 2: should identify matched and missing skills in partial skill match', () => {
    const jobWithExtraTech = {
      ...mockJob,
      description: 'Requires Flutter, Dart, and Rust Assembly integration.',
      requirements: ['Flutter', 'Dart', 'Rust'],
    };
    const evalResult = service.evaluateJob(jobWithExtraTech, mockResume);
    expect(evalResult.skillMatch.matched).toContain('Flutter');
    expect(evalResult.skillMatch.missing).toContain('Rust');
  });

  // TEST 3: Missing Mandatory Requirement
  it('TEST 3: should capture missing mandatory clause and cap recommendation', () => {
    const mandatoryJob = {
      ...mockJob,
      description: 'Must have Australian Citizen clearance and NV1 security clearance.',
      requirements: ['Australian Citizen clearance'],
    };
    const evalResult = service.evaluateJob(mandatoryJob, mockResume);
    expect(evalResult.mandatoryRequirements.missing.length).toBeGreaterThan(0);
    expect(evalResult.recommendation).not.toBe('APPLY');
  });

  // TEST 4: Experience Below Requirement
  it('TEST 4: should lower experience score if candidate years are below job requirement', () => {
    const seniorRole = {
      ...mockJob,
      description: 'Requires 12+ years of Flutter engineering experience.',
    };
    const evalResult = service.evaluateJob(seniorRole, mockResume);
    expect(evalResult.experienceMatch.score).toBeLessThan(100);
    expect(evalResult.experienceMatch.requiredYears).toBe(12);
  });

  // TEST 5: Experience Meets Requirement
  it('TEST 5: should give 100% experience score when candidate meets requirement', () => {
    const evalResult = service.evaluateJob(mockJob, mockResume);
    expect(evalResult.experienceMatch.score).toBe(100);
    expect(evalResult.experienceMatch.candidateYears).toBeGreaterThanOrEqual(evalResult.experienceMatch.requiredYears);
  });

  // TEST 6: Seniority Mismatch
  it('TEST 6: should evaluate seniority alignment appropriately', () => {
    const juniorJob = {
      ...mockJob,
      title: 'Junior Intern Flutter Developer',
      description: 'Entry level junior intern Flutter position.',
    };
    const evalResult = service.evaluateJob(juniorJob, mockResume);
    expect(evalResult.seniorityMatch.score).toBeLessThan(100);
  });

  // TEST 7: Visa Confirmed
  it('TEST 7: should return CONFIRMED status when visa sponsorship is explicitly offered', () => {
    const evalResult = service.evaluateJob(mockJob, mockResume);
    expect(evalResult.visaCompatibility.status).toBe('CONFIRMED');
    expect(evalResult.visaCompatibility.score).toBe(100);
  });

  // TEST 8: Visa Unknown
  it('TEST 8: should return UNKNOWN status when visa sponsorship is unmentioned', () => {
    const unknownVisaJob = {
      ...mockJob,
      visaSponsorship: false,
      description: 'Standard software engineering position in Sydney.',
    };
    const evalResult = service.evaluateJob(unknownVisaJob, mockResume);
    expect(evalResult.visaCompatibility.status).toBe('UNKNOWN');
    expect(evalResult.visaCompatibility.score).toBe(50);
  });

  // TEST 9: Visa Unsupported
  it('TEST 9: should return NOT_SUPPORTED status when sponsorship is explicitly denied', () => {
    const unsupportedVisaJob = {
      ...mockJob,
      visaSponsorship: false,
      description: 'No visa sponsorship provided. Must have existing Australian work rights.',
    };
    const evalResult = service.evaluateJob(unsupportedVisaJob, mockResume);
    expect(evalResult.visaCompatibility.status).toBe('NOT_SUPPORTED');
    expect(evalResult.visaCompatibility.score).toBe(0);
  });

  // TEST 10: Remote Compatibility
  it('TEST 10: should score 100 for 100% remote job', () => {
    const evalResult = service.evaluateJob(mockJob, mockResume);
    expect(evalResult.locationCompatibility.status).toBe('COMPATIBLE');
  });

  // TEST 11: Location Mismatch
  it('TEST 11: should handle location mismatch for non-remote roles', () => {
    const onsiteJob: JobListing = {
      ...mockJob,
      isRemote: false,
      country: 'DE',
      location: 'Berlin, Germany',
      description: 'Onsite role in Berlin office only.',
    };
    const evalResult = service.evaluateJob(onsiteJob, mockResume);
    expect(evalResult.locationCompatibility.status).toBe('LOCATION_MISMATCH');
  });

  // TEST 12: Missing Job Description
  it('TEST 12: should gracefully evaluate job with missing description', () => {
    const emptyDescJob = {
      ...mockJob,
      description: '',
      requirements: [],
    };
    const evalResult = service.evaluateJob(emptyDescJob, mockResume);
    expect(evalResult.applicationPriority).toBeGreaterThan(0);
  });

  // TEST 13: Missing Requirements
  it('TEST 13: should handle job with undefined requirements array', () => {
    const noReqsJob = {
      ...mockJob,
      requirements: undefined,
    };
    const evalResult = service.evaluateJob(noReqsJob, mockResume);
    expect(evalResult.mandatoryRequirements.score).toBe(100);
  });

  // TEST 14: Empty Resume
  it('TEST 14: should handle evaluation against null resume gracefully', () => {
    const evalResult = service.evaluateJob(mockJob, null);
    expect(evalResult.applicationPriority).toBeGreaterThanOrEqual(0);
    expect(evalResult.qualificationLevel).toBe('DOES_NOT_QUALIFY');
  });

  // TEST 15: Duplicate Evaluation (Caching)
  it('TEST 15: should return cached result for duplicate evaluation requests', () => {
    const eval1 = service.evaluateJob(mockJob, mockResume);
    const eval2 = service.evaluateJob(mockJob, mockResume);
    expect(eval1).toBe(eval2);
  });
});
