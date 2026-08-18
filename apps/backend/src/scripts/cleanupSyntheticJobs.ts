/**
 * @file src/scripts/cleanupSyntheticJobs.ts
 * @description Script to perform one-time cleanup of synthetic/demo job records from the persistent database file.
 * Preserves user applications, saved jobs, master resume, cover letters, tailored resumes, settings, and analytics.
 */

import fs from 'fs';
import path from 'path';

export function runDatabaseCleanup() {
  const dbPath = path.join(process.cwd(), 'data', 'ai_job_agent.json');
  console.log(`[DB_CLEANUP] Reading database from ${dbPath}...`);

  if (!fs.existsSync(dbPath)) {
    console.log('[DB_CLEANUP] Database file does not exist, nothing to clean.');
    return { beforeCount: 0, removedCount: 0, remainingCount: 0 };
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const data = JSON.parse(raw);
  const jobs: any[] = data.jobs || [];

  const beforeCount = jobs.length;

  const cleanJobs = jobs.filter((j) => {
    const companyLower = (j.company || '').toLowerCase();
    const idLower = (j.id || '').toLowerCase();
    const urlLower = (j.url || j.originalUrl || '').toLowerCase();
    const titleLower = (j.title || '').toLowerCase();

    const locLower = (j.location || '').toLowerCase();

    // Check for country inconsistency (e.g. Seattle, WA vs AU)
    const isUsLocation = locLower.includes('seattle') || locLower.includes('wa') || locLower.includes('san francisco') || locLower.includes('ca') || locLower.includes('austin') || locLower.includes('tx') || locLower.includes('new york') || locLower.includes('ny');
    const isCountryMismatch = (isUsLocation && j.country === 'AU') || (j.company === 'Axiom' && urlLower.includes('ashbyhq.com/sentry'));

    const isSynthetic =
      j.isDemoJob === true ||
      j.jobStatus === 'DEMO_ONLY' ||
      j.verificationStatus === 'DEMO_ONLY' ||
      idLower.startsWith('job-') ||
      idLower.includes('demo') ||
      idLower.includes('mock') ||
      idLower.includes('e2e') ||
      idLower.includes('sample') ||
      idLower.includes('ind-a810') ||
      idLower.includes('li-3910') ||
      idLower.includes('seek-1029') ||
      idLower.includes('careers-canva') ||
      idLower.includes('ashby-e21938') ||
      urlLower.includes('e2e') ||
      urlLower.includes('demo') ||
      companyLower.includes('demo technologies') ||
      companyLower.includes('company alpha') ||
      companyLower.includes('company beta') ||
      companyLower.includes('factcorp') ||
      companyLower.includes('example corp') ||
      companyLower.includes('amazon canada') ||
      companyLower.includes('personio') ||
      isCountryMismatch;

    return !isSynthetic;
  });

  const removedCount = beforeCount - cleanJobs.length;
  const remainingCount = cleanJobs.length;

  data.jobs = cleanJobs;

  // Also clean synthetic entries from matches array if any exist
  if (Array.isArray(data.matches)) {
    data.matches = data.matches.filter((m: any) => cleanJobs.some((j) => j.id === m.jobId));
  }

  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`[DB_CLEANUP] Completed cleanup:`);
  console.log(`  Records before: ${beforeCount}`);
  console.log(`  Synthetic records removed: ${removedCount}`);
  console.log(`  Remaining records: ${remainingCount}`);

  return { beforeCount, removedCount, remainingCount };
}

if (require.main === module) {
  runDatabaseCleanup();
}
