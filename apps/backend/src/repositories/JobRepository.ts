/**
 * @file src/repositories/JobRepository.ts
 * @description Repository pattern implementation for Job Listing persistence and querying.
 * @architect Clean Architecture - Repository Layer
 */

import { db, DatabaseManager } from '../database';
import { JobListing, JobMatchResult, CountryCode } from '@sentinel/types';

export class JobRepository {
  private database: DatabaseManager;

  constructor(databaseManager: DatabaseManager = db) {
    this.database = databaseManager;
  }

  /**
   * Retrieves all scraped jobs filtered by optional criteria
   */
  public async findJobs(filter?: {
    countries?: CountryCode[];
    minSalary?: number;
    remoteOnly?: boolean;
    visaOnly?: boolean;
    searchQuery?: string;
  }): Promise<JobListing[]> {
    let jobs = await this.database.getAllJobs();

    let filteredJobs = jobs;

    if (filter) {
      if (filter.countries && filter.countries.length > 0) {
        filteredJobs = filteredJobs.filter((j) => filter.countries!.includes(j.country));
      }

      if (filter.minSalary && filter.minSalary > 0) {
        filteredJobs = filteredJobs.filter((j) => !j.salaryMin || j.salaryMin >= filter.minSalary!);
      }

      if (filter.remoteOnly) {
        filteredJobs = filteredJobs.filter((j) => j.isRemote);
      }

      if (filter.visaOnly) {
        filteredJobs = filteredJobs.filter((j) => j.visaSponsorship);
      }

      if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
        const q = filter.searchQuery.toLowerCase();
        filteredJobs = filteredJobs.filter(
          (j) =>
            (j.title || '').toLowerCase().includes(q) ||
            (j.company || '').toLowerCase().includes(q) ||
            (j.description || '').toLowerCase().includes(q) ||
            (j.location || '').toLowerCase().includes(q)
        );
      }
    }

    return filteredJobs.map((j) => ({
      ...j,
      description: j.description || '',
      requirements: Array.isArray(j.requirements) ? j.requirements : [],
    }));
  }

  /**
   * Retrieves single job by ID
   */
  public async findById(id: string): Promise<JobListing | null> {
    return this.database.getJobById(id);
  }

  /**
   * Saves or updates a batch of job listings
   */
  public async saveMany(jobs: JobListing[]): Promise<JobListing[]> {
    return this.database.saveJobs(jobs);
  }

  /**
   * Save match score result
   */
  public async saveMatchResult(match: JobMatchResult): Promise<JobMatchResult> {
    return this.database.saveMatchResult(match);
  }

  /**
   * Get match score for a specific job
   */
  public async getMatchResult(jobId: string): Promise<JobMatchResult | null> {
    return this.database.getMatchResultByJobId(jobId);
  }
}
