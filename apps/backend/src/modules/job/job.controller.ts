import { Controller, Get, Post, Body, Param, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobService } from './job.service';
import { ScrapeJobsDto, JobResponseDto } from './dto/job.dto';
import { JobExceptionFilter } from './filters/job.filter';
import { JobInterceptor } from './interceptors/job.interceptor';

@ApiTags('Jobs')
@Controller('jobs')
@UseFilters(JobExceptionFilter)
@UseInterceptors(JobInterceptor)
export class JobController {
  constructor(@Inject(JobService) private readonly jobService: JobService) {}

  @Get()
  @ApiOperation({ summary: 'Get all scraped target job postings' })
  @ApiResponse({ status: 200, type: [JobResponseDto] })
  async getJobs(): Promise<JobResponseDto[]> {
    return this.jobService.getJobs();
  }

  @Post('scrape')
  @ApiOperation({ summary: 'Trigger job discovery scraper for target country' })
  async triggerScrape(@Body() dto: ScrapeJobsDto) {
    const resObj = await this.jobService.triggerScrape(dto);
    console.log('[SCRAPE_TRACE] [8] CONTROLLER', {
      stage: 'CONTROLLER',
      jobsCount: resObj.jobs?.length,
      totalMatches: resObj.totalMatches,
      totalScrapedRaw: resObj.report?.totalScrapedRaw,
      providerBreakdown: resObj.report?.providerBreakdown,
      jobIds: resObj.jobs?.map((j: any) => j.id),
    });
    console.log('[SCRAPE_TRACE] [9] HTTP RESPONSE', {
      stage: 'HTTP_RESPONSE',
      jobsCount: resObj.jobs?.length,
      totalMatches: resObj.totalMatches,
      totalScrapedRaw: resObj.report?.totalScrapedRaw,
      jobIds: resObj.jobs?.map((j: any) => j.id),
    });
    return resObj;
  }

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'Evaluate candidate fit and application priority for a target job' })
  async evaluateJob(@Body() body: { id?: string }) {
    return this.jobService.evaluateJobById(body?.id);
  }

  @Post(':id/verify-original')
  @ApiOperation({ summary: 'Controlled revalidation check before opening external job link' })
  async verifyOriginal(@Param('id') id: string) {
    return this.jobService.verifyOriginalPost(id);
  }

  @Get(':id/debug-match')
  @ApiOperation({ summary: 'Get detailed candidate evidence, component scores, weights & audit trail for a job' })
  async debugMatch(@Param('id') id: string) {
    return this.jobService.getDebugMatch(id);
  }

  @Get(':id/audit-document')
  @ApiOperation({ summary: 'Get document generation audit trail and zero-fabrication verification report' })
  async auditDocument(@Param('id') id: string) {
    return this.jobService.getAuditDocument(id);
  }
}
