const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/ai_job_agent.json');
if (!fs.existsSync(dbPath)) {
  console.log('Database file not found:', dbPath);
  process.exit(0);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
let updatedCount = 0;

if (db.jobs && Array.isArray(db.jobs)) {
  for (const job of db.jobs) {
    const url = (job.url || job.canonicalUrl || '').toLowerCase();
    const title = (job.title || '').toLowerCase();

    // Check for known mismatched synthetic URLs
    if (
      url.includes('363ab5a7-499a-48b6-9ed1-ebb44df570a4') ||
      url.includes('541836a1-6d3f-47bf-845f-5f48fe547568') ||
      (job.company === 'Railway' && title.includes('flutter')) ||
      (job.company === 'Axiom' && title.includes('flutter')) ||
      (job.company === 'Sentry' && title.includes('flutter') && url.includes('363ab5a7')) ||
      (job.company === 'Linear' && title.includes('flutter') && url.includes('363ab5a7'))
    ) {
      console.log(`Cleaning mismatched job: ${job.company} - ${job.title} (${job.id})`);
      job.verificationStatus = 'SOURCE_MISMATCH';
      job.jobStatus = 'SOURCE_MISMATCH';
      job.sourceVerified = false;
      job.jobIdentityVerified = false;
      job.applyabilityStatus = 'UNVERIFIED';
      job.verificationReason = 'Database audit: External page title does not match discovered title.';
      updatedCount++;
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Database audit complete. Updated ${updatedCount} records.`);
}
