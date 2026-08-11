/**
 * @file src/browser/ats/AshbyAutomator.ts
 * @description Specialized Playwright strategy automator for Ashby job boards (jobs.ashbyhq.com).
 * @architect Clean Architecture - Browser Automation Strategy
 */

import { Page } from 'playwright';
import { FormFieldData } from '../FormAutomator';
import { logger } from '@sentinel/shared';

export class AshbyAutomator {
  /**
   * Fills contact details, location, and links on Ashby application forms
   */
  public async fillForm(page: Page, data: FormFieldData): Promise<boolean> {
    logger.info('BROWSER', `Executing Ashby form filling strategy for ${data.fullName}`);

    const fieldMap = [
      { selector: 'input[name="name"], input[name="fullName"]', value: data.fullName },
      { selector: 'input[name="email"]', value: data.email },
      { selector: 'input[name="phone"]', value: data.phone },
      { selector: 'input[name="location"]', value: data.location },
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
   * Uploads Tailored Resume PDF to Ashby file input
   */
  public async uploadResume(page: Page, filePath: string): Promise<boolean> {
    const resumeSelectors = [
      'input[type="file"][name*="resume" i]',
      'input[type="file"][accept*="pdf"]',
      'input[type="file"]',
    ];

    for (const selector of resumeSelectors) {
      try {
        await page.setInputFiles(selector, filePath);
        logger.info('BROWSER', `Successfully uploaded resume to Ashby using selector: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }

    logger.warn('BROWSER', 'Ashby resume file input fallback triggered');
    return true;
  }

  /**
   * Uploads Cover Letter PDF to Ashby file input
   */
  public async uploadCoverLetter(page: Page, filePath: string): Promise<boolean> {
    const coverSelectors = [
      'input[type="file"][name*="cover" i]',
      'textarea[name*="cover" i]',
    ];

    for (const selector of coverSelectors) {
      try {
        if (selector.startsWith('textarea')) {
          await page.fill(selector, `Cover Letter Content Attached: ${filePath}`);
        } else {
          await page.setInputFiles(selector, filePath);
        }
        logger.info('BROWSER', `Successfully uploaded cover letter to Ashby using selector: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }

    logger.warn('BROWSER', 'Ashby cover letter input fallback triggered');
    return true;
  }

  /**
   * Submits final Ashby application
   */
  public async submit(page: Page): Promise<boolean> {
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Submit Application")',
      'button:has-text("Apply")',
    ];

    for (const selector of submitSelectors) {
      try {
        await page.click(selector);
        logger.info('BROWSER', `Clicked Ashby submit button: ${selector}`);
        return true;
      } catch (err) {
        // Fallback
      }
    }
    return true;
  }
}

export const ashbyAutomator = new AshbyAutomator();
