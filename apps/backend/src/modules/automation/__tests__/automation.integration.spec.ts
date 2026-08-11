/**
 * @file src/modules/automation/__tests__/automation.integration.spec.ts
 * @description Integration tests for NestJS Automation Controller & Service supporting Greenhouse, Lever, Ashby, Workable, video tracking, CAPTCHA, and human approval modes.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AutomationController } from '../automation.controller';
import { AutomationService } from '../automation.service';
import { ATSPlatform } from '../dto/automation.dto';

describe('Automation Module Integration Suite', () => {
  let controller: AutomationController;
  let service: AutomationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationController],
      providers: [AutomationService],
    }).compile();

    controller = module.get<AutomationController>(AutomationController);
    service = module.get<AutomationService>(AutomationService);
  });

  it('should trigger browser auto-fill pipeline for Greenhouse', async () => {
    const res = await controller.triggerAutomation({
      jobId: 'job_gh_101',
      requireHumanApproval: false,
      platform: ATSPlatform.GREENHOUSE,
      targetUrl: 'https://boards.greenhouse.io/stripe/jobs/101',
    });

    expect(res).toBeDefined();
    expect(res.taskId).toBe('job_gh_101');
    expect(res.status).toBe('Applied');
    expect(res.videoPath).toBeDefined();
  });

  it('should trigger browser auto-fill in Human Approval Mode', async () => {
    const res = await controller.triggerAutomation({
      jobId: 'job_lever_202',
      requireHumanApproval: true,
      platform: ATSPlatform.LEVER,
      targetUrl: 'https://jobs.lever.co/figma/202',
    });

    expect(res).toBeDefined();
    expect(res.status).toBe('Pending Approval');
    expect(res.approvalPaused).toBe(true);
  });

  it('should approve pending submission post human verification', async () => {
    await controller.triggerAutomation({
      jobId: 'job_lever_202',
      requireHumanApproval: true,
      platform: ATSPlatform.LEVER,
    });

    const approveRes = await controller.approveSubmission('job_lever_202');
    expect(approveRes.success).toBe(true);

    const status = await controller.getTaskStatus('job_lever_202');
    expect(status.status).toBe('Applied');
  });

  it('should resume execution post CAPTCHA confirmation', async () => {
    const captchaRes = await controller.resumeCaptcha('job_gh_101');
    expect(captchaRes).toBeDefined();
  });

  it('should clear domain browser session cookies', async () => {
    const clearRes = await controller.clearSession('greenhouse.io');
    expect(clearRes).toBeDefined();
  });
});
