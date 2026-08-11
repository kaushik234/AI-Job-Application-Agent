/**
 * @file src/browser/ats/ATSAutomatorFactory.ts
 * @description Factory class to select the appropriate ATS strategy automator based on target URL or platform name.
 * @architect Clean Architecture - Strategy Pattern Factory
 */

import { GreenhouseAutomator, greenhouseAutomator } from './GreenhouseAutomator';
import { LeverAutomator, leverAutomator } from './LeverAutomator';
import { AshbyAutomator, ashbyAutomator } from './AshbyAutomator';
import { WorkableAutomator, workableAutomator } from './WorkableAutomator';
import { logger } from '@sentinel/shared';

export type ATSPlatformType = 'Greenhouse' | 'Lever' | 'Ashby' | 'Workable' | 'Generic';

export interface ATSStrategy {
  fillForm(page: any, data: any): Promise<boolean>;
  uploadResume(page: any, filePath: string): Promise<boolean>;
  uploadCoverLetter(page: any, filePath: string): Promise<boolean>;
  submit(page: any): Promise<boolean>;
}

export class ATSAutomatorFactory {
  /**
   * Detects the ATS platform from job portal URL or platform string
   */
  public static detectPlatform(urlOrPlatform: string = ''): ATSPlatformType {
    const lower = urlOrPlatform.toLowerCase();

    if (lower.includes('greenhouse') || lower.includes('boards.greenhouse.io')) {
      return 'Greenhouse';
    }
    if (lower.includes('lever') || lower.includes('jobs.lever.co')) {
      return 'Lever';
    }
    if (lower.includes('ashby') || lower.includes('jobs.ashbyhq.com')) {
      return 'Ashby';
    }
    if (lower.includes('workable') || lower.includes('apply.workable.com')) {
      return 'Workable';
    }

    return 'Generic';
  }

  /**
   * Returns the strategy instance for the target platform
   */
  public static getStrategy(platformOrUrl: string = ''): { platform: ATSPlatformType; strategy: ATSStrategy } {
    const platform = this.detectPlatform(platformOrUrl);

    logger.info('BROWSER', `Selected ATS Automation Strategy: [${platform}] for query: ${platformOrUrl}`);

    switch (platform) {
      case 'Greenhouse':
        return { platform, strategy: greenhouseAutomator };
      case 'Lever':
        return { platform, strategy: leverAutomator };
      case 'Ashby':
        return { platform, strategy: ashbyAutomator };
      case 'Workable':
        return { platform, strategy: workableAutomator };
      default:
        // Generic fallback returns default interface methods
        return {
          platform: 'Generic',
          strategy: {
            fillForm: async () => true,
            uploadResume: async () => true,
            uploadCoverLetter: async () => true,
            submit: async () => true,
          },
        };
    }
  }
}
