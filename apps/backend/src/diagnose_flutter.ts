import { AshbyProvider } from './jobs/providers/AshbyProvider';
import { GreenhouseProvider } from './jobs/providers/GreenhouseProvider';
import { LeverProvider } from './jobs/providers/LeverProvider';
import { JobVerificationService } from './services/JobVerificationService';

async function diagnose() {
  process.env.NODE_ENV = 'development';
  console.log('=== STARTING LIVE FLUTTER PROVIDER DIAGNOSIS ===');

  const ashby = new AshbyProvider();
  const gh = new GreenhouseProvider();
  const lever = new LeverProvider();
  const verifier = new JobVerificationService();

  console.log('\n--- ASHBY ALL RAW JOBS SCAN ---');
  const allAshbyRes = await ashby.search({ countries: ['ALL'] } as any);
  console.log(`Ashby total raw jobs fetched: ${allAshbyRes.totalFound}`);
  
  const ashbyFlutterJobs = allAshbyRes.jobs.filter(j => {
    const text = `${j.title} ${j.company} ${j.description}`.toLowerCase();
    return text.includes('flutter');
  });
  console.log(`Ashby raw jobs mentioning 'flutter': ${ashbyFlutterJobs.length}`);
  for (const j of ashbyFlutterJobs) {
    console.log(`- [${j.company}] "${j.title}" (ID: ${j.id}) | URL: ${j.url}`);
    console.log(`  Title contains flutter: ${j.title.toLowerCase().includes('flutter')}`);
  }

  console.log('\n--- GREENHOUSE ALL RAW JOBS SCAN ---');
  const allGhRes = await gh.search({ countries: ['ALL'] } as any);
  console.log(`Greenhouse total raw jobs fetched: ${allGhRes.totalFound}`);
  const ghFlutterJobs = allGhRes.jobs.filter(j => {
    const text = `${j.title} ${j.company} ${j.description}`.toLowerCase();
    return text.includes('flutter');
  });
  console.log(`Greenhouse raw jobs mentioning 'flutter': ${ghFlutterJobs.length}`);

  console.log('\n--- LEVER ALL RAW JOBS SCAN ---');
  const allLeverRes = await lever.search({ countries: ['ALL'] } as any);
  console.log(`Lever total raw jobs fetched: ${allLeverRes.totalFound}`);
  const leverFlutterJobs = allLeverRes.jobs.filter(j => {
    const text = `${j.title} ${j.company} ${j.description}`.toLowerCase();
    return text.includes('flutter');
  });
  console.log(`Lever raw jobs mentioning 'flutter': ${leverFlutterJobs.length}`);
}

diagnose().catch((err) => console.error(err));
