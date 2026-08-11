/**
 * @file src/services/__tests__/AnalyticsService.spec.ts
 * @description Unit tests for Phase 11 Analytics Service (metrics computation, CSV export, and PDF generation).
 */

import { AnalyticsService } from '../AnalyticsService';
import { ApplicationRepository } from '../../repositories/ApplicationRepository';
import { ApplicationRecord, ApplicationStatus } from '@sentinel/types';

describe('Analytics Service Unit Suite', () => {
  let analyticsService: AnalyticsService;
  let appRepo: ApplicationRepository;

  const mockApps: ApplicationRecord[] = [
    {
      id: 'app_1',
      jobId: 'job_1',
      jobTitle: 'Senior Backend Engineer',
      company: 'Atlassian',
      country: 'AU',
      url: 'https://atlassian.com/jobs/1',
      status: ApplicationStatus.INTERVIEW,
      matchScore: 92,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: 'app_2',
      jobId: 'job_2',
      jobTitle: 'Staff Full Stack Engineer',
      company: 'Canva',
      country: 'AU',
      url: 'https://canva.com/jobs/2',
      status: ApplicationStatus.OFFER,
      matchScore: 96,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: 'app_3',
      jobId: 'job_3',
      jobTitle: 'Staff Engineer',
      company: 'Shopify',
      country: 'CA',
      url: 'https://shopify.com/jobs/3',
      status: ApplicationStatus.APPLIED,
      matchScore: 84,
      lastUpdatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    appRepo = new ApplicationRepository();
    // Seed mock apps into database
    for (const app of mockApps) {
      await appRepo.upsert(app);
    }
    analyticsService = new AnalyticsService(appRepo);
  });

  describe('1. Get Analytics Metrics', () => {
    it('should compute overall applications conversion, success, and interview rates', async () => {
      const metrics = await analyticsService.getAnalyticsMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalApplications).toBeGreaterThanOrEqual(3);
      expect(metrics.successRate).toBeDefined();
      expect(metrics.interviewRate).toBeDefined();
      expect(metrics.offerRate).toBeDefined();
    });

    it('should compile regional distributions and timeline counts', async () => {
      const metrics = await analyticsService.getAnalyticsMetrics();

      expect(metrics.countryDistribution.length).toBe(3); // AU, CA, DE
      expect(metrics.applicationsPerDay.length).toBe(30);

      const auDist = metrics.countryDistribution.find((c) => c.country === 'AU');
      expect(auDist?.count).toBeGreaterThanOrEqual(2);
    });

    it('should segment resume version performance and company counts', async () => {
      const metrics = await analyticsService.getAnalyticsMetrics();

      expect(metrics.resumePerformance.length).toBeGreaterThan(0);
      expect(metrics.companyDistribution.length).toBeGreaterThan(0);

      const atlassianDist = metrics.companyDistribution.find((c) => c.company === 'Atlassian');
      expect(atlassianDist?.applicationsCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. CSV Export', () => {
    it('should generate properly formatted CSV string with headers', async () => {
      const csv = await analyticsService.exportApplicationsCSV();

      expect(csv).toBeDefined();
      expect(csv).toContain('Job Title,Company,Country');
      expect(csv).toContain('Senior Backend Engineer');
      expect(csv).toContain('Atlassian');
    });
  });

  describe('3. PDF Executive Report Generation', () => {
    it('should build Uint8Array representing valid PDF document', async () => {
      const pdfBytes = await analyticsService.exportAnalyticsPDF();

      expect(pdfBytes).toBeDefined();
      expect(pdfBytes instanceof Uint8Array).toBe(true);
      expect(pdfBytes.length).toBeGreaterThan(0);

      // PDF signature "%PDF" check
      const signature = Buffer.from(pdfBytes.slice(0, 4)).toString('utf-8');
      expect(signature).toBe('%PDF');
    });
  });
});
