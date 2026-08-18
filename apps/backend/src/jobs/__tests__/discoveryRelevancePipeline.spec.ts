import { checkRoleRelevanceDetails, isRoleRelevant, deriveCandidateTargetProfile } from '../utils/resumeMatcher';
import { deriveSearchQueriesFromResume } from '../utils/queryGenerator';
import { MasterResume, JobListing } from '@sentinel/types';

describe('Discovery & Relevance Pipeline Unit Tests', () => {
  const mockFlutterResume: any = {
    fullName: 'Test Candidate',
    email: 'test@example.com',
    phone: '1234567890',
    location: 'Sydney, Australia',
    summary: 'Experienced Mobile Engineer with 4 years specializing in Flutter, Dart, Firebase, and iOS/Android app development.',
    explicitExperienceYears: 4,
    skills: {
      languages: ['Dart', 'Kotlin', 'Swift', 'JavaScript'],
      frameworks: ['Flutter', 'React Native', 'Android SDK', 'iOS SDK'],
      cloudAndDevOps: ['Firebase', 'GCP'],
      databases: ['PostgreSQL', 'SQLite'],
      tools: ['Git', 'VS Code', 'Xcode'],
    },
    experience: [
      {
        company: 'Mobile Solutions Inc',
        role: 'Senior Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '2022-01-01',
        endDate: 'Present',
        highlights: ['Developed cross-platform mobile apps using Flutter and Dart.'],
        technologiesUsed: ['Flutter', 'Dart', 'Firebase'],
      },
    ],
  };

  test('TASK 2: Relevant mobile titles pass role relevance check', () => {
    const titles = [
      'Flutter Developer',
      'Flutter Engineer',
      'Senior Flutter Developer',
      'Senior Flutter Engineer',
      'Mobile Developer',
      'Mobile Engineer',
      'Mobile Software Engineer',
      'Software Engineer - Mobile',
      'Software Engineer, Mobile',
      'Android Developer',
      'iOS Developer',
      'Cross-platform Mobile Developer',
    ];

    for (const title of titles) {
      const job: Partial<JobListing> = {
        id: `test-${title}`,
        title,
        company: 'Tech Corp',
        location: 'Sydney, Australia',
        platform: 'Ashby',
        description: 'Building mobile applications.',
        requirements: ['Flutter', 'Dart'],
      };

      const diag = checkRoleRelevanceDetails(job as JobListing, mockFlutterResume);
      expect(diag.isRelevant).toBe(true);
      expect(diag.reason).not.toContain('Excluded non-engineering');
    }
  });

  test('TASK 2: Non-engineering roles are cleanly rejected with diagnostic details', () => {
    const excludedTitles = [
      'Sales Engineer',
      'Account Executive',
      'Marketing Manager',
      'Recruiter',
      'Product Manager',
      'Revenue Operations Analyst',
    ];

    for (const title of excludedTitles) {
      const job: Partial<JobListing> = {
        id: `test-${title}`,
        title,
        company: 'Tech Corp',
        location: 'Sydney, Australia',
        platform: 'Greenhouse',
        description: 'Business and operational duties.',
      };

      const diag = checkRoleRelevanceDetails(job as JobListing, mockFlutterResume);
      expect(diag.isRelevant).toBe(false);
      expect(diag.reason).toContain('Excluded non-engineering role');
      expect(diag.matchedKeywords.length).toBeGreaterThan(0);
    }
  });

  test('TASK 4: Optional missing skills do not cause hard rejections for mobile engineering roles', () => {
    const jobRequiringExtraTools: Partial<JobListing> = {
      id: 'job-extra-tools',
      title: 'Senior Mobile Engineer',
      company: 'AppCo',
      location: 'Remote',
      platform: 'Lever',
      description: 'Role requires Flutter, Dart, Firebase. Nice to have: Go, GraphQL, C++.',
      requirements: ['Flutter', 'Dart', 'Go', 'GraphQL'],
    };

    const diag = checkRoleRelevanceDetails(jobRequiringExtraTools as JobListing, mockFlutterResume);
    expect(diag.isRelevant).toBe(true);
  });

  test('TASK 5: Multi-query generation includes targeted mobile queries', () => {
    const queries = deriveSearchQueriesFromResume(mockFlutterResume);
    expect(queries.keywords).toContain('Flutter Developer');
    expect(queries.keywords).toContain('Mobile Developer');
    expect(queries.keywords).toContain('Software Engineer - Mobile');
  });

  test('TASK 1 & 7: Role relevance diagnostics structure is valid', () => {
    const sampleJob: Partial<JobListing> = {
      id: 'sample-123',
      title: 'Sales Engineer',
      company: 'Sentry',
      location: 'San Francisco, CA',
      platform: 'Ashby',
      description: 'Technical sales role.',
    };

    const diag = checkRoleRelevanceDetails(sampleJob as JobListing, mockFlutterResume);
    expect(diag).toHaveProperty('isRelevant');
    expect(diag).toHaveProperty('matchedKeywords');
    expect(diag).toHaveProperty('missingKeywords');
    expect(diag).toHaveProperty('reason');
  });
});
