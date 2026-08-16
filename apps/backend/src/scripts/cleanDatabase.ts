/**
 * @file src/scripts/cleanDatabase.ts
 * @description Purges any legacy demo/synthetic job entries and invalid listings from local JSON storage.
 */

import { db } from '../database';

async function clean() {
  const allJobs = await db.getAllJobs();

  const cleaned = allJobs.filter((j) => {
    const isDemo = j.isDemoJob || j.jobStatus === 'DEMO_ONLY' || j.verificationStatus === 'DEMO_ONLY';
    const idLower = (j.id || '').toLowerCase();
    const companyLower = (j.company || '').toLowerCase();

    const isSynthetic =
      isDemo ||
      idLower.includes('demo') ||
      idLower.includes('mock') ||
      companyLower.includes('demo technologies') ||
      companyLower.includes('company alpha') ||
      companyLower.includes('company beta') ||
      companyLower.includes('factcorp') ||
      companyLower.includes('example corp');

    return !isSynthetic;
  });

  (db as any).data.jobs = [];
  await db.saveJobs(cleaned);

  console.log(`Database cleaned. Remaining valid listings: ${cleaned.length}`);
}

clean().catch(console.error);
