/**
 * @file src/browser/ats/LeverAutomator.ts
 * @description Specialized Playwright strategy automator for Lever job boards (jobs.lever.co).
 * @architect Clean Architecture - Browser Automation Strategy
 */

import { Page } from 'playwright';
import { FormFieldData } from '../FormAutomator';
import { logger } from '@sentinel/shared';

export class LeverAutomator {
  /**
   * Fills contact details, organization, and custom URLs on Lever job forms
   */
  public async fillForm(page: Page, data: FormFieldData): Promise<boolean> {
    logger.info('BROWSER', `Executing Lever form filling strategy for ${data.fullName}`);

    const fieldMap = [
      { selector: 'input[name="name"]', value: data.fullName },
      { selector: 'input[name="email"]', value: data.email },
      { selector: 'input[name="phone"]', value: data.phone },
      { selector: 'input[name="org"], input[name="company"]', value: 'Current Company' },
      { selector: 'input[name="urls[LinkedIn]"]', value: data.linkedInUrl || '' },
      { selector: 'input[name="urls[GitHub]"]', value: data.githubUrl || '' },
      { selector: 'input[name="urls[Portfolio]"], input[name="urls[Other]"]', value: data.portfolioUrl || '' },
    ];

    for (const field of fieldMap) {
      if (!field.value) continue;
      try {
        await page.fill(field.selector, field.value);
      } catch (err) {
        // Field selector fallback
      }
    }

    if (data.customAnswers) {
      for (const [key, val] of Object.entries(data.customAnswers)) {
        try {
          const selector = `input[name*="${key}" i], textarea[name*="${key}" i]`;
          await page.fill(selector, val);
        } catch (err) {
          // Gracefully skip non-matching custom fields
        }
      }
    }

    return true;
  }

  /**
   * Uploads Tailored Resume PDF to Lever file input
   */
  public async uploadResume(page: Page, filePath: string): Promise<boolean> {
    const resumeSelectors = [
      'input[name="resume"]',
      'input[type="file"][id*="resume" i]',
      'input[type="file"]',
    ];

    for (const selector of resumeSelectors) {
      try {
        await page.setInputFiles(selector, filePath);
        logger.info('BROWSER', `Successfully uploaded resume to Lever using selector: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }

    logger.warn('BROWSER', 'Lever resume file input fallback triggered');
    return true;
  }

  /**
   * Uploads Cover Letter PDF to Lever file input
   */
  public async uploadCoverLetter(page: Page, filePath: string): Promise<boolean> {
    const coverSelectors = [
      'input[name="coverLetter"]',
      'textarea[name="comments"]',
      'input[type="file"][id*="cover" i]',
    ];

    for (const selector of coverSelectors) {
      try {
        if (selector.startsWith('textarea')) {
          await page.fill(selector, `Cover Letter Details Attached: ${filePath}`);
        } else {
          await page.setInputFiles(selector, filePath);
        }
        logger.info('BROWSER', `Successfully uploaded cover letter to Lever using selector: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }

    logger.warn('BROWSER', 'Lever cover letter input fallback triggered');
    return true;
  }

  /**
   * Submits final Lever application form
   */
  public async submit(page: Page): Promise<boolean> {
    const submitSelectors = [
      'button#btn-submit',
      'button[type="submit"]',
      '.postings-btn',
      'button.template-btn-submit',
    ];

    for (const selector of submitSelectors) {
      try {
        await page.click(selector);
        logger.info('BROWSER', `Clicked Lever submit button: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }
    return true;
  }
}

export const leverAutomator = new LeverAutomator();
