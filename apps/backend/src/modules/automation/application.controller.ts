import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApplicationRepository } from '../../repositories/ApplicationRepository';
import { ApplicationStatus } from '@sentinel/types';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  private appRepo: ApplicationRepository;

  constructor() {
    this.appRepo = new ApplicationRepository();
  }

  @Get()
  @ApiOperation({ summary: 'Get all tracked applications' })
  async getApplications() {
    return this.appRepo.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  async getStats() {
    return this.appRepo.getDashboardStats();
  }

  @Post('prepare')
  @ApiOperation({ summary: 'Prepare draft application & evaluate readiness' })
  async prepareApplication(@Body() dto: { jobId: string }) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const result = await applicationPreparationService.prepareApplication(dto.jobId);
    return { success: true, data: result };
  }

  @Get(':id/readiness')
  @ApiOperation({ summary: 'Get readiness verification checklist for application' })
  async getReadiness(@Param('id') id: string) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const readiness = await applicationPreparationService.getReadiness(id);
    return { success: true, data: readiness };
  }

  @Get(':id/evidence-audit')
  @ApiOperation({ summary: 'Get cover letter claim-by-claim evidence verification' })
  async getEvidenceAudit(@Param('id') id: string) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const audit = await applicationPreparationService.getCoverLetterEvidence(id);
    return { success: true, data: audit };
  }

  @Post(':id/submit-manual')
  @ApiOperation({ summary: 'Record manual user submission (rejects automated/programmatic calls)' })
  async submitManual(@Param('id') id: string, @Body() dto: { userConfirmed: boolean }) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const record = await applicationPreparationService.recordUserSubmission(id, dto.userConfirmed);
    return { success: true, data: record };
  }

  @Post(':id/verify-external')
  @ApiOperation({ summary: 'Verify external platform submission evidence (URLs, reference numbers, or platform activity)' })
  async verifyExternal(@Param('id') id: string, @Body() dto: any) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const result = await applicationPreparationService.verifyExternalSubmission(id, dto);
    return { success: true, data: result };
  }

  @Get(':id/audit-log')
  @ApiOperation({ summary: 'Get application audit trail logs' })
  async getAuditLog(@Param('id') id: string) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const logs = applicationPreparationService.getAuditLogs(id);
    return { success: true, count: logs.length, data: logs };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update application status' })
  async updateStatus(@Param('id') id: string, @Body() dto: { status: ApplicationStatus; notes?: string }) {
    return this.appRepo.updateStatus(id, dto.status, dto.notes);
  }
}
