/**
 * @file src/services/CompanyClassificationService.ts
 * @description Classifies company size, company business type, application source quality,
 * and calculates the evidence-based Company Opportunity Fit score without fabricating employee counts.
 * @architect Clean Architecture - Opportunity Fit Engine
 */

import {
  JobListing,
  CompanySizeCategory,
  CompanyType,
  CompanyOpportunityInfo,
} from '@sentinel/types';

export class CompanyClassificationService {
  /**
   * Classifies company size using verifiable text cues in job descriptions or metadata.
   * If employee count is unverified, strictly defaults to UNKNOWN without inventing numbers.
   */
  public classifyCompanySize(job: JobListing): CompanySizeCategory {
    const text = `${job.company} ${job.description || ''}`.toLowerCase();

    if (/\b(?:1-10|1 - 10|5-10|micro|early[- ]stage startup|seed stage)\b/i.test(text)) {
      return 'MICRO';
    }
    if (/\b(?:11-50|11 - 50|20-50|small team|series a|boutique agency)\b/i.test(text)) {
      return 'SMALL';
    }
    if (/\b(?:51-200|51 - 200|100-200|mid-sized|series b)\b/i.test(text)) {
      return 'MEDIUM';
    }
    if (/\b(?:201-1000|201 - 1000|500-1000|scaleup|scale-up|fast-growing tech company)\b/i.test(text)) {
      return 'SCALEUP';
    }
    if (/\b(?:1001-5000|1000\+|multi-national|large tech company)\b/i.test(text)) {
      return 'LARGE';
    }
    if (/\b(?:5000\+|10,000\+|fortune 500|global enterprise|enterprise corp)\b/i.test(text)) {
      return 'ENTERPRISE';
    }

    // Known Enterprise / Large tech companies
    const knownEnterprises = ['canva', 'atlassian', 'shopify', 'google', 'microsoft', 'amazon', 'opentext', 'zendesk', 'sap'];
    if (knownEnterprises.some((ent) => job.company.toLowerCase().includes(ent))) {
      return 'ENTERPRISE';
    }

    return 'UNKNOWN';
  }

  /**
   * Classifies company type (SaaS, Startup, Agency, Product, HealthTech, FinTech, etc.)
   */
  public classifyCompanyType(job: JobListing): CompanyType {
    const text = `${job.company} ${job.description || ''}`.toLowerCase();

    if (/saas|software as a service|b2b software|cloud platform/i.test(text)) return 'SaaS';
    if (/fintech|finance|banking|payments|crypto|trading/i.test(text)) return 'FinTech';
    if (/healthtech|health|medical|biotech|care/i.test(text)) return 'HealthTech';
    if (/agency|consulting|digital studio|client projects|software house/i.test(text)) return 'Agency';
    if (/ecommerce|e-commerce|retail|marketplace|shopping/i.test(text)) return 'ECommerce';
    if (/startup|seed|venture|founding/i.test(text)) return 'Startup';
    if (/remote-first|fully remote|distributed team/i.test(text)) return 'Remote';
    if (/product company|software product/i.test(text)) return 'Product';

    return 'Unknown';
  }

  /**
   * Evaluates application source quality (Direct Career Page > ATS > Aggregator)
   */
  public evaluateSourceQuality(job: JobListing): string {
    const platform = (job.platform || job.source || '').toLowerCase();

    if (platform.includes('career') || platform.includes('company')) {
      return 'Direct Company Career Page';
    }
    if (platform.includes('greenhouse') || platform.includes('lever') || platform.includes('ashby') || platform.includes('workable')) {
      return `Verified ATS (${job.platform})`;
    }
    if (platform.includes('seek') || platform.includes('indeed') || platform.includes('linkedin')) {
      return `Job Board Aggregator (${job.platform})`;
    }
    return 'Job Board Source';
  }

  /**
   * Calculates Company Opportunity Fit score (0-100).
   * Rewards small/medium/startup fits where candidate match is strong, without penalizing large companies.
   */
  public calculateOpportunityFit(
    job: JobListing,
    skillMatchScore: number,
    experienceMatchScore: number
  ): CompanyOpportunityInfo {
    const size = this.classifyCompanySize(job);
    const type = this.classifyCompanyType(job);
    const sourceQuality = this.evaluateSourceQuality(job);

    let baseFit = (skillMatchScore * 0.5) + (experienceMatchScore * 0.5);

    // Small / Startup / Scaleup Fit Bonus when skills & experience match
    let sizeBonus = 0;
    if (size === 'SMALL' || size === 'MICRO' || type === 'Startup') {
      sizeBonus = 8;
    } else if (size === 'MEDIUM' || size === 'SCALEUP') {
      sizeBonus = 5;
    } else if (size === 'ENTERPRISE' || size === 'LARGE') {
      sizeBonus = 2; // Large companies remain attractive for strong matches
    }

    // Direct Career Page / ATS Bonus
    let sourceBonus = 0;
    if (sourceQuality.includes('Direct Company Career Page')) {
      sourceBonus = 6;
    } else if (sourceQuality.includes('Verified ATS')) {
      sourceBonus = 4;
    }

    const opportunityFitScore = Math.min(100, Math.round(baseFit + sizeBonus + sourceBonus));

    const whyParts: string[] = [];
    if (size !== 'UNKNOWN') whyParts.push(`Company size: ${size}`);
    if (type !== 'Unknown') whyParts.push(`Company type: ${type}`);
    whyParts.push(`Source: ${sourceQuality}`);

    return {
      companySize: size,
      companyType: type,
      sourceQuality,
      opportunityFitScore,
      whyOpportunityFit: whyParts.join(' | '),
    };
  }
}

export const companyClassificationService = new CompanyClassificationService();
