/**
 * @file src/repositories/ApplicationRepository.ts
 * @description Repository pattern implementation for Application Tracking state and statistics.
 * @architect Clean Architecture - Repository Layer
 */

import { db, DatabaseManager } from '../database';
import { ApplicationRecord, ApplicationStatus, DashboardStats, CountryCode } from '@sentinel/types';

export class ApplicationRepository {
  private database: DatabaseManager;

  constructor(databaseManager: DatabaseManager = db) {
    this.database = databaseManager;
  }

  /**
   * Retrieves all tracked job applications
   */
  public async findAll(): Promise<ApplicationRecord[]> {
    return this.database.getAllApplications();
  }

  /**
   * Find application by ID
   */
  public async findById(id: string): Promise<ApplicationRecord | null> {
    return this.database.getApplicationById(id);
  }

  /**
   * Find application by Job ID
   */
  public async findByJobId(jobId: string): Promise<ApplicationRecord | null> {
    return this.database.getApplicationByJobId(jobId);
  }

  /**
   * Insert or update application record
   */
  public async upsert(record: ApplicationRecord): Promise<ApplicationRecord> {
    return this.database.upsertApplication(record);
  }

  /**
   * Update application status transition
   */
  public async updateStatus(id: string, status: ApplicationStatus, notes?: string): Promise<ApplicationRecord | null> {
    return this.database.updateApplicationStatus(id, status, notes);
  }

  /**
   * Calculates dashboard summary analytics
   */
  public async getDashboardStats(): Promise<DashboardStats> {
    const apps = await this.database.getAllApplications();
    const settings = await this.database.getSettings();
    const tailoredResumes = await this.database.getAllTailoredResumes();

    const todayStr = new Date().toISOString().split('T')[0];
    const applicationsToday = apps.filter((a) => a.appliedAt && a.appliedAt.startsWith(todayStr)).length;

    const totalApplications = apps.filter((a) => a.status !== ApplicationStatus.DISCOVERED && a.status !== ApplicationStatus.MATCHED).length;

    const responsesCount = apps.filter(
      (a) =>
        a.status === ApplicationStatus.ASSESSMENT ||
        a.status === ApplicationStatus.INTERVIEW ||
        a.status === ApplicationStatus.OFFER ||
        a.status === ApplicationStatus.REJECTED_AFTER_INTERVIEW
    ).length;

    const successRate = totalApplications > 0 ? Math.round((responsesCount / totalApplications) * 100) : 0;

    const pendingApprovalCount = apps.filter((a) => a.status === ApplicationStatus.PENDING_APPROVAL || a.status === ApplicationStatus.CAPTCHA_PAUSED).length;
    const interviewsCount = apps.filter((a) => a.status === ApplicationStatus.INTERVIEW).length;

    const countryBreakdown: Record<CountryCode, number> = { AU: 0, CA: 0, DE: 0 };
    const statusBreakdown: Record<string, number> = {};

    apps.forEach((a) => {
      if (countryBreakdown[a.country] !== undefined) {
        countryBreakdown[a.country]++;
      }
      statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1;
    });

    return {
      applicationsToday,
      dailyLimit: settings.dailyApplicationLimit,
      totalApplications,
      successRate,
      pendingApprovalCount,
      interviewsCount,
      resumeVersionsCount: tailoredResumes.length,
      countryBreakdown,
      statusBreakdown,
    };
  }
}
