/**
 * @file src/services/__tests__/queryRelevanceAndCountryVerification.spec.ts
 * @description Test suite for Search Query Relevance, Country Normalization, and Applyability Evidence (Phases 8, 9, 10).
 */

import { JobVerificationService } from '../JobVerificationService';
import { JobLifecycleStatus, JobListing } from '@sentinel/types';

describe('Search Query Relevance, Country Normalization & Applyability Suite', () => {
  let verifier: JobVerificationService;

  beforeEach(() => {
    verifier = new JobVerificationService();
  });

  const sampleJob: JobListing = {
    id: 'job-900',
    platform: 'Ashby',
    company: 'Sentry',
    title: 'Senior Software Engineer (iOS), SDK',
    location: 'Vienna, Austria',
    country: 'CA',
    visaSponsorship: false,
    isRemote: false,
    url: 'https://jobs.ashbyhq.com/sentry/ee90f315-6ff3-4e63-a11d-1dcfa2a863b4',
    postedDate: '2026-08-15',
    createdAt: new Date().toISOString(),
  };

  describe('Phase 8: Search Query Relevance Gate', () => {
    test('1. query="flutter", title="Flutter Developer" => ACCEPT', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Flutter Developer', 'Build cross platform apps');
      expect(res.searchRelevanceVerified).toBe(true);
      expect(res.searchRelevanceScore).toBe(1.0);
    });

    test('2. query="flutter", title="Senior Flutter Engineer" => ACCEPT', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Senior Flutter Engineer', 'Build mobile apps');
      expect(res.searchRelevanceVerified).toBe(true);
      expect(res.searchRelevanceScore).toBe(1.0);
    });

    test('3. query="flutter", title="Mobile Engineer", description mentions Flutter => ACCEPT', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Mobile Engineer', 'Build apps using Flutter and Dart');
      expect(res.searchRelevanceVerified).toBe(true);
      expect(res.searchRelevanceScore).toBe(0.85);
    });

    test('4. query="flutter", title="Cross Platform Engineer", description mentions Flutter => ACCEPT', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Cross Platform Engineer', 'Requires Flutter experience');
      expect(res.searchRelevanceVerified).toBe(true);
    });

    test('5. query="flutter", title="Senior Software Engineer (iOS), SDK", description only Swift/iOS => REJECT SEARCH_QUERY_MISMATCH', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Senior Software Engineer (iOS), SDK', 'Build APIs with Swift, Xcode, Go, C++');
      expect(res.searchRelevanceVerified).toBe(false);
      expect(res.searchRelevanceReason).toContain('Target search query "flutter" missing');
    });

    test('6. query="flutter", title="Backend Go Engineer" => REJECT', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Backend Go Engineer', 'Distributed systems in Go');
      expect(res.searchRelevanceVerified).toBe(false);
    });

    test('7. query="flutter", title="Infra Engineer" => REJECT', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Infra Engineer', 'Datacenter management');
      expect(res.searchRelevanceVerified).toBe(false);
    });

    test('8. query="flutter", title="Product Manager" => REJECT', () => {
      const res = verifier.verifySearchQueryRelevance(sampleJob, 'flutter', 'Product Manager', 'Roadmap management');
      expect(res.searchRelevanceVerified).toBe(false);
    });
  });

  describe('Phase 9: Country Normalization & Verification', () => {
    test('1. location="Vienna, Austria", country="CA" => normalize to AT', () => {
      const norm = verifier.deriveCanonicalCountry('Vienna, Austria', 'CA');
      expect(norm.country).toBe('AT');
      expect(norm.isVerified).toBe(true);
    });

    test('2. location="Sydney, NSW, Australia", country="CA" => normalize to AU and mark mismatch', () => {
      const norm = verifier.deriveCanonicalCountry('Sydney, NSW, Australia', 'CA');
      expect(norm.country).toBe('AU');
      expect(norm.isVerified).toBe(true);
    });

    test('3. countries=["AU"], Vienna job => REJECT (COUNTRY_MISMATCH)', async () => {
      const res = await verifier.verifyExternalJob(sampleJob, 'flutter');
      expect(res.verifiedCountry).toBe('AT');
      expect(res.countryMismatch).toBe(true);
    });

    test('4. countries=["ALL"], Vienna job => KEEP with AT', async () => {
      const norm = verifier.deriveCanonicalCountry('Vienna, Austria');
      expect(norm.country).toBe('AT');
    });
  });

  describe('Phase 10: Applyability Evidence Verification', () => {
    test('1. Missing detected title => REJECT with score=0 and isMatch=false', () => {
      const score = verifier.calculateTitleMatchScore('Flutter Engineer', undefined);
      expect(score.isMatch).toBe(false);
      expect(score.score).toBe(0);
      expect(score.reason).toContain('could not be independently verified');
    });

    test('2. Generic careers URL => STALE', async () => {
      const genericJob: JobListing = {
        ...sampleJob,
        url: 'https://www.canva.com/careers',
      };
      const res = await verifier.verifyExternalJob(genericJob);
      expect(res.status).toBe(JobLifecycleStatus.STALE);
    });
  });
});
