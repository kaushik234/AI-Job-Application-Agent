import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsResponseDto {
  @ApiProperty({ type: Number, example: 6 })
  applicationsToday!: number;

  @ApiProperty({ type: Number, example: 15 })
  dailyLimit!: number;

  @ApiProperty({ type: Number, example: 2 })
  pendingApprovalCount!: number;

  @ApiProperty({ type: Number, example: 4 })
  interviewsCount!: number;

  @ApiProperty({ type: Number, example: 18.5 })
  successRate!: number;

  @ApiProperty({ type: Object, example: { AU: 14, CA: 12, DE: 8 } })
  countryBreakdown!: Record<string, number>;
}

export class ApplicationsPerDayDto {
  @ApiProperty({ type: String, example: '2026-08-08' })
  date!: string;

  @ApiProperty({ type: Number, example: 3 })
  count!: number;
}

export class ResumePerformanceDto {
  @ApiProperty({ type: String, example: 'tr_v1' })
  resumeId!: string;

  @ApiProperty({ type: String, example: 'v1.2-StaffBackend' })
  versionTag!: string;

  @ApiProperty({ type: Number, example: 15 })
  applicationsCount!: number;

  @ApiProperty({ type: Number, example: 3 })
  interviewsCount!: number;

  @ApiProperty({ type: Number, example: 1 })
  offersCount!: number;

  @ApiProperty({ type: Number, example: 24.5 })
  conversionRate!: number;
}

export class CountryDistributionDto {
  @ApiProperty({ type: String, example: 'AU' })
  country!: string;

  @ApiProperty({ type: String, example: 'Australia' })
  countryName!: string;

  @ApiProperty({ type: String, example: '🇦🇺' })
  flag!: string;

  @ApiProperty({ type: Number, example: 14 })
  count!: number;

  @ApiProperty({ type: Number, example: 41 })
  percentage!: number;
}

export class CompanyDistributionDto {
  @ApiProperty({ type: String, example: 'Atlassian' })
  company!: string;

  @ApiProperty({ type: Number, example: 2 })
  applicationsCount!: number;

  @ApiProperty({ type: Number, example: 1 })
  interviewsCount!: number;

  @ApiProperty({ type: String, example: 'Interview' })
  status!: string;
}

export class MatchScoreDistributionDto {
  @ApiProperty({ type: Number, example: 2 })
  under70!: number;

  @ApiProperty({ type: Number, example: 5 })
  range70to80!: number;

  @ApiProperty({ type: Number, example: 18 })
  range80to90!: number;

  @ApiProperty({ type: Number, example: 9 })
  range90to100!: number;

  @ApiProperty({ type: Number, example: 86.4 })
  averageScore!: number;
}

export class AnalyticsMetricsResponseDto {
  @ApiProperty({ type: Number, example: 34 })
  totalApplications!: number;

  @ApiProperty({ type: Number, example: 18.5 })
  successRate!: number;

  @ApiProperty({ type: Number, example: 15.2 })
  interviewRate!: number;

  @ApiProperty({ type: Number, example: 6.8 })
  offerRate!: number;

  @ApiProperty({ type: [ApplicationsPerDayDto] })
  applicationsPerDay!: ApplicationsPerDayDto[];

  @ApiProperty({ type: [ResumePerformanceDto] })
  resumePerformance!: ResumePerformanceDto[];

  @ApiProperty({ type: [CountryDistributionDto] })
  countryDistribution!: CountryDistributionDto[];

  @ApiProperty({ type: [CompanyDistributionDto] })
  companyDistribution!: CompanyDistributionDto[];

  @ApiProperty({ type: MatchScoreDistributionDto })
  matchScoreDistribution!: MatchScoreDistributionDto;

  @ApiProperty({ type: String, example: '2026-08-08T00:00:00.000Z' })
  updatedAt!: string;
}
