/**
 * @file src/services/__tests__/AIService.spec.ts
 * @description Comprehensive unit tests for Phase 7 AI Service (Gemini 2.5 Pro / 3.1 Pro integration).
 */

import { AIService } from '../AIService';
import { PromptTemplateManager } from '../ai/PromptTemplateManager';
import { AICacheManager } from '../ai/AICacheManager';
import { AIRateLimiterAndCostTracker } from '../ai/AIRateLimiterAndCostTracker';
import { JobListing, MasterResume } from '@sentinel/types';

describe('Phase 7: AI Service Unit Tests', () => {
  let aiService: AIService;

  const mockJob: JobListing = {
    id: 'job-test-101',
    platform: 'Greenhouse',
    company: 'Canva',
    title: 'Senior Backend Engineer',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'AU',
    salaryMin: 160000,
    salaryMax: 200000,
    salaryCurrency: 'AUD',
    visaSponsorship: true,
    isRemote: true,
    isHybrid: false,
    url: 'https://boards.greenhouse.io/canva/jobs/101',
    description: 'We are seeking a Senior Backend Engineer proficient in TypeScript, Node.js, distributed microservices, and Docker.',
    requirements: ['7+ years experience', 'TypeScript & Node.js', 'Distributed Systems', 'Cloud Native (AWS/GCP)'],
    postedDate: '2026-08-01',
    createdAt: '2026-08-01T00:00:00Z',
  };

  const mockMasterResume: MasterResume = {
    fullName: 'Kaushik Khandhala',
    email: 'khandhalakaushik234@gmail.com',
    phone: '+61 400 123 456',
    location: 'Melbourne, Australia',
    linkedIn: 'https://linkedin.com/in/kaushikkhandhala',
    github: 'https://github.com/kaushikkhandhala',
    portfolio: 'https://kaushik.dev',
    summary: 'Senior Full Stack & Cloud Architect with 7+ years of experience engineering high-scale distributed systems, microservices, and React/Node.js web platforms.',
    skills: {
      languages: ['TypeScript', 'JavaScript', 'Python'],
      frameworks: ['Node.js', 'Express', 'React', 'NestJS'],
      cloudAndDevOps: ['GCP', 'AWS', 'Docker', 'Kubernetes', 'CI/CD'],
      databases: ['PostgreSQL', 'Redis', 'MongoDB'],
      tools: ['Git', 'Jest', 'Webpack'],
    },
    experience: [
      {
        company: 'Apex Cloud',
        role: 'Senior Software Engineer',
        location: 'Sydney, AU',
        startDate: '2022-01',
        endDate: 'Present',
        highlights: [
          'Architected distributed microservices serving 5M daily active users.',
          'Reduced API latency by 45% using Redis caching and TypeScript backend optimizations.',
        ],
        technologiesUsed: ['TypeScript', 'Node.js', 'GCP', 'PostgreSQL'],
      },
    ],
    education: [
      {
        institution: 'University of Sydney',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        graduationYear: '2019',
      },
    ],
    certifications: ['AWS Certified Solutions Architect'],
    projects: [
      {
        title: 'Distributed Scraping Engine',
        description: 'Scalable multi-provider scraper built with TypeScript.',
        technologies: ['TypeScript', 'Node.js', 'Prisma'],
      },
    ],
  };

  beforeEach(() => {
    aiService = new AIService();
  });

  describe('Function 1: Resume Matching (Gemini 2.5 Pro Engine)', () => {
    it('should return complete match result with Match %, Strengths, Weaknesses, Missing Skills, Keyword Analysis, Resume Improvements, and Reasons', async () => {
      const matchResult = await aiService.evaluateResumeMatching(mockMasterResume, mockJob);

      expect(matchResult).toBeDefined();
      expect(matchResult.jobId).toBe(mockJob.id);
      expect(matchResult.matchPercentage).toBeGreaterThanOrEqual(0);
      expect(matchResult.matchPercentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(matchResult.strengths)).toBe(true);
      expect(matchResult.strengths.length).toBeGreaterThan(0);
      expect(Array.isArray(matchResult.weaknesses)).toBe(true);
      expect(Array.isArray(matchResult.missingSkills)).toBe(true);
      expect(Array.isArray(matchResult.reasons)).toBe(true);
      expect(matchResult.reasons.length).toBeGreaterThan(0);

      // Verify Keyword Analysis output
      expect(matchResult.keywordAnalysis).toBeDefined();
      expect(Array.isArray(matchResult.keywordAnalysis?.matchedKeywords)).toBe(true);
      expect(Array.isArray(matchResult.keywordAnalysis?.missingKeywords)).toBe(true);
      expect(typeof matchResult.keywordAnalysis?.keywordDensityScore).toBe('number');

      // Verify Resume Improvements output
      expect(Array.isArray(matchResult.resumeImprovements)).toBe(true);
      expect(matchResult.resumeImprovements?.length).toBeGreaterThan(0);

      expect(['STRONG_MATCH', 'MATCH', 'MODERATE_MATCH', 'PARTIAL_MATCH', 'WEAK_MATCH', 'SKIP']).toContain(matchResult.recommendation);
    });
  });

  describe('Function 2: Resume Tailoring', () => {
    it('should return tailored summary, prioritized skills, reorganized experience, and optimized keywords', async () => {
      const tailored = await aiService.tailorResume(mockMasterResume, mockJob);

      expect(tailored).toBeDefined();
      expect(tailored.jobId).toBe(mockJob.id);
      expect(tailored.company).toBe(mockJob.company);
      expect(tailored.customSummary).toContain('Senior');
      expect(Array.isArray(tailored.prioritizedSkills)).toBe(true);
      expect(Array.isArray(tailored.reorganizedExperience)).toBe(true);
      expect(Array.isArray(tailored.keywordsOptimized)).toBe(true);
    });
  });

  describe('Function 3: Cover Letter Generation', () => {
    it('should generate structured cover letter with salutation, content paragraphs, and closing', async () => {
      const coverLetter = await aiService.generateCoverLetter(mockMasterResume, mockJob);

      expect(coverLetter).toBeDefined();
      expect(coverLetter.companyName).toBe(mockJob.company);
      expect(coverLetter.jobTitle).toBe(mockJob.title);
      expect(coverLetter.salutation).toBeDefined();
      expect(Array.isArray(coverLetter.contentParagraphs)).toBe(true);
      expect(coverLetter.contentParagraphs.length).toBeGreaterThanOrEqual(3);
      expect(coverLetter.closing).toBeDefined();
    });
  });

  describe('Function 4: Keyword Optimization', () => {
    it('should perform ATS keyword gap analysis and return match score and optimization tips', async () => {
      const result = await aiService.optimizeKeywords(mockMasterResume, mockJob);

      expect(result).toBeDefined();
      expect(result.jobId).toBe(mockJob.id);
      expect(result.keywordMatchScore).toBeGreaterThanOrEqual(0);
      expect(result.keywordMatchScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.presentKeywords)).toBe(true);
      expect(Array.isArray(result.missingKeywords)).toBe(true);
      expect(Array.isArray(result.optimizationTips)).toBe(true);
      expect(typeof result.relevanceScores).toBe('object');
    });
  });

  describe('Function 5: Interview Prediction', () => {
    it('should predict technical and behavioral interview questions with STAR responses', async () => {
      const prediction = await aiService.predictInterviewQuestions(mockMasterResume, mockJob);

      expect(prediction).toBeDefined();
      expect(prediction.company).toBe(mockJob.company);
      expect(Array.isArray(prediction.technicalQuestions)).toBe(true);
      expect(prediction.technicalQuestions.length).toBeGreaterThan(0);
      expect(prediction.technicalQuestions[0].question).toBeDefined();
      expect(prediction.technicalQuestions[0].sampleAnswerOutline).toBeDefined();

      expect(Array.isArray(prediction.behavioralQuestions)).toBe(true);
      expect(prediction.behavioralQuestions[0].suggestedStarResponse.situation).toBeDefined();
      expect(prediction.behavioralQuestions[0].suggestedStarResponse.action).toBeDefined();
      expect(Array.isArray(prediction.overallPreparationFocus)).toBe(true);
    });
  });

  describe('Function 6: Company Research', () => {
    it('should generate company intelligence including tech stack, culture, visa track record, and tips', async () => {
      const research = await aiService.researchCompany('Atlassian', 'Senior Backend Engineer');

      expect(research).toBeDefined();
      expect(research.company).toBe('Atlassian');
      expect(research.industry).toBeDefined();
      expect(Array.isArray(research.techStack)).toBe(true);
      expect(Array.isArray(research.engineeringCultureHighlights)).toBe(true);
      expect(research.visaSponsorshipTrackRecord).toBeDefined();
      expect(Array.isArray(research.recentCompanyInsights)).toBe(true);
      expect(Array.isArray(research.interviewPreparationTips)).toBe(true);
    });
  });

  describe('Prompt Versioning & Templates', () => {
    it('should maintain registered prompt templates and allow version updates', () => {
      const manager = new PromptTemplateManager();
      const templates = manager.getAllTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(6);

      const matchingTemplate = manager.getTemplate('resume_matching');
      expect(matchingTemplate.version).toBeDefined();

      const updated = manager.updateTemplate('resume_matching', 'Updated prompt text', 'v2.0.0');
      expect(updated.version).toBe('v2.0.0');
      expect(updated.templateText).toBe('Updated prompt text');
    });

    it('should correctly render templates with interpolated variables', () => {
      const manager = new PromptTemplateManager();
      const rendered = manager.render('company_research', {
        company: 'Stripe',
        jobTitle: 'Staff Engineer',
        jobDescription: 'Building global financial infrastructure.',
      });

      expect(rendered.prompt).toContain('COMPANY NAME: Stripe');
      expect(rendered.prompt).toContain('JOB TITLE: Staff Engineer');
      expect(rendered.version).toBeDefined();
    });
  });

  describe('Caching Strategy', () => {
    it('should generate deterministic keys and support cache hit/miss tracking', () => {
      const cache = new AICacheManager();
      const key1 = cache.generateKey('resume_matching', 'v1.2.0', { jobId: '101' });
      const key2 = cache.generateKey('resume_matching', 'v1.2.0', { jobId: '101' });

      expect(key1).toBe(key2);
      expect(cache.get(key1)).toBeNull();

      cache.set(key1, { matchPercentage: 90 });
      const hit = cache.get<{ matchPercentage: number }>(key1);

      expect(hit).toEqual({ matchPercentage: 90 });

      const stats = cache.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });
  });

  describe('Rate Limiting & Cost Tracking', () => {
    it('should track token usage and calculate USD cost estimations', () => {
      const tracker = new AIRateLimiterAndCostTracker(30);
      const costPro = tracker.recordUsage(1000, 500, 'gemini-3.1-pro-preview');

      expect(costPro).toBeGreaterThan(0);

      const metrics = tracker.getMetrics(2, 5);
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.totalInputTokens).toBe(1000);
      expect(metrics.totalOutputTokens).toBe(500);
      expect(metrics.cacheHitCount).toBe(2);
      expect(metrics.cacheMissCount).toBe(5);
    });

    it('should execute functions through exponential backoff retry handler', async () => {
      const tracker = new AIRateLimiterAndCostTracker(30);
      let attempts = 0;

      const result = await tracker.executeWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Transient rate limit error');
        }
        return 'Success';
      }, 3, 10);

      expect(result).toBe('Success');
      expect(attempts).toBe(2);
    });
  });
});
