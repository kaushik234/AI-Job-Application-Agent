/**
 * @file src/jobs/utils/dateNormalizer.ts
 * @description Shared date normalization and job freshness classification utility.
 * Standardizes provider posting dates without fabricating data.
 */

import { FreshnessCategory } from '@sentinel/types';

/**
 * Normalizes a raw date input from job board providers into YYYY-MM-DD.
 * Returns null if the date is missing, unstated, or unparseable.
 * NEVER invents or fabricates dates.
 */
export function normalizePostingDate(rawDate?: string | number | null): string | null {
  if (!rawDate) return null;

  if (typeof rawDate === 'number') {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
      return d.toISOString().split('T')[0];
    }
    return null;
  }

  const str = String(rawDate).trim();
  if (!str) return null;

  const lower = str.toLowerCase();

  // Relative dates
  if (lower.includes('today') || lower.includes('just posted') || lower.includes('hours ago') || lower.includes('hour ago')) {
    return new Date().toISOString().split('T')[0];
  }

  if (lower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch && daysAgoMatch[1]) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  const weeksAgoMatch = lower.match(/(\d+)\s*weeks?\s*ago/);
  if (weeksAgoMatch && weeksAgoMatch[1]) {
    const weeks = parseInt(weeksAgoMatch[1], 10);
    const d = new Date();
    d.setDate(d.getDate() - weeks * 7);
    return d.toISOString().split('T')[0];
  }

  const monthsAgoMatch = lower.match(/(\d+)\s*months?\s*ago/);
  if (monthsAgoMatch && monthsAgoMatch[1]) {
    const months = parseInt(monthsAgoMatch[1], 10);
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().split('T')[0];
  }

  // ISO / Standard dates
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Classifies a job's freshness category strictly based on its postedDate.
 * Categories:
 * - VERY_RECENT: <= 7 days
 * - RECENT: <= 14 days
 * - FRESH: <= 30 days
 * - STALE: > 30 days
 * - UNKNOWN: posting date unavailable
 */
export function classifyFreshnessCategory(postedDate?: string | null): FreshnessCategory {
  if (!postedDate) return 'UNKNOWN';

  const date = new Date(postedDate);
  if (isNaN(date.getTime())) return 'UNKNOWN';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Future date guard
    return 'VERY_RECENT';
  }

  if (diffDays <= 7) return 'VERY_RECENT';
  if (diffDays <= 14) return 'RECENT';
  if (diffDays <= 30) return 'FRESH';
  return 'STALE';
}
