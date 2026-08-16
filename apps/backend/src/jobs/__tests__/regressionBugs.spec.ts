/**
 * @file src/jobs/__tests__/regressionBugs.spec.ts
 * @description Comprehensive Regression Suite testing Bugs 1-16 (Pipeline & Candidate Target Profile Relevance).
 */

import { JobVerificationService } from '../../services/JobVerificationService';
import { JobLifecycleStatus, JobListing, CountryCode, MasterResume } from '@sentinel/types';
import { deriveSearchQueriesFromResume } from '../utils/queryGenerator';
import { isRoleRelevant, deriveCandidateTargetProfile } from '../utils/resumeMatcher';
import { jobRankingService } from '../../services/JobRankingService';
import { companyClassificationService } from '../../services/CompanyClassificationService';

describe('Regression Suite for Job Discovery & Candidate Relevance Bugs (Bugs 1-16)', () => {
  let verificationService: JobVerificationService;

  const flutterResume: MasterResume = {
    fullName: 'Kaushik Khandala',
    email: 'kaushik@example.com',
    phone: '+61 400 000 000',
    location: 'Sydney, Australia',
    linkedIn: 'https://linkedin.com/in/kaushik',
    github: 'https://github.com/kaushik',
    portfolio: 'https://kaushik.dev',
    summary: 'Senior Flutter Developer specializing in cross-platform mobile development.',
    skills: {
      languages: ['Dart', 'JavaScript', 'TypeScript', 'HTML/CSS'],
      frameworks: ['Flutter', 'React', 'BLoC', 'Provider'],
      cloudAndDevOps: ['Firebase', 'GCP'],
      databases: ['PostgreSQL', 'SQLite'],
      tools: ['Git', 'VS Code', 'Xcode', 'Android Studio'],
    },
    experience: [
      {
        company: 'Tech Corp',
        role: 'Senior Flutter Developer',
        location: 'Sydney, Australia',
        startDate: '2022-01',
        endDate: 'Present',
        highlights: ['Built cross-platform mobile apps using Flutter and Dart.'],
        technologiesUsed: ['Flutter', 'Dart'],
      },
    ],
    education: [],
    certifications: [],
    projects: [],
  };

  beforeEach(() => {
    verificationService = new JobVerificationService();
  });

  describe('Bug 1 & 12: Discovery Query is NOT User Intent', () => {
    test('TEST 12: Worldwide discovery query="Mobile Engineer" does NOT set userQuery as "Mobile Engineer"', () => {
      const derived = deriveSearchQueriesFromResume(flutterResume, '');
      expect(derived.userQuery).toBeUndefined();
      expect(derived.primaryQueries).toContain('Flutter Developer');
    });
  });

  describe('Bug 2, 3, 5, 7, 8: Candidate Target Profile & Strict Role Gates', () => {
    test('TEST 1: WORLDWIDE mode - Flutter profile vs Android Systems Engineer (OpenAI) => ROLE_NOT_RELEVANT', () => {
      const androidSystemsJob: JobListing = {
        id: 'openai-android-sys-1',
        platform: 'Ashby',
        company: 'OpenAI',
        title: 'Android Systems Engineer, Consumer Devices',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/openai/sys-1',
        description: 'Build low level AOSP framework services, C++, Kotlin, Java, HAL, IPC.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const relevant = isRoleRelevant(androidSystemsJob, flutterResume, undefined);
      expect(relevant).toBe(false);
    });

    test('TEST 2: WORLDWIDE mode - Mobile Engineer with Flutter requirement => ACCEPTED', () => {
      const flutterMobileJob: JobListing = {
        id: 'job-mobile-flutter-1',
        platform: 'Ashby',
        company: 'Railway',
        title: 'Mobile Engineer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/railway/mob-1',
        description: 'Build beautiful mobile user interfaces using Flutter, Dart, BLoC state management.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const relevant = isRoleRelevant(flutterMobileJob, flutterResume, undefined);
      expect(relevant).toBe(true);
    });

    test('TEST 3: CUSTOM mode - query="flutter" + Flutter Developer => ACCEPTED', () => {
      const flutterJob: JobListing = {
        id: 'job-flutter-1',
        platform: 'Ashby',
        company: 'Canva',
        title: 'Senior Flutter Developer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/canva/flut-1',
        description: 'Build Flutter mobile components.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const relevant = isRoleRelevant(flutterJob, flutterResume, 'flutter');
      expect(relevant).toBe(true);
    });

    test('TEST 4: CUSTOM mode - query="flutter" vs Android Engineer => SEARCH_QUERY_MISMATCH', async () => {
      const androidJob: JobListing = {
        id: 'job-android-1',
        platform: 'Ashby',
        company: 'Uber',
        title: 'Android Engineer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/uber/and-1',
        description: 'Build native Android apps with Kotlin, Jetpack Compose.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const verified = await verificationService.verifyJobListing(androidJob, 'flutter');
      expect(verified.verificationStatus).toBe(JobLifecycleStatus.SEARCH_QUERY_MISMATCH);
    });

    test('TEST 5: CUSTOM mode - query="android" vs Android Engineer => ACCEPTED via Custom Intent Override', () => {
      const androidJob: JobListing = {
        id: 'job-android-2',
        platform: 'Ashby',
        company: 'Uber',
        title: 'Android Engineer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/uber/and-2',
        description: 'Build native Android apps with Kotlin, Jetpack Compose.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const relevant = isRoleRelevant(androidJob, flutterResume, 'android');
      expect(relevant).toBe(true);
    });

    test('TEST 6: WORLDWIDE mode - Mobile Engineer with Flutter/Dart => ACCEPTED', () => {
      const mobileJob: JobListing = {
        id: 'job-mobile-2',
        platform: 'Ashby',
        company: 'Atlassian',
        title: 'Mobile Engineer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/atlassian/mob-2',
        description: 'Build mobile client features in Flutter and Dart.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const relevant = isRoleRelevant(mobileJob, flutterResume, undefined);
      expect(relevant).toBe(true);
    });

    test('TEST 7: WORLDWIDE mode - Senior iOS Engineer (Swift/UIKit) => ROLE_NOT_RELEVANT', () => {
      const iosJob: JobListing = {
        id: 'job-ios-1',
        platform: 'Ashby',
        company: 'Apple',
        title: 'Senior iOS Engineer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/apple/ios-1',
        description: 'Develop iOS applications using Swift, Xcode, UIKit.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const relevant = isRoleRelevant(iosJob, flutterResume, undefined);
      expect(relevant).toBe(false);
    });

    test('TEST 8: WORLDWIDE mode - Backend Engineer (Go/Kubernetes) => ROLE_NOT_RELEVANT', () => {
      const backendJob: JobListing = {
        id: 'job-backend-1',
        platform: 'Ashby',
        company: 'Stripe',
        title: 'Backend Engineer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/stripe/back-1',
        description: 'Build distributed microservices with Go, Docker, Kubernetes, PostgreSQL.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const relevant = isRoleRelevant(backendJob, flutterResume, undefined);
      expect(relevant).toBe(false);
    });
  });

  describe('Bug 9, 10, 11: Ranking Semantics & Skill Match Disqualifiers', () => {
    test('TEST 9: Flutter candidate vs Android Systems Engineer => Low roleMatch & SKIP recommendation', () => {
      const androidSystemsJob: JobListing = {
        id: 'openai-android-sys-2',
        platform: 'Ashby',
        company: 'OpenAI',
        title: 'Android Systems Engineer, Consumer Devices',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: true,
        isRemote: true,
        url: 'https://jobs.ashbyhq.com/openai/sys-2',
        description: 'Build low level AOSP framework services, C++, Kotlin, Java, HAL, IPC.',
        requirements: ['Kotlin', 'Java', 'AOSP', 'C++'],
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const ranking = jobRankingService.rankJob(androidSystemsJob, flutterResume);

      expect(ranking.roleMatch).toBeLessThanOrEqual(20);
      expect(ranking.recommendation === 'SKIP' || (ranking.recommendation as any) === 'DO_NOT_APPLY').toBe(true);
      expect(ranking.matchScore).toBeLessThanOrEqual(40);
      expect(ranking.strengths.some((s) => s.includes('match target role'))).toBe(false);
    });
  });

  describe('Bug 15: Company Type Classification', () => {
    test('TEST 11: OpenAI job description without medical/health facts => CompanyType = Unknown', () => {
      const openAiJob: JobListing = {
        id: 'openai-job-1',
        platform: 'Ashby',
        company: 'OpenAI',
        title: 'Android Systems Engineer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/openai/1',
        description: 'We build artificial intelligence models and take care of employee growth.',
        postedDate: '2026-08-15',
        createdAt: new Date().toISOString(),
      };

      const type = companyClassificationService.classifyCompanyType(openAiJob);
      expect(type).toBe('Unknown');
    });
  });
});
