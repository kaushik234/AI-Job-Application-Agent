import { discoveryJobStore } from '../../services/DiscoveryJobStore';
import { JobRepository } from '../../repositories/JobRepository';
import { db } from '../../database';
import { JobService } from '../../modules/job/job.service';

// Module mock to prevent real external HTTP calls during unit tests
jest.mock('../JobScraperEngine', () => {
  return {
    JobScraperEngine: jest.fn().mockImplementation(() => ({
      executeParallelCrawl: jest.fn().mockImplementation(async (queryParam: any) => {
        const qStr = (queryParam?.userQuery || queryParam?.q || queryParam?.query || '').toLowerCase();
        const isNonExistent = qStr.includes('nonexistent');
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
          discoveryJobStore.saveJobs(jobs as any, `disc_${Date.now()}`);
        }

        return {
          mode: 'WORLDWIDE',
          totalScrapedRaw: jobs.length,
          freshJobsReturned: jobs.length,
          totalUniqueNew: jobs.length,
          duplicatesFiltered: 0,
          providersProcessed: 9,
          providerBreakdown: {
            Ashby: { scraped: jobs.length, status: 'SUCCESS' },
          },
          rejectionStats: {},
          debug: {
            queriesGenerated: [queryParam?.query || 'flutter'],
            rawJobsCollected: jobs.length,
            afterQueryFilter: jobs.length,
            afterRoleRelevance: jobs.length,
            afterLocationFilter: jobs.length,
            afterVerification: jobs.length,
            finalJobs: jobs.length,
          },
          jobs,
        };
      }),
    })),
    jobScraperEngine: {
      executeParallelCrawl: jest.fn(),
    },
  };
});

describe('Transient Job Discovery Architecture & Zero-Automatic DB Persistence Specs', () => {
  let jobRepo: JobRepository;
  let jobService: JobService;

  beforeEach(() => {
    discoveryJobStore.clearAll();
    jobRepo = new JobRepository();
    jobService = new JobService();
    (jobService as any).activeDiscoveryFlights?.clear();
  });

  test('1 & 16: Discovery does NOT write jobs to the database', async () => {
    const dbJobsBefore = (await db.getAllJobs()).length;

    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    const dbJobsAfter = (await db.getAllJobs()).length;

    // Database count must NOT increase during discovery
    expect(dbJobsAfter).toBe(dbJobsBefore);
    expect(response.source).toBe('LIVE_DISCOVERY');
    expect(response.jobs.length).toBe(1);
  });

  test('2 & 3: Discovery returns fresh jobs and populates DiscoveryJobStore', async () => {
    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    expect(response.success).toBe(true);
    expect(response.jobs.length).toBe(1);

    const stored = discoveryJobStore.getJob('ashby-mock-flutter-101');
    expect(stored).toBeDefined();
    expect(stored?.company).toBe('MockCorp');
  });

  test('4 & 6: Transient job can be resolved by JobRepository.findById and db fallback works', async () => {
    const transientJob: any = {
      id: 'transient-job-test-101',
      title: 'Transient Flutter Engineer',
      company: 'Transient Corp',
      location: 'Sydney, AU',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/transient/101',
      platform: 'Ashby',
      jobStatus: 'ACTIVE',
      sourceVerified: true,
      verificationStatus: 'ACTIVE',
    };

    discoveryJobStore.saveJobs([transientJob], 'test-run-1');

    // JobRepository.findById resolves transient job
    const resolvedTransient = await jobRepo.findById('transient-job-test-101');
    expect(resolvedTransient).toBeDefined();
    expect(resolvedTransient?.title).toBe('Transient Flutter Engineer');

    // Database fallback for persisted jobs
    const allDbJobs = await db.getAllJobs();
    if (allDbJobs.length > 0) {
      const dbJobId = allDbJobs[0].id;
      if (!discoveryJobStore.hasJob(dbJobId)) {
        const resolvedDbJob = await jobRepo.findById(dbJobId);
        expect(resolvedDbJob).toBeDefined();
        expect(resolvedDbJob?.id).toBe(dbJobId);
      }
    }
  });

  test('5: Verify Original Post works for a transient discovered job', async () => {
    const transientJob: any = {
      id: 'ashby-transient-verify-original-1',
      title: 'Senior Flutter Developer',
      company: 'Canva',
      location: 'Sydney, AU',
      country: 'AU',
      url: 'https://jobs.ashbyhq.com/canva/transient-1',
      platform: 'Ashby',
      jobStatus: 'ACTIVE',
      sourceVerified: true,
      verificationStatus: 'ACTIVE',
      lastVerifiedAt: new Date().toISOString(),
    };

    discoveryJobStore.saveJobs([transientJob], 'run-verify-orig');

    const result = await jobService.verifyOriginalPost('ashby-transient-verify-original-1');
    expect(result.success).toBe(true);
    expect(result.canOpen).toBe(true);
    expect(result.finalUrl).toBe('https://jobs.ashbyhq.com/canva/transient-1');
  });

  test('7 & 13: Two discovery runs remain independent and do not pollute DB', async () => {
    const dbBefore = (await db.getAllJobs()).length;

    const run1 = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });
    expect(run1.jobs.length).toBe(1);

    const run2 = await jobService.triggerScrape({ query: 'nonexistent-query-xyz-888', countries: ['ALL'] });
    expect(run2.jobs).toEqual([]);

    const dbAfter = (await db.getAllJobs()).length;
    expect(dbAfter).toBe(dbBefore);
  });

  test('8 & 15: Zero discovery results return jobs: [] and do NOT load database jobs as fallback', async () => {
    const response = await jobService.triggerScrape({ query: 'nonexistent-technology-query-xyz-9999', countries: ['ALL'] });

    expect(response.success).toBe(true);
    expect(response.jobs).toEqual([]);
    expect(response.scrapedCount).toBe(0);
  });

  test('9: Explicit Save Job explicitly persists transient job to database', async () => {
    const transientJob: any = {
      id: 'transient-save-me-123',
      title: 'Explicit Save Test Engineer',
      company: 'SaveCorp',
      location: 'Berlin, DE',
      country: 'DE',
      url: 'https://jobs.ashbyhq.com/savecorp/123',
      platform: 'Ashby',
      jobStatus: 'ACTIVE',
      sourceVerified: true,
      verificationStatus: 'ACTIVE',
    };

    discoveryJobStore.saveJobs([transientJob], 'save-run-1');

    const result = await jobService.explicitlySaveJob('transient-save-me-123');
    expect(result.success).toBe(true);
    expect(result.job.id).toBe('transient-save-me-123');

    // Confirm it now exists in DB
    const savedInDb = await db.getJobById('transient-save-me-123');
    expect(savedInDb).toBeDefined();
    expect(savedInDb?.company).toBe('SaveCorp');
  });

  test('10: Zero fake or demo jobs in discovery result', async () => {
    const response = await jobService.triggerScrape({ query: 'flutter', countries: ['ALL'] });

    const containsDemo = response.jobs.some(
      (j: any) =>
        j.id.includes('demo') ||
        j.id.includes('vienna') ||
        j.isDemoJob === true ||
        (j.company || '').toLowerCase().includes('demo technologies')
    );
    expect(containsDemo).toBe(false);
  });
});
