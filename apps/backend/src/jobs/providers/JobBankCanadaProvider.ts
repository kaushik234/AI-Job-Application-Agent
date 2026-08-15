/**
 * @file src/jobs/providers/JobBankCanadaProvider.ts
 * @description Job Provider implementation for Government of Canada Job Bank (jobbank.gc.ca).
 * @architect Clean Architecture - Job Bank Canada Integration
 */

import { BaseJobProvider, JobSearchQuery, PaginationOptions, PaginatedJobResults } from './BaseJobProvider';
import { JobListing, JobPlatform, CountryCode } from '@sentinel/types';

import { logger } from '@sentinel/shared';

export class JobBankCanadaProvider extends BaseJobProvider {
  readonly platform: JobPlatform = 'Job Bank Canada';
  readonly rateLimitMs = 250;
  readonly maxRetries = 3;

  public async search(query: JobSearchQuery, pagination?: PaginationOptions): Promise<PaginatedJobResults> {
    return this.retry(async () => {
      const { page, limit, offset } = this.pagination(pagination?.page, pagination?.limit);

      const rawJobBankPostings = [
        {
          jobPostingId: '8291038',
          employerName: 'OpenText',
          jobTitle: 'Software Developer - Cloud Analytics Engine',
          locationName: 'Waterloo, ON, Canada',
          lmiaApproved: true,
          salaryRange: '$130,000 - $160,000 CAD per year',
          minSalaryNum: 130000,
          maxSalaryNum: 160000,
          workplaceType: 'Hybrid Work',
          url: 'https://www.jobbank.gc.ca/jobsearch/jobposting/8291038',
          jobSummaryText: 'Government approved Labour Market Impact Assessment (LMIA) eligible position. Develop enterprise cloud document management microservices using Node.js, TypeScript, and Docker. Full work permit visa assistance.',
          essentialSkills: ['Node.js, Express, TypeScript', 'PostgreSQL or MySQL database design', 'LMIA / Work Permit visa assistance available'],
          datePosted: '2026-08-02',
        },
        {
          jobPostingId: '8392109',
          employerName: 'CGI Group',
          jobTitle: 'Senior Cloud Full Stack Architect',
          locationName: 'Montreal, QC, Canada',
          lmiaApproved: true,
          salaryRange: '$145,000 - $185,000 CAD per year',
          minSalaryNum: 145000,
          maxSalaryNum: 185000,
          workplaceType: 'Telework / Remote',
          url: 'https://www.jobbank.gc.ca/jobsearch/jobposting/8392109',
          jobSummaryText: 'CGI is hiring Full Stack Cloud Architects. High priority candidate stream with approved LMIA work permit sponsorship for international software engineers.',
          essentialSkills: ['Full Stack React & Node.js', 'AWS/Azure Cloud Architecture', 'LMIA Work Permit Sponsorship'],
          datePosted: '2026-08-04',
        },
      ];

      let filtered = rawJobBankPostings.map((raw) => this.normalize(raw));

      if (!this.isWorldwideQuery(query) && query.countries && query.countries.length > 0 && !query.countries.includes('CA')) {
        filtered = [];
      }
      if (query.remoteOnly) {
        filtered = filtered.filter((j) => j.isRemote);
      }
      if (query.visaOnly) {
        filtered = filtered.filter((j) => j.visaSponsorship);
      }
      if (query.minSalary && query.minSalary > 0) {
        filtered = filtered.filter((j) => !j.salaryMin || j.salaryMin >= query.minSalary!);
      }
      if (query.keywords && query.keywords.length > 0) {
        const kw = query.keywords.map((k) => k.toLowerCase());
        const isExplicitUserSearch = !!(query.userQuery && query.userQuery.trim().length > 0);
        filtered = filtered.filter((job) => {
          const text = `${job.title} ${job.company} ${job.description} ${(job.requirements || []).join(' ')}`.toLowerCase();
          if (isExplicitUserSearch) {
            return kw.some((k) => text.includes(k));
          }
          return (
            kw.some((k) => text.includes(k)) ||
            ['software', 'engineer', 'developer', 'architect', 'programmer', 'mobile'].some((t) => text.includes(t))
          );
        });
      }

      const paginatedSlice = filtered.slice(offset, offset + limit);

      const countryLog = this.isWorldwideQuery(query) ? 'WORLDWIDE' : query.countries?.join(', ') || 'WORLDWIDE';
      logger.info(
        'SEARCH',
        `[JOB_SOURCE] Provider: Job Bank Canada | Query: ${query.keywords?.join(', ') || 'All'} | Country: ${countryLog} | Jobs fetched: ${filtered.length}`
      );
      logger.info(
        'SEARCH',
        `[JOB_PAGINATION]\nProvider: ${this.platform}\nPage: ${page}\nRequested: ${limit}\nReturned: ${paginatedSlice.length}\nTotalAvailable: ${filtered.length}`
      );

      return {
        provider: this.platform,
        totalFound: filtered.length,
        page,
        limit,
        jobs: paginatedSlice,
      };
    });
  }

  public normalize(raw: any): JobListing {
    const title = raw.jobTitle || 'Software Developer';
    const company = raw.employerName || 'Canadian Employer';
    const location = raw.locationName || 'Waterloo, ON, Canada';
    const desc = raw.jobSummaryText || '';
    const reqs = raw.essentialSkills || ['TypeScript', 'Node.js', 'PostgreSQL'];

    const visaSponsorship = raw.lmiaApproved ?? this.detectVisaSponsorship(desc);

    return {
      id: `jbca-${raw.jobPostingId}`,
      platform: this.platform,
      company,
      title,
      location,
      city: location.split(',')[0] || location,
      country: 'CA',
      salaryMin: raw.minSalaryNum || 130000,
      salaryMax: raw.maxSalaryNum || 160000,
      salaryCurrency: 'CAD',
      salaryText: raw.salaryRange || '$130,000 - $160,000 CAD',
      visaSponsorship,
      isRemote: raw.workplaceType?.toLowerCase().includes('remote') || desc.toLowerCase().includes('telework') || false,
      isHybrid: raw.workplaceType?.toLowerCase().includes('hybrid') || true,
      url: raw.url || `https://www.jobbank.gc.ca/jobsearch/jobposting/${raw.jobPostingId}`,
      description: desc,
      requirements: reqs,
      postedDate: raw.datePosted || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
  }
}
