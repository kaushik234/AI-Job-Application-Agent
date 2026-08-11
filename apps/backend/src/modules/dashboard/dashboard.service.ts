import { Injectable } from '@nestjs/common';
import { DashboardStatsResponseDto, AnalyticsMetricsResponseDto } from './dto/dashboard.dto';
import { analyticsService, AnalyticsService } from '../../services/AnalyticsService';

@Injectable()
export class DashboardService {
  private service: AnalyticsService;

  constructor() {
    this.service = analyticsService;
  }

  async getOverviewStats(): Promise<DashboardStatsResponseDto> {
    const metrics = await this.service.getAnalyticsMetrics();
    const countryBreakdown: Record<string, number> = {};
    for (const dist of metrics.countryDistribution) {
      countryBreakdown[dist.country] = dist.count;
    }

    return {
      applicationsToday: metrics.applicationsPerDay[metrics.applicationsPerDay.length - 1]?.count || 0,
      dailyLimit: 15,
      pendingApprovalCount: 2,
      interviewsCount: metrics.countryDistribution.reduce((acc, c) => acc + c.count, 0) / 4, // approximation
      successRate: metrics.successRate,
      countryBreakdown,
    };
  }

  async getAnalyticsMetrics(): Promise<AnalyticsMetricsResponseDto> {
    return this.service.getAnalyticsMetrics();
  }

  async generateCsvExport(): Promise<string> {
    return this.service.exportApplicationsCSV();
  }

  async generatePdfExport(): Promise<Uint8Array> {
    return this.service.exportAnalyticsPDF();
  }
}
