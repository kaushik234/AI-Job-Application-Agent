/**
 * @file src/jobs/utils/deduplication.ts
 * @description Fingerprinting and Deduplication utility for job search engine to prevent duplicate job listings across providers.
 * @architect Clean Architecture - Data Quality & Normalization
 */

import { JobListing } from '@sentinel/types';

/**
 * Normalizes string for fingerprinting by stripping special characters and converting to lowercase
 */
export function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Generates deterministic deduplication keys for a job listing
 */
export function generateJobFingerprint(job: Partial<JobListing>): string {
  const normCompany = normalizeString(job.company || '');
  const normTitle = normalizeString(job.title || '');
  const normLocation = normalizeString(job.city || job.location || '');

  return `fp:${normCompany}_${normTitle}_${normLocation}`;
}

export function generateAllJobFingerprints(job: Partial<JobListing>): string[] {
  const fingerprints: string[] = [];

  if (job.url && job.url.trim().length > 0) {
    try {
      const parsedUrl = new URL(job.url);
      const cleanPath = parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, '');
      fingerprints.push(`url:${cleanPath.toLowerCase()}`);
    } catch {
      fingerprints.push(`url:${job.url.toLowerCase().replace(/\/$/, '')}`);
    }
  }

  const contentFp = generateJobFingerprint(job);
  if (contentFp !== 'fp___') {
    fingerprints.push(contentFp);
  }

  if (job.id && job.id.trim().length > 0) {
    fingerprints.push(`id:${job.id.trim()}`);
  }

  return fingerprints;
}

/**
 * Deduplicates a list of job listings against itself and optional existing DB records
 */
export function deduplicateJobs(
  incomingJobs: JobListing[],
  existingJobs: JobListing[] = []
): { uniqueJobs: JobListing[]; duplicatesRemovedCount: number } {
  const seenFingerprints = new Set<string>();

  // Mark existing database jobs as seen
  for (const existing of existingJobs) {
    const fps = generateAllJobFingerprints(existing);
    fps.forEach((fp) => seenFingerprints.add(fp));
  }

  const uniqueJobs: JobListing[] = [];
  let duplicatesRemovedCount = 0;

  for (const job of incomingJobs) {
    const fps = generateAllJobFingerprints(job);
    const isDuplicate = fps.some((fp) => seenFingerprints.has(fp));

    if (isDuplicate) {
      duplicatesRemovedCount++;
    } else {
      fps.forEach((fp) => seenFingerprints.add(fp));
      uniqueJobs.push(job);
    }
  }

  return {
    uniqueJobs,
    duplicatesRemovedCount,
  };
}
