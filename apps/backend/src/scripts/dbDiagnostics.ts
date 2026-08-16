/**
 * @file src/scripts/dbDiagnostics.ts
 * @description Comprehensive Database Diagnostic Tool calculating exact job counts, employer diversity, provider breakdown, and verification states.
 */

import { db } from '../database';

async function runDiagnostics() {
  const allJobs = await db.getAllJobs();
  const liveJobs = await db.getLiveJobs();

  const totalJobs = allJobs.length;
  const activeVerified = liveJobs.length;

  const demoJobs = allJobs.filter((j) => j.isDemoJob || j.jobStatus === 'DEMO_ONLY' || j.verificationStatus === 'DEMO_ONLY').length;

  const companiesSet = new Set(allJobs.map((j) => j.company).filter(Boolean));
  const providersSet = new Set(allJobs.map((j) => j.platform || j.source).filter(Boolean));

  const providerCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  let openAIJobs = 0;

  for (const job of allJobs) {
    const prov = job.platform || job.source || 'Unknown';
    providerCounts[prov] = (providerCounts[prov] || 0) + 1;

    const status = job.verificationStatus || job.jobStatus || 'DISCOVERED';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if ((job.company || '').toLowerCase().includes('openai')) {
      openAIJobs++;
    }
  }

  console.log('==================================================');
  console.log('SENTINEL AI DATABASE DIAGNOSTIC REPORT');
  console.log('==================================================');
  console.log(`TOTAL JOBS IN DATABASE: ${totalJobs}`);
  console.log(`ACTIVE VERIFIED JOBS: ${activeVerified}`);
  console.log(`DEMO / SYNTHETIC JOBS: ${demoJobs}`);
  console.log(`UNIQUE COMPANIES: ${companiesSet.size}`);
  console.log(`UNIQUE PROVIDERS: ${providersSet.size}`);
  console.log(`OPENAI JOBS: ${openAIJobs} (${((openAIJobs / (totalJobs || 1)) * 100).toFixed(1)}%)`);
  console.log('\n--- PROVIDER BREAKDOWN ---');
  Object.entries(providerCounts).sort((a, b) => b[1] - a[1]).forEach(([prov, count]) => {
    console.log(`${prov}: ${count}`);
  });

  console.log('\n--- VERIFICATION STATUS BREAKDOWN ---');
  Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([st, count]) => {
    console.log(`${st}: ${count}`);
  });
  console.log('==================================================');
}

runDiagnostics().catch(console.error);
