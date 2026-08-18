/**
 * @file src/services/DiscoveryJobStore.ts
 * @description Transient In-Memory Job Discovery Store.
 * Stores fresh discovery results temporarily in-memory with TTL expiration.
 * Ensures DISCOVERY ≠ DATABASE WRITE.
 * @architect Clean Architecture - Transient Store Pattern
 */

import { JobListing } from '@sentinel/types';

export interface TransientJobEntry {
  job: JobListing;
  discoveryRunId: string;
  createdAt: number;
  expiresAt: number;
}

export class DiscoveryJobStore {
  private static instance: DiscoveryJobStore;
  private store: Map<string, TransientJobEntry> = new Map();
  private ttlMs = 45 * 60 * 1000; // 45 minutes TTL

  public static getInstance(): DiscoveryJobStore {
    if (!DiscoveryJobStore.instance) {
      DiscoveryJobStore.instance = new DiscoveryJobStore();
    }
    return DiscoveryJobStore.instance;
  }

  /**
   * Store fresh discovery results in memory for downstream operations
   */
  public saveJobs(jobs: JobListing[], discoveryRunId: string): void {
    const now = Date.now();
    const expiresAt = now + this.ttlMs;
    this.clearExpired();

    for (const job of jobs) {
      if (job && job.id) {
        this.store.set(job.id, {
          job,
          discoveryRunId,
          createdAt: now,
          expiresAt,
        });
      }
    }
  }

  /**
   * Retrieve a transient discovered job by ID
   */
  public getJob(jobId: string): JobListing | undefined {
    this.clearExpired();
    const entry = this.store.get(jobId);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(jobId);
      return undefined;
    }
    return entry.job;
  }

  /**
   * Check if job exists in transient store
   */
  public hasJob(jobId: string): boolean {
    return !!this.getJob(jobId);
  }

  /**
   * Purge expired entries
   */
  public clearExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(id);
      }
    }
  }

  /**
   * Clear all transient jobs (useful for test isolation)
   */
  public clearAll(): void {
    this.store.clear();
  }

  /**
   * Get all active transient jobs
   */
  public getAllTransientJobs(): JobListing[] {
    this.clearExpired();
    return Array.from(this.store.values()).map((e) => e.job);
  }
}

export const discoveryJobStore = DiscoveryJobStore.getInstance();

/**
 * Global helper: Resolves job by checking DiscoveryJobStore first,
 * falling back to DB/repository for explicitly saved historical jobs.
 */
export async function resolveJob(jobId: string, dbFallbackFn?: (id: string) => Promise<JobListing | null>): Promise<JobListing | null> {
  if (!jobId) return null;
  const transient = discoveryJobStore.getJob(jobId);
  if (transient) {
    return transient;
  }
  if (dbFallbackFn) {
    return dbFallbackFn(jobId);
  }
  return null;
}
