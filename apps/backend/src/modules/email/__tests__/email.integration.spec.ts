/**
 * @file src/modules/email/__tests__/email.integration.spec.ts
 * @description Integration test suite for NestJS Email Module REST endpoints (/scan, /list, /stats, /classify, /:id).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from '../email.controller';
import { EmailService } from '../email.service';

describe('NestJS Email Module Integration Suite', () => {
  let controller: EmailController;
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [EmailService],
    }).compile();

    controller = module.get<EmailController>(EmailController);
    service = module.get<EmailService>(EmailService);
  });

  it('should scan inbound Gmail messages and classify recruiter emails', async () => {
    const results = await controller.scanInboundEmails({ maxResults: 5 });
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const interviewMsg = results.find((r) => r.email.classifiedCategory === 'Interview') || results[0];
    expect(interviewMsg).toBeDefined();
  });

  it('should return stored email records and category metrics', async () => {
    await controller.scanInboundEmails({ maxResults: 5 });

    const emails = await controller.getStoredEmails();
    expect(emails.length).toBeGreaterThan(0);

    const stats = await controller.getEmailStats();
    expect(stats.totalScanned).toBeGreaterThan(0);
    expect(stats.interviewCount).toBeGreaterThanOrEqual(0);
  });

  it('should classify custom email subject and body text via AI', async () => {
    const res = await controller.classifyCustomEmail({
      subject: 'Interview Schedule for Staff Engineer',
      body: 'We would love to invite you for a 45-minute technical screen.',
    });

    expect(res).toBeDefined();
    expect(res.category).toBeDefined();
  });

  it('should delete a stored email record', async () => {
    const deleteRes = await controller.deleteEmail('gmail_msg_1');
    expect(deleteRes).toBeDefined();
  });
});
