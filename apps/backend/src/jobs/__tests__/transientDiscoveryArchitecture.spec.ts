import { discoveryJobStore } from '../../services/DiscoveryJobStore';
import { JobRepository } from '../../repositories/JobRepository';
import { db } from '../../database';
import { JobService } from '../../modules/job/job.service';
import { jobVerificationService } from '../../services/JobVerificationService';
import { runDatabaseCleanup } from '../../scripts/cleanupSyntheticJobs';

// Module mock to prevent real external HTTP calls during unit tests
jest.mock('../JobScraperEngine', () => {
  return {
    JobScraperEngine: jest.fn().mockImplementation(() => ({
      executeParallelCrawl: jest.fn().mockImplementation(async (queryParam: any, pagination: any, discoveryRunId?: string) => {
        const qStr = (queryParam?.userQuery || queryParam?.q || queryParam?.query || '').toLowerCase();
        const isNonExistent = qStr.includes('nonexistent');
        const runId = discoveryRunId || `disc_${Date.now()}_mock`;
        const jobs = isNonExistent
          ? []
          : [
              {
                id: 'ashby-mock-flutter-101',
                title: 'Senior Flutter Engineer',
                company: 'MockCorp',
                location: 'Sydney, AU',
                country: 'AU',
                url: 'https://jobs.ashbyhq.com/mockcorp/101',
                platform: 'Ashby',
                jobStatus: 'ACTIVE',
                sourceVerified: true,
                verificationStatus: 'ACTIVE',
              },
            ];

        if (jobs.length > 0) {
          discoveryJobStore.saveJobs(jobs as any, runId);
        }

        const pipeline = {
          rawJobsCollected: jobs.length,
          afterDeduplication: jobs.length,
          afterQueryFilter: jobs.length,
          afterRoleRelevance: jobs.length,
          afterLocationFilter: jobs.length,
          afterVerification: jobs.length,
          afterRanking: jobs.length,
          returned: jobs.length,
        };

        return {
          mode: 'WORLDWIDE',
          discoveryRunId: runId,
          totalScrapedRaw: jobs.length,
          freshJobsReturned: jobs.length,
          totalUniqueNew: jobs.length,
          duplicatesFiltered: 0,
          providersProcessed: 9,
          providerBreakdown: {
            Ashby: { scraped: jobs.length, status: 'SUCCESS' },
          },
          rejectionStats: {},
          pipeline,
          debug: {
            queriesGenerated: [queryParam?.query || 'flutter'],
            rawJobsCollected: jobs.length,
            afterQueryFilter: jobs.length,
            afterRoleRelevance: jobs.length,
            afterLocationFilter: jobs.length,
            afterVerification: jobs.length,
            finalJobs: jobs.length,
            pipeline,
          },
          rejectionSamples: [],
          jobs,
        };
      }),
    })),
    jobScraperEngine: {
      executeParallelCrawl: jest.fn(),
    },
  };
});

