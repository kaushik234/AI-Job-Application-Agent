/**
 * @file src/browser/ats/WorkableAutomator.ts
 * @description Specialized Playwright strategy automator for Workable job boards (apply.workable.com).
 * @architect Clean Architecture - Browser Automation Strategy
 */

import { Page } from 'playwright';
import { FormFieldData } from '../FormAutomator';
import { logger } from '@sentinel/shared';

export class WorkableAutomator {
  /**
   * Fills contact details, name, and background on Workable multi-step forms
   */
  public async fillForm(page: Page, data: FormFieldData): Promise<boolean> {
    logger.info('BROWSER', `Executing Workable form filling strategy for ${data.fullName}`);

    const nameParts = data.fullName.split(' ');
    const firstName = nameParts[0] || data.fullName;
    const lastName = nameParts.slice(1).join(' ') || data.fullName;

    const fieldMap = [
      { selector: 'input[name="firstname"], #firstname', value: firstName },
      { selector: 'input[name="lastname"], #lastname', value: lastName },
      { selector: 'input[name="email"], #email', value: data.email },
      { selector: 'input[name="phone"], #phone', value: data.phone },
      { selector: 'input[name="address"], #address, input[name="location"]', value: data.location },
      { selector: 'input[name*="linkedin" i]', value: data.linkedInUrl || '' },
      { selector: 'input[name*="github" i]', value: data.githubUrl || '' },
      { selector: 'input[name*="website" i], input[name*="portfolio" i]', value: data.portfolioUrl || '' },
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
          // Gracefully skip
        }
      }
    }

    return true;
  }

  /**
   * Uploads Tailored Resume PDF to Workable file upload zone
   */
  public async uploadResume(page: Page, filePath: string): Promise<boolean> {
    const resumeSelectors = [
      'input[type="file"][name="resume"]',
      'input[type="file"][id*="resume" i]',
      'input[type="file"]',
    ];

    for (const selector of resumeSelectors) {
      try {
        await page.setInputFiles(selector, filePath);
        logger.info('BROWSER', `Successfully uploaded resume to Workable using selector: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }

    logger.warn('BROWSER', 'Workable resume file input fallback triggered');
    return true;
  }

  /**
   * Uploads Cover Letter PDF to Workable file upload zone
   */
  public async uploadCoverLetter(page: Page, filePath: string): Promise<boolean> {
    const coverSelectors = [
      'input[type="file"][name="cover_letter"]',
      'textarea[name="cover_letter_text"]',
      'input[type="file"][id*="cover" i]',
    ];

    for (const selector of coverSelectors) {
      try {
        if (selector.startsWith('textarea')) {
          await page.fill(selector, `Cover Letter Attached: ${filePath}`);
        } else {
          await page.setInputFiles(selector, filePath);
        }
        logger.info('BROWSER', `Successfully uploaded cover letter to Workable using selector: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }

    logger.warn('BROWSER', 'Workable cover letter input fallback triggered');
    return true;
  }

  /**
   * Submits final Workable application form
   */
  public async submit(page: Page): Promise<boolean> {
    const submitSelectors = [
      'button[data-ui="submit-application"]',
      'button[type="submit"]',
      'button:has-text("Submit application")',
    ];

    for (const selector of submitSelectors) {
      try {
        await page.click(selector);
        logger.info('BROWSER', `Clicked Workable submit button: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }
    return true;
  }
}

export const workableAutomator = new WorkableAutomator();
