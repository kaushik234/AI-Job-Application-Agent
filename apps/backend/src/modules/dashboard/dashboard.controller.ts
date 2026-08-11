import { Controller, Get, Res, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto, AnalyticsMetricsResponseDto } from './dto/dashboard.dto';
import { DashboardExceptionFilter } from './filters/dashboard.filter';
import { DashboardInterceptor } from './interceptors/dashboard.interceptor';
import { Response } from 'express';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseFilters(DashboardExceptionFilter)
@UseInterceptors(DashboardInterceptor)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get agent overview dashboard statistics' })
  @ApiResponse({ status: 200, type: DashboardStatsResponseDto })
  async getStats(): Promise<DashboardStatsResponseDto> {
    return this.dashboardService.getOverviewStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get advanced metrics for all 8 charts and performance benchmarks' })
  @ApiResponse({ status: 200, type: AnalyticsMetricsResponseDto })
  async getAnalytics(): Promise<AnalyticsMetricsResponseDto> {
    return this.dashboardService.getAnalyticsMetrics();
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export full job applications list to CSV format' })
  async exportCsv(@Res() res: Response) {
    const csv = await this.dashboardService.generateCsvExport();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=applications_analytics.csv');
    return res.status(200).send(csv);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Generate and download executive PDF analytics report' })
  async exportPdf(@Res() res: Response) {
    const pdfBytes = await this.dashboardService.generatePdfExport();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=executive_analytics_report.pdf');
    return res.status(200).send(Buffer.from(pdfBytes));
  }
}
