/**
 * @file src/services/JobDeduplicationService.ts
 * @description Deduplicates job listings scraped across multiple platforms (Seek, LinkedIn, Greenhouse, Lever, etc.)
 * by company name, normalized title, and location. Merges sourcePlatforms and preserves highest quality URL.
 * @architect Clean Architecture - Job Deduplication Engine
 */

import { JobListing, JobPlatform } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class JobDeduplicationService {
  /**
   * Normalizes a string for deduplication key matching.
   */
  private normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Generates a canonical deduplication key for a job listing.
   */
  /**
   * Generates a canonical deduplication key for a job listing.
   * Preserves seniority/role distinctions while matching identical positions across platforms.
   */
  public generateDedupeKey(job: JobListing): string {
    const normCompany = this.normalize(job.company);
    const normTitle = this.normalize(job.title);
    const normLoc = this.normalize(job.location || job.country || '');
    return `${normCompany}_${normTitle}_${normLoc}`;
  }

  /**
   * Calculates source confidence level based on source platform quality.
   */
  public calculateSourceConfidence(platform: string): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' {
    const p = (platform || '').toLowerCase();
    if (p.includes('career') || p.includes('company') || p.includes('ashby') || p.includes('greenhouse') || p.includes('lever') || p.includes('workable')) {
      return 'VERY_HIGH';
    }
    if (p.includes('seek') || p.includes('linkedin') || p.includes('indeed') || p.includes('job bank')) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }

  /**
   * Ranks platform priority to select the best canonical URL.
   */
  private getPlatformPriority(platform: string): number {
    const p = (platform || '').toLowerCase();
    if (p.includes('career') || p.includes('company')) return 1;
    if (p.includes('greenhouse') || p.includes('lever') || p.includes('ashby') || p.includes('workable')) return 2;
    if (p.includes('seek')) return 3;
    if (p.includes('linkedin')) return 4;
    if (p.includes('indeed')) return 5;
    return 6;
  }

  /**
   * Deduplicates array of jobs, merging duplicate sources.
   */
  public deduplicateJobs(jobs: JobListing[]): JobListing[] {
    const map = new Map<string, JobListing>();

    for (const job of jobs) {
      const key = this.generateDedupeKey(job);
      const existing = map.get(key);
      const currentPlatform = (job.platform || job.source || 'Company Career Page') as string;
      const confidence = this.calculateSourceConfidence(currentPlatform);

      if (!existing) {
        map.set(key, {
          ...job,
          canonicalUrl: job.canonicalUrl || job.url,
          sources: [currentPlatform],
          sourcePlatforms: [currentPlatform],
          sourceConfidence: confidence,
          firstDiscoveredAt: job.firstDiscoveredAt || job.discoveredAt || job.createdAt || new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        });
      } else {
        // Merge source platforms & sources
        const existingSources = new Set(existing.sources || existing.sourcePlatforms || [existing.platform as string]);
        existingSources.add(currentPlatform);
        existing.sources = Array.from(existingSources);
        existing.sourcePlatforms = Array.from(existingSources);
        existing.lastSeenAt = new Date().toISOString();

        // Keep highest source confidence
        if (confidence === 'VERY_HIGH' || (confidence === 'HIGH' && existing.sourceConfidence !== 'VERY_HIGH')) {
          existing.sourceConfidence = confidence;
        }

        // Keep the higher quality source URL
        const existingPriority = this.getPlatformPriority(existing.platform as string);
        const newPriority = this.getPlatformPriority(currentPlatform);

        if (newPriority < existingPriority) {
          existing.id = job.id;
          existing.url = job.url;
          existing.canonicalUrl = job.canonicalUrl || job.url;
          existing.platform = job.platform;
          existing.source = job.source;
          if (job.description && job.description.length > (existing.description || '').length) {
            existing.description = job.description;
          }
        }

        logger.info('SEARCH', `[DEDUPE] Merged duplicate listing "${job.title}" at ${job.company} across sources: ${existing.sources.join(', ')}`);
      }
    }

    return Array.from(map.values());
  }
}

export const jobDeduplicationService = new JobDeduplicationService();
