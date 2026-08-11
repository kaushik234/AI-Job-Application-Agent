import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SENTINEL database...');

  const hasher = (bcrypt as any).default || bcrypt;
  const passwordHash = await hasher.hash('Password123!', 10);

  const countries = [
    { code: 'AU', name: 'Australia', isTarget: true },
    { code: 'CA', name: 'Canada', isTarget: true },
    { code: 'DE', name: 'Germany', isTarget: true },
    { code: 'US', name: 'United States', isTarget: false },
  ];

  for (const c of countries) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }

  const companies = [
    { name: 'Atlassian', domain: 'atlassian.com', websiteUrl: 'https://atlassian.com', atsPlatform: 'Greenhouse' },
    { name: 'Shopify', domain: 'shopify.com', websiteUrl: 'https://shopify.com', atsPlatform: 'Lever' },
    { name: 'Personio', domain: 'personio.de', websiteUrl: 'https://personio.de', atsPlatform: 'Ashby' },
  ];

  for (const comp of companies) {
    await prisma.company.upsert({
      where: { domain: comp.domain },
      update: comp,
      create: comp,
    });
  }

  const user = await prisma.user.upsert({
    where: { email: 'khandhalakaushik234@gmail.com' },
    update: {
      firstName: 'Kaushik',
      lastName: 'Khandhala',
      role: 'APPLICANT',
      passwordHash,
      skills: ['TypeScript', 'NestJS', 'React', 'Docker', 'PostgreSQL', 'Playwright', 'Google Gemini AI'],
    },
    create: {
      email: 'khandhalakaushik234@gmail.com',
      firstName: 'Kaushik',
      lastName: 'Khandhala',
      role: 'APPLICANT',
      passwordHash,
      skills: ['TypeScript', 'NestJS', 'React', 'Docker', 'PostgreSQL', 'Playwright', 'Google Gemini AI'],
    },
  });

  await prisma.setting.upsert({
    where: { userId: user.id },
    update: {
      dailyApplicationLimit: 15,
      targetCountries: ['AU', 'CA', 'DE'],
      requireHumanApproval: true,
      autoPilotEnabled: true,
    },
    create: {
      userId: user.id,
      dailyApplicationLimit: 15,
      targetCountries: ['AU', 'CA', 'DE'],
      requireHumanApproval: true,
      autoPilotEnabled: true,
    },
  });

  await prisma.resume.create({
    data: {
      userId: user.id,
      title: 'Master Resume 2026',
      fullName: 'Kaushik Khandhala',
      headline: 'Senior Full Stack & Systems Engineer',
      summary: 'Experienced Software Engineer specializing in scalable NestJS, TypeScript, React, PostgreSQL, and automated pipeline engineering.',
      skills: ['TypeScript', 'NestJS', 'React', 'Docker', 'PostgreSQL', 'Playwright', 'Google Gemini AI'],
      isMaster: true,
    },
  });

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
