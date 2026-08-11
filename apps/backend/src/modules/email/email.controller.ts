import { Controller, Post, Get, Delete, Body, Param, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { ScanEmailsDto, ProcessEmailResultDto, ClassifyEmailDto, EmailStatsDto } from './dto/email.dto';
import { EmailExceptionFilter } from './filters/email.filter';
import { EmailInterceptor } from './interceptors/email.interceptor';

@ApiTags('Email')
@Controller('email')
@UseFilters(EmailExceptionFilter)
@UseInterceptors(EmailInterceptor)
export class EmailController {
  constructor(@Inject(EmailService) private readonly emailService: EmailService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan inbound Gmail messages, classify via Gemini AI, and update tracker statuses' })
  @ApiResponse({ status: 200, type: [ProcessEmailResultDto] })
  async scanInboundEmails(@Body() dto: ScanEmailsDto): Promise<ProcessEmailResultDto[]> {
    return this.emailService.scanInboundEmails(dto);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get all stored recruiter email records' })
  async getStoredEmails() {
    return this.emailService.getAllStoredEmails();
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get all stored recruiter email records (alias)' })
  async getStoredEmailsMessages() {
    return this.emailService.getAllStoredEmails();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get recruiter email category metrics (Interviews, Assessments, Offers, Rejections, Spam)' })
  @ApiResponse({ status: 200, type: EmailStatsDto })
  async getEmailStats(): Promise<EmailStatsDto> {
    return this.emailService.getEmailStats();
  }

  @Post('classify')
  @ApiOperation({ summary: 'Classify custom email subject & body text using Gemini AI' })
  async classifyCustomEmail(@Body() dto: ClassifyEmailDto) {
    return this.emailService.classifyCustomEmail(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stored email record' })
  async deleteEmail(@Param('id') id: string) {
    return this.emailService.deleteEmail(id);
  }
}
