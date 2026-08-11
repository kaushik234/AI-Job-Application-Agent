import { Controller, Post, Get, Delete, Body, Param, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { TriggerAutomationDto, AutomationTaskStatusDto, ApproveSubmissionDto, ResumeCaptchaDto } from './dto/automation.dto';
import { AutomationExceptionFilter } from './filters/automation.filter';
import { AutomationInterceptor } from './interceptors/automation.interceptor';

@ApiTags('Automation')
@Controller('automation')
@UseFilters(AutomationExceptionFilter)
@UseInterceptors(AutomationInterceptor)
export class AutomationController {
  constructor(@Inject(AutomationService) private readonly automationService: AutomationService) {}

  @Post('run')
  @ApiOperation({ summary: 'Trigger Playwright browser auto-fill pipeline for Greenhouse, Lever, Ashby, or Workable' })
  @ApiResponse({ status: 201, type: AutomationTaskStatusDto })
  async triggerAutomation(@Body() dto: TriggerAutomationDto): Promise<AutomationTaskStatusDto> {
    return this.automationService.triggerAutomation(dto);
  }

  @Get('task/:id')
  @ApiOperation({ summary: 'Get status of an active browser automation task' })
  async getTaskStatus(@Param('id') id: string) {
    return this.automationService.getTaskStatus(id);
  }

  @Post('task/:id/approve')
  @ApiOperation({ summary: 'Approve pending submission in Human Approval Mode' })
  async approveSubmission(@Param('id') id: string) {
    return this.automationService.approveSubmission({ jobId: id });
  }

  @Post('task/:id/captcha-solved')
  @ApiOperation({ summary: 'Confirm CAPTCHA challenge solved and resume automation' })
  async resumeCaptcha(@Param('id') id: string) {
    return this.automationService.resumeAfterCaptcha({ jobId: id });
  }

  @Delete('sessions/:domain')
  @ApiOperation({ summary: 'Clear stored browser session cookies for a domain' })
  async clearSession(@Param('domain') domain: string) {
    return this.automationService.clearDomainSession(domain);
  }
}
