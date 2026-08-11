export class DashboardStatsEntity {
  applicationsToday!: number;
  dailyLimit!: number;
  pendingApprovalCount!: number;
  interviewsCount!: number;
  successRate!: number;
  countryBreakdown!: {
    AU: number;
    CA: number;
    DE: number;
  };
}
