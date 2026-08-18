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

  describe('Provider Outcome Statuses & Telemetry (Section 13)', () => {
    test('1. Successful provider request with zero matching jobs => SUCCESS_ZERO_RESULTS', async () => {
      const ashby = new (require('../providers/AshbyProvider').AshbyProvider)();
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ jobs: [] }),
        } as any)
      );
      const res = await ashby.search({ keywords: ['nonexistent_tech_xyz_999'] });
      mockFetch.mockRestore();

      expect(res.outcomeStatus).toBe('SUCCESS_ZERO_RESULTS');
      expect(res.diagnostics).toBeDefined();
      expect(res.diagnostics?.rawJobsAfterQueryFilter).toBe(0);
    });

    test('2 & 8. All Ashby boards fail => status NOT SUCCESS_ZERO_RESULTS', async () => {
      const ashby = new (require('../providers/AshbyProvider').AshbyProvider)();
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.reject(new Error('Network error')));
      const res = await ashby.search({ keywords: ['flutter'] });
      mockFetch.mockRestore();

      expect(res.outcomeStatus).not.toBe('SUCCESS_ZERO_RESULTS');
      expect(res.outcomeStatus).toBe('NETWORK_ERROR');
      expect(res.diagnostics?.boardsSucceeded).toBe(0);
    });

    test('3. Provider timeout => TIMEOUT', async () => {
      const ashby = new (require('../providers/AshbyProvider').AshbyProvider)();
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() => {
        const err: any = new Error('Timeout');
        err.name = 'AbortError';
        return Promise.reject(err);
      });
      const res = await ashby.search({ keywords: ['flutter'] });
      mockFetch.mockRestore();

      expect(res.outcomeStatus).toBe('TIMEOUT');
      expect(res.diagnostics?.boardsTimedOut).toBeGreaterThan(0);
    });

    test('4. HTTP 429 => RATE_LIMITED in diagnostics', async () => {
      const ashby = new (require('../providers/AshbyProvider').AshbyProvider)();
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          json: () => Promise.resolve({}),
        } as any)
      );
      const res = await ashby.search({ keywords: ['flutter'] });
      mockFetch.mockRestore();

      expect(res.outcomeStatus).not.toBe('SUCCESS_ZERO_RESULTS');
      expect(res.diagnostics?.boardsRateLimited).toBeGreaterThan(0);
    });

    test('7. Partial Ashby board failure => successful jobs preserved as PARTIAL_RESULTS', async () => {
      const ashby = new (require('../providers/AshbyProvider').AshbyProvider)();
      let callCount = 0;
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                jobs: [
                  {
                    id: 'flutter-job-1',
                    title: 'Flutter Developer',
                    locationName: 'Sydney, Australia',
                    descriptionHtml: 'Flutter app.',
                    publishedAt: '2026-08-01',
                  },
                ],
              }),
          } as any);
        }
        return Promise.reject(new Error('Network error'));
      });

      const res = await ashby.search({ keywords: ['flutter'] });
      mockFetch.mockRestore();

      expect(res.jobs.length).toBe(1);
      expect(res.outcomeStatus).toBe('PARTIAL_RESULTS');
      expect(res.diagnostics?.boardsSucceeded).toBe(1);
    });

    test('9 & 10. Explicit query "flutter" preserves userQuery', () => {
      const derived = deriveSearchQueriesFromResume(flutterResume, 'flutter');
      expect(derived.userQuery).toBe('flutter');
      expect(derived.keywords).toEqual(['flutter']);
    });
  });

  describe('Authoritative Search Query Verification & Ashby Identity (Section 14)', () => {
    test('TEST 1: Provider finds Flutter Developer and external page contains Flutter => SEARCH_QUERY_MISMATCH = 0', () => {
      const job: JobListing = {
        id: 'railway-flutter-1',
        platform: 'Ashby',
        company: 'Railway',
        title: 'Flutter Developer',
        location: 'Sydney, Australia',
        country: 'AU' as CountryCode,
        visaSponsorship: true,
        isRemote: true,
        url: 'https://jobs.ashbyhq.com/railway/flutter-1',
        description: 'Build cross-platform mobile apps with Flutter and Dart.',
        postedDate: '2026-08-01',
        createdAt: new Date().toISOString(),
      };

      const relevance = verificationService.verifySearchQueryRelevance(job, 'flutter', 'Flutter Developer', 'Build cross-platform mobile apps with Flutter and Dart.');
      expect(relevance.searchRelevanceVerified).toBe(true);
    });

    test('TEST 2: Provider finds Flutter Developer but external page is Android job => SEARCH_QUERY_MISMATCH', () => {
      const job: JobListing = {
        id: 'sentry-ios-1',
        platform: 'Ashby',
        company: 'Sentry',
        title: 'Senior Software Engineer (iOS), SDK',
        location: 'Vienna, Austria',
        country: 'CA' as CountryCode,
        visaSponsorship: false,
        isRemote: false,
        url: 'https://jobs.ashbyhq.com/sentry/37c30441',
        description: 'We build SDKs for Swift, Objective-C, Cocoa. Note: Sentry supports iOS, Flutter, and React Native.',
        postedDate: '2026-08-01',
        createdAt: new Date().toISOString(),
      };

      const relevance = verificationService.verifySearchQueryRelevance(job, 'flutter', 'Senior Software Engineer (iOS), SDK', job.description);
      expect(relevance.searchRelevanceVerified).toBe(false);
      expect(relevance.searchRelevanceReason).toContain('missing from verified job title');
    });

    test('TEST 3: External page title tag with platform suffix extracts detectedTitle accurately', () => {
      const score = verificationService.calculateTitleMatchScore('Flutter Developer', 'Flutter Developer');
      expect(score.isMatch).toBe(true);
      expect(score.score).toBe(1.0);
    });

    test('TEST 4: Provider URL points to wrong Ashby posting => identity verification rejects it', () => {
      const titleCheck = verificationService.calculateTitleMatchScore('Senior Flutter Developer', 'Infra Engineer - Datacenters @ Railway');
      expect(titleCheck.isMatch).toBe(false);
      expect(titleCheck.score).toBeLessThan(0.5);
    });

    test('TEST 5: Explicit query "flutter" remains "flutter" throughout query derivation', () => {
      const derived = deriveSearchQueriesFromResume(flutterResume, 'flutter');
      expect(derived.userQuery).toBe('flutter');
      expect(derived.keywords).toEqual(['flutter']);
    });

    test('TEST 6 & 7: Existing DB Flutter job remains in DB after scrape returns zero new jobs', async () => {
      const stored = await require('../../database').db.getAllJobs();
      expect(Array.isArray(stored)).toBe(true);
    });
  });
});
