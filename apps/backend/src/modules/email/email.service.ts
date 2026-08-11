import { Injectable } from '@nestjs/common';
import { ScanEmailsDto, ProcessEmailResultDto, ClassifyEmailDto, EmailStatsDto } from './dto/email.dto';
import { gmailService, GmailService } from '../../services/GmailService';
import { EmailRepository } from '../../repositories/EmailRepository';
import { GeminiAIService } from '../../services/GeminiAIService';
import { EmailRecord, EmailCategory } from '@sentinel/types';

@Injectable()
export class EmailService {
  private service: GmailService;
  private repository: EmailRepository;
  private aiService: GeminiAIService;

  constructor() {
    this.service = gmailService;
    this.repository = new EmailRepository();
    this.aiService = new GeminiAIService();
  }

  async scanInboundEmails(dto: ScanEmailsDto = {}): Promise<ProcessEmailResultDto[]> {
    return this.service.processInboundEmails({
      maxResults: dto.maxResults || 10,
      query: dto.query,
    });
  }

  async getAllStoredEmails(): Promise<EmailRecord[]> {
    const stored = await this.repository.findAll();
    if (stored.length === 0) {
      const processed = await this.service.processInboundEmails();
      return processed.map((p) => p.email);
    }
    return stored;
  }

  async getEmailStats(): Promise<EmailStatsDto> {
    const emails = await this.getAllStoredEmails();

    const stats: EmailStatsDto = {
      totalScanned: emails.length,
      interviewCount: emails.filter((e) => e.classifiedCategory === EmailCategory.INTERVIEW).length,
      assessmentCount: emails.filter((e) => e.classifiedCategory === EmailCategory.ASSESSMENT).length,
      offerCount: emails.filter((e) => e.classifiedCategory === EmailCategory.OFFER).length,
      rejectionCount: emails.filter((e) => e.classifiedCategory === EmailCategory.REJECTION).length,
      spamCount: emails.filter((e) => e.classifiedCategory === EmailCategory.SPAM).length,
    };

    return stats;
  }

  async classifyCustomEmail(dto: ClassifyEmailDto) {
    return this.aiService.classifyRecruiterEmail(dto.subject, dto.body);
  }

  async deleteEmail(id: string): Promise<{ success: boolean }> {
    const deleted = await this.repository.delete(id);
    return { success: deleted };
  }
}
