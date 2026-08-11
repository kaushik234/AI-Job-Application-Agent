/**
 * @file src/browser/__tests__/ats-strategies.spec.ts
 * @description Unit tests for ATS Automation Strategies (Greenhouse, Lever, Ashby, Workable, and ATSAutomatorFactory).
 */

import { ATSAutomatorFactory } from '../ats/ATSAutomatorFactory';
import { greenhouseAutomator } from '../ats/GreenhouseAutomator';
import { leverAutomator } from '../ats/LeverAutomator';
import { ashbyAutomator } from '../ats/AshbyAutomator';
import { workableAutomator } from '../ats/WorkableAutomator';
import { FormFieldData } from '../FormAutomator';
import { Page } from 'playwright';

describe('ATS Automation Strategy Handlers Suite', () => {
  let mockPage: Page;

  const sampleData: FormFieldData = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 555 123 4567',
    location: 'San Francisco, CA',
    linkedInUrl: 'https://linkedin.com/in/janedoe',
    githubUrl: 'https://github.com/janedoe',
    portfolioUrl: 'https://janedoe.dev',
    customAnswers: {
      sponsorship: 'No',
    },
  };

  beforeEach(() => {
    mockPage = {
      fill: jest.fn().mockResolvedValue(undefined),
      setInputFiles: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
    } as unknown as Page;
  });

  describe('1. ATSAutomatorFactory Strategy Detection', () => {
    it('should detect Greenhouse from URL domain', () => {
      const res = ATSAutomatorFactory.getStrategy('https://boards.greenhouse.io/stripe/jobs/123');
      expect(res.platform).toBe('Greenhouse');
    });

    it('should detect Lever from URL domain', () => {
      const res = ATSAutomatorFactory.getStrategy('https://jobs.lever.co/netflix/456');
      expect(res.platform).toBe('Lever');
    });

    it('should detect Ashby from URL domain', () => {
      const res = ATSAutomatorFactory.getStrategy('https://jobs.ashbyhq.com/openai/789');
      expect(res.platform).toBe('Ashby');
    });

    it('should detect Workable from URL domain', () => {
      const res = ATSAutomatorFactory.getStrategy('https://apply.workable.com/spotify/j/101');
      expect(res.platform).toBe('Workable');
    });

    it('should fallback to Generic for unknown domains', () => {
      const res = ATSAutomatorFactory.getStrategy('https://example.com/apply');
      expect(res.platform).toBe('Generic');
    });
  });

  describe('2. GreenhouseAutomator Strategy', () => {
    it('should populate Greenhouse form fields and custom answers', async () => {
      const res = await greenhouseAutomator.fillForm(mockPage, sampleData);
      expect(res).toBe(true);
      expect(mockPage.fill).toHaveBeenCalledWith(expect.stringContaining('first_name'), 'Jane');
      expect(mockPage.fill).toHaveBeenCalledWith(expect.stringContaining('email'), sampleData.email);
    });

    it('should upload resume and cover letter to Greenhouse', async () => {
      const resumeRes = await greenhouseAutomator.uploadResume(mockPage, '/tmp/resume.pdf');
      const coverRes = await greenhouseAutomator.uploadCoverLetter(mockPage, '/tmp/cover.pdf');

      expect(resumeRes).toBe(true);
      expect(coverRes).toBe(true);
      expect(mockPage.setInputFiles).toHaveBeenCalled();
    });

    it('should trigger Greenhouse form submit', async () => {
      const res = await greenhouseAutomator.submit(mockPage);
      expect(res).toBe(true);
      expect(mockPage.click).toHaveBeenCalled();
    });
  });

  describe('3. LeverAutomator Strategy', () => {
    it('should populate Lever application fields', async () => {
      const res = await leverAutomator.fillForm(mockPage, sampleData);
      expect(res).toBe(true);
      expect(mockPage.fill).toHaveBeenCalledWith('input[name="name"]', 'Jane Doe');
      expect(mockPage.fill).toHaveBeenCalledWith('input[name="email"]', sampleData.email);
    });

    it('should upload resume and cover letter to Lever', async () => {
      const resumeRes = await leverAutomator.uploadResume(mockPage, '/tmp/resume.pdf');
      const coverRes = await leverAutomator.uploadCoverLetter(mockPage, '/tmp/cover.pdf');

      expect(resumeRes).toBe(true);
      expect(coverRes).toBe(true);
    });

    it('should trigger Lever form submit', async () => {
      const res = await leverAutomator.submit(mockPage);
      expect(res).toBe(true);
    });
  });

  describe('4. AshbyAutomator Strategy', () => {
    it('should populate Ashby application fields', async () => {
      const res = await ashbyAutomator.fillForm(mockPage, sampleData);
      expect(res).toBe(true);
      expect(mockPage.fill).toHaveBeenCalledWith(expect.stringContaining('name'), 'Jane Doe');
    });

    it('should upload resume and cover letter to Ashby', async () => {
      const resumeRes = await ashbyAutomator.uploadResume(mockPage, '/tmp/resume.pdf');
      const coverRes = await ashbyAutomator.uploadCoverLetter(mockPage, '/tmp/cover.pdf');

      expect(resumeRes).toBe(true);
      expect(coverRes).toBe(true);
    });

    it('should trigger Ashby form submit', async () => {
      const res = await ashbyAutomator.submit(mockPage);
      expect(res).toBe(true);
    });
  });

  describe('5. WorkableAutomator Strategy', () => {
    it('should populate Workable application fields', async () => {
      const res = await workableAutomator.fillForm(mockPage, sampleData);
      expect(res).toBe(true);
      expect(mockPage.fill).toHaveBeenCalledWith(expect.stringContaining('firstname'), 'Jane');
      expect(mockPage.fill).toHaveBeenCalledWith(expect.stringContaining('lastname'), 'Doe');
    });

    it('should upload resume and cover letter to Workable', async () => {
      const resumeRes = await workableAutomator.uploadResume(mockPage, '/tmp/resume.pdf');
      const coverRes = await workableAutomator.uploadCoverLetter(mockPage, '/tmp/cover.pdf');

      expect(resumeRes).toBe(true);
      expect(coverRes).toBe(true);
    });

    it('should trigger Workable form submit', async () => {
      const res = await workableAutomator.submit(mockPage);
      expect(res).toBe(true);
    });
  });
});