describe('Focused Correctness Verification & Transient Architecture Test Suite', () => {
  let jobRepo: JobRepository;
  let jobService: JobService;

  beforeEach(() => {
    discoveryJobStore.clearAll();
    jobRepo = new JobRepository();
    jobService = new JobService();
    (jobService as any).activeDiscoveryFlights?.clear();
  });

  afterAll(() => {
    runDatabaseCleanup();
  });

  test('1. Live discovery does NOT increase DB count', async () => {
    const dbJobsBefore = (await db.getAllJobs()).length;

    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    const dbJobsAfter = (await db.getAllJobs()).length;

    expect(dbJobsAfter).toBe(dbJobsBefore);
    expect(response.source).toBe('LIVE_DISCOVERY');
    expect(response.jobs.length).toBe(1);
  });

  test('2. Explicit Save increases DB count by 1', async () => {
    const dbBefore = (await db.getAllJobs()).length;
    const transientJob: any = {
      id: `transient-save-test-${Date.now()}`,
      title: 'Explicit Save Mobile Dev',
      company: 'SaveCorp Test',
      location: 'Sydney, AU',
      country: 'AU',
      url: `https://jobs.ashbyhq.com/savecorp/${Date.now()}`,
      platform: 'Ashby',
      jobStatus: 'ACTIVE',
      sourceVerified: true,
      verificationStatus: 'ACTIVE',
    };

    discoveryJobStore.saveJobs([transientJob], 'save-run-test');

    const result = await jobService.explicitlySaveJob(transientJob.id);
    expect(result.success).toBe(true);

    const dbAfter = (await db.getAllJobs()).length;
    expect(dbAfter).toBe(dbBefore + 1);
  });

  test('3. reverifyAllJobs / explicit revalidation persists updated verification status to DB', async () => {
    const testDbJob: any = {
      id: 'ashby-db-reverify-999',
      title: 'Backend Software Engineer',
      company: 'DbCorp',
      location: 'Sydney, AU',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/dbcorp/expired-job',
      platform: 'Ashby',
      jobStatus: 'ACTIVE',
      sourceVerified: true,
      verificationStatus: 'ACTIVE',
    };

    await db.saveJobs([testDbJob]);

    // Explicit revalidation with persist: true persists changes to DB
    const res = await jobVerificationService.verifyExternalJob(testDbJob, undefined, { persist: true });
    expect(res.status).toBe('EXPIRED');

    const reloaded = await db.getJobById('ashby-db-reverify-999');
    expect(reloaded).toBeDefined();
    expect(reloaded?.verificationStatus).toBe('EXPIRED');
  });

  test('4. Discovery and HTTP response use the exact same discoveryRunId', async () => {
    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    expect(response.discoveryRunId).toBeDefined();
    expect(response.report.discoveryRunId).toBe(response.discoveryRunId);

    const snapshot = discoveryJobStore.getRunSnapshot(response.discoveryRunId);
    expect(snapshot).toBeDefined();
  });

  test('5. Discovery response does not expose unlimited rejectionDiagnostics and caps rejectionSamples to max 10', async () => {
    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    expect((response.report as any).rejectionDiagnostics).toBeUndefined();
    expect(response.report.rejectionSamples.length).toBeLessThanOrEqual(10);
  });

  test('6. Discovery pipeline counts never increase between stages', async () => {
    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    const pipeline = (response.report as any).pipeline;
    expect(pipeline).toBeDefined();
    expect(pipeline.returned).toBe(response.jobs.length);
    expect(pipeline.returned).toBeLessThanOrEqual(pipeline.afterRanking);
    expect(pipeline.afterRanking).toBeLessThanOrEqual(pipeline.afterVerification);
    expect(pipeline.afterVerification).toBeLessThanOrEqual(pipeline.afterLocationFilter);
    expect(pipeline.afterLocationFilter).toBeLessThanOrEqual(pipeline.afterRoleRelevance);
    expect(pipeline.afterRoleRelevance).toBeLessThanOrEqual(pipeline.afterQueryFilter);
    expect(pipeline.afterQueryFilter).toBeLessThanOrEqual(pipeline.afterDeduplication);
    expect(pipeline.afterDeduplication).toBeLessThanOrEqual(pipeline.rawJobsCollected);
  });

  test('7. Returned count equals actual jobs array length', async () => {
    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    expect(response.jobs.length).toBe(response.totalMatches);
    expect(response.report.pipeline?.returned).toBe(response.jobs.length);
  });

  test('8. WORLDWIDE mode does not pass job title as searchQuery into verifySearchQueryRelevance', () => {
    const job: any = {
      id: 'job-fleet-infra-1',
      title: 'Software Engineer, Fleet Infrastructure',
      company: 'Canva',
      location: 'Sydney, AU',
      country: 'AU',
    };

    // When searchQuery is undefined (WORLDWIDE mode)
    const result = jobVerificationService.verifySearchQueryRelevance(job, undefined, job.title, 'Backend Go infrastructure');

    expect(result.searchRelevanceVerified).toBe(true);
    expect(result.searchQuery).toBe('WORLDWIDE');
    expect(result.searchQuery).not.toBe('software engineer, fleet infrastructure');
  });

  test('9. CUSTOM query "flutter" rejects non-Flutter job "Software Engineer, Fleet Infrastructure"', () => {
    const job: any = {
      id: 'job-fleet-infra-2',
      title: 'Software Engineer, Fleet Infrastructure',
      company: 'Canva',
      location: 'Sydney, AU',
      country: 'AU',
    };

    // When searchQuery is explicitly "flutter"
    const result = jobVerificationService.verifySearchQueryRelevance(job, 'flutter', job.title, 'Backend Go infrastructure microservices');

    expect(result.searchRelevanceVerified).toBe(false);
    expect(result.searchRelevanceReason).toContain('missing requested technology requirement');
  });

  test('10. "flutter python" requires both technology groups (Flutter/Dart AND Python)', () => {
    const job: any = {
      id: 'job-flutter-only-1',
      title: 'Senior Flutter Developer',
      company: 'MobileInc',
      location: 'Remote',
      country: 'US',
    };

    // Description has Flutter/Dart, but lacks Python
    const flutterOnlyDesc = 'Developing mobile applications using Flutter and Dart framework.';
    const res1 = jobVerificationService.verifySearchQueryRelevance(job, 'flutter python', job.title, flutterOnlyDesc);

    expect(res1.searchRelevanceVerified).toBe(false);
    expect(res1.searchRelevanceReason).toContain('python');

    // Description has BOTH Flutter and Python
    const bothDesc = 'Developing mobile applications using Flutter and Dart, with Python backend services.';
    const res2 = jobVerificationService.verifySearchQueryRelevance(job, 'flutter python', job.title, bothDesc);

    expect(res2.searchRelevanceVerified).toBe(true);
  });

  test('11. Transient jobs remain resolvable through JobRepository', async () => {
    const transientJob: any = {
      id: 'transient-resolvable-777',
      title: 'Transient Mobile Engineer',
      company: 'TransientCo',
      location: 'Melbourne, AU',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/transientco/777',
      platform: 'Ashby',
      jobStatus: 'ACTIVE',
      sourceVerified: true,
      verificationStatus: 'ACTIVE',
    };

    discoveryJobStore.saveJobs([transientJob], 'run-transient-777');

    const resolved = await jobRepo.findById('transient-resolvable-777');
    expect(resolved).toBeDefined();
    expect(resolved?.company).toBe('TransientCo');
  });

  test('12. Existing saved DB jobs still resolve correctly', async () => {
    const allDbJobs = await db.getAllJobs();
    expect(allDbJobs.length).toBeGreaterThan(0);

    const firstDbJob = allDbJobs[0];
    const resolvedDbJob = await jobRepo.findById(firstDbJob.id);

    expect(resolvedDbJob).toBeDefined();
    expect(resolvedDbJob?.id).toBe(firstDbJob.id);
  });
});
