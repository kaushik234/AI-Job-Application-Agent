/**
 * @file src/services/__tests__/GmailService.spec.ts
 * @description Unit and Integration tests for Phase 12 Gmail API Service.
 */

import { GmailService } from '../GmailService';
import { ApplicationRepository } from '../../repositories/ApplicationRepository';
import { EmailRepository } from '../../repositories/EmailRepository';
import { ApplicationStatus, EmailCategory, ApplicationRecord } from '@sentinel/types';

describe('Phase 12 Gmail API & Recruiter Intelligence Suite', () => {
  let gmailService: GmailService;
  let appRepo: ApplicationRepository;
  let emailRepo: EmailRepository;

  // Mock Gemini AIService to deliver fast, deterministic classification results in unit test environment
  const mockAiService = {
    classifyRecruiterEmail: jest.fn().mockImplementation(async (subject: string, body: string) => {
      const text = `${subject} ${body}`.toLowerCase();
      if (text.includes('interview')) {
        return { category: EmailCategory.INTERVIEW, confidenceScore: 0.95, matchedCompany: 'Atlassian', matchedJobTitle: 'Senior Backend Engineer' };
      }
      if (text.includes('assessment') || text.includes('hackerrank')) {
        return { category: EmailCategory.ASSESSMENT, confidenceScore: 0.92, matchedCompany: 'Shopify', matchedJobTitle: 'Staff Software Engineer' };
      }
      if (text.includes('offer')) {
        return { category: EmailCategory.OFFER, confidenceScore: 0.98, matchedCompany: 'Canva', matchedJobTitle: 'Staff Platform Engineer' };
      }
      if (text.includes('other candidates') || text.includes('decided to move forward with')) {
        return { category: EmailCategory.REJECTION, confidenceScore: 0.91, matchedCompany: 'Datadog', matchedJobTitle: 'Senior Systems Engineer' };
      }
      if (text.includes('cheap') || text.includes('discount')) {
        return { category: EmailCategory.SPAM, confidenceScore: 0.99 };
      }
      return { category: EmailCategory.GENERAL, confidenceScore: 0.80 };
    }),
  } as any;

  beforeEach(() => {
    appRepo = new ApplicationRepository();
    emailRepo = new EmailRepository();
    gmailService = new GmailService(mockAiService, emailRepo, appRepo);
  });

  describe('1. Fetch Inbound Emails', () => {
    it('should retrieve messages from Gmail API inbox stream', async () => {
      const emails = await gmailService.fetchInboundEmails({ maxResults: 5 });
      expect(emails).toBeDefined();
      expect(Array.isArray(emails)).toBe(true);
      expect(emails.length).toBeGreaterThan(0);

      const first = emails[0];
      expect(first.id).toBeDefined();
      expect(first.sender).toBeDefined();
      expect(first.subject).toBeDefined();
    });
  });

  describe('2. Email Categorization & Classification (Interview, Offer, Assessment, Rejection, Spam)', () => {
    it('should process, classify, store emails, and update application tracker states', async () => {
      // Seed test job applications in repository
      const seedApps: ApplicationRecord[] = [
        {
          id: 'app_atlassian_101',
          jobId: 'job_atlassian_101',
          jobTitle: 'Senior Backend Engineer',
          company: 'Atlassian',
          country: 'AU',
          url: 'https://boards.greenhouse.io/atlassian/101',
          status: ApplicationStatus.APPLIED,
          matchScore: 92,
          lastUpdatedAt: new Date().toISOString(),
        },
        {
          id: 'app_shopify_202',
          jobId: 'job_shopify_202',
          jobTitle: 'Staff Software Engineer',
          company: 'Shopify',
          country: 'CA',
          url: 'https://shopify.com/careers/202',
          status: ApplicationStatus.APPLIED,
          matchScore: 88,
          lastUpdatedAt: new Date().toISOString(),
        },
        {
          id: 'app_canva_303',
          jobId: 'job_canva_303',
          jobTitle: 'Staff Platform Engineer',
          company: 'Canva',
          country: 'AU',
          url: 'https://canva.com/careers/303',
          status: ApplicationStatus.INTERVIEW,
          matchScore: 95,
          lastUpdatedAt: new Date().toISOString(),
        },
        {
          id: 'app_datadog_404',
          jobId: 'job_datadog_404',
          jobTitle: 'Senior Systems Engineer',
          company: 'Datadog',
          country: 'DE',
          url: 'https://datadog.com/careers/404',
          status: ApplicationStatus.APPLIED,
          matchScore: 85,
          lastUpdatedAt: new Date().toISOString(),
        },
      ];

      for (const app of seedApps) {
        await appRepo.upsert(app);
      }

      const results = await gmailService.processInboundEmails();
      expect(results.length).toBeGreaterThan(0);

      // Verify Category Classifications
      const interviewResult = results.find((r) => r.email.classifiedCategory === EmailCategory.INTERVIEW);
      expect(interviewResult).toBeDefined();
      expect(interviewResult?.newStatus).toBe(ApplicationStatus.INTERVIEW);

      const assessmentResult = results.find((r) => r.email.classifiedCategory === EmailCategory.ASSESSMENT);
      expect(assessmentResult).toBeDefined();
      expect(assessmentResult?.newStatus).toBe(ApplicationStatus.ASSESSMENT);

      const offerResult = results.find((r) => r.email.classifiedCategory === EmailCategory.OFFER);
      expect(offerResult).toBeDefined();
      expect(offerResult?.newStatus).toBe(ApplicationStatus.OFFER);

      const rejectionResult = results.find((r) => r.email.classifiedCategory === EmailCategory.REJECTION);
      expect(rejectionResult).toBeDefined();
      expect(rejectionResult?.newStatus).toBe(ApplicationStatus.REJECTED);

      const spamResult = results.find((r) => r.email.classifiedCategory === EmailCategory.SPAM);
      expect(spamResult).toBeDefined();
      expect(spamResult?.statusUpdated).toBe(false);
    });
  });

  describe('3. Email Persistence & Notification Dispatch', () => {
    it('should save processed recruiter email records to repository and dispatch notifications', async () => {
      const results = await gmailService.processInboundEmails();
      const savedEmails = await emailRepo.findAll();
      expect(savedEmails.length).toBeGreaterThan(0);
      expect(results.every((r) => r.email.id)).toBe(true);
    });
  });
});
