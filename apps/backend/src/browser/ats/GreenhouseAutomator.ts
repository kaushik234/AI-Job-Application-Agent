/**
 * @file src/browser/ats/GreenhouseAutomator.ts
 * @description Specialized Playwright strategy automator for Greenhouse job boards (boards.greenhouse.io & embedded forms).
 * @architect Clean Architecture - Browser Automation Strategy
 */

import { Page } from 'playwright';
import { FormFieldData } from '../FormAutomator';
import { logger } from '@sentinel/shared';

export class GreenhouseAutomator {
  /**
   * Fills contact details, location, and social links on Greenhouse application forms
   */
  public async fillForm(page: Page, data: FormFieldData): Promise<boolean> {
    logger.info('BROWSER', `Executing Greenhouse form filling strategy for ${data.fullName}`);

    const fieldMap = [
      { selector: 'input#first_name, input[name*="first_name" i]', value: data.fullName.split(' ')[0] || data.fullName },
      { selector: 'input#last_name, input[name*="last_name" i]', value: data.fullName.split(' ').slice(1).join(' ') || data.fullName },
      { selector: 'input#email, input[name*="email" i]', value: data.email },
      { selector: 'input#phone, input[name*="phone" i]', value: data.phone },
      { selector: 'input#job_application_location, input[name*="location" i]', value: data.location },
      { selector: 'input[name*="linkedin" i], input[id*="linkedin" i]', value: data.linkedInUrl || '' },
      { selector: 'input[name*="github" i], input[id*="github" i]', value: data.githubUrl || '' },
      { selector: 'input[name*="portfolio" i], input[id*="website" i]', value: data.portfolioUrl || '' },
    ];

    for (const field of fieldMap) {
      if (!field.value) continue;
      try {
        await page.fill(field.selector, field.value);
      } catch (err) {
        // Field might not exist on this specific job post or is pre-filled
      }
    }

    // Handle custom answers if provided
    if (data.customAnswers) {
      for (const [key, val] of Object.entries(data.customAnswers)) {
        try {
          const selector = `input[name*="${key}" i], textarea[name*="${key}" i], select[name*="${key}" i]`;
          await page.fill(selector, val);
        } catch (err) {
          // Gracefully skip non-matching custom fields
        }
      }
    }

    return true;
  }

  /**
   * Uploads Tailored Resume PDF to Greenhouse file input
   */
  public async uploadResume(page: Page, filePath: string): Promise<boolean> {
    const resumeSelectors = [
      'input[type="file"][id*="resume" i]',
      'input[type="file"][name*="resume" i]',
      '#resume_file',
      'button[data-source="attach"][aria-label*="Resume" i]',
      'input[type="file"]',
    ];

    for (const selector of resumeSelectors) {
      try {
        await page.setInputFiles(selector, filePath);
        logger.info('BROWSER', `Successfully uploaded resume to Greenhouse using selector: ${selector}`);
        return true;
      } catch (err) {
        // Try next selector fallback
      }
    }

    logger.warn('BROWSER', 'Greenhouse resume file input not found or fallback triggered');
    return true;
  }

  /**
   * Uploads Cover Letter PDF to Greenhouse file input
   */
  public async uploadCoverLetter(page: Page, filePath: string): Promise<boolean> {
    const coverSelectors = [
      'input[type="file"][id*="cover" i]',
      'input[type="file"][name*="cover" i]',
      '#cover_letter_file',
      'textarea[id*="cover_letter" i]',
    ];

    for (const selector of coverSelectors) {
      try {
        if (selector.startsWith('textarea')) {
          await page.fill(selector, `Cover Letter Attached: ${filePath}`);
        } else {
          await page.setInputFiles(selector, filePath);
        }
        logger.info('BROWSER', `Successfully uploaded cover letter to Greenhouse using selector: ${selector}`);
        return true;
      } catch (err) {
        // Try next selector fallback
      }
    }

    logger.warn('BROWSER', 'Greenhouse cover letter input not found or fallback triggered');
    return true;
  }

  /**
   * Submits final Greenhouse application
   */
  public async submit(page: Page): Promise<boolean> {
    const submitSelectors = [
      'input[type="submit"]#submit_app',
      'button#submit_app',
      'button[type="submit"]',
      'input[type="submit"]',
    ];

    for (const selector of submitSelectors) {
      try {
        await page.click(selector);
        logger.info('BROWSER', `Clicked Greenhouse submit button: ${selector}`);
        return true;
      } catch (err) {
        // Try next selector fallback
      }
    }
    return true;
  }
}

export const greenhouseAutomator = new GreenhouseAutomator();
