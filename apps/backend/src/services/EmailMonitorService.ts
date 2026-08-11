/**
 * @file src/services/EmailMonitorService.ts
 * @description Email Monitor Service scanning inbound recruiter communications and updating application tracker states using Gemini AI.
 * @architect Clean Architecture - External Integration & Classification Layer
 */

import { EmailRepository } from '../repositories/EmailRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { GeminiAIService } from './GeminiAIService';
import { gmailService } from './GmailService';
import { EmailRecord } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class EmailMonitorService {
  private emailRepo: EmailRepository;
  private appRepo: ApplicationRepository;
  private aiService: GeminiAIService;

  constructor() {
    this.emailRepo = new EmailRepository();
    this.appRepo = new ApplicationRepository();
    this.aiService = new GeminiAIService();
  }

  /**
   * Polls Gmail inbox, classifies emails using Gemini AI, stores messages, and updates application tracker
   */
  public async checkInboundEmails(): Promise<EmailRecord[]> {
    logger.info('EMAIL', 'Delegating inbound recruiter message check to Gmail API Service...');
    const processed = await gmailService.processInboundEmails();
    return processed.map((p) => p.email);
  }
}

/** Singleton instance */
export const emailMonitorService = new EmailMonitorService();
