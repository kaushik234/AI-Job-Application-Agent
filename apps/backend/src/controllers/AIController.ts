/**
 * @file src/controllers/AIController.ts
 * @description Controller exposing REST API endpoints for all Phase 7 Gemini AI Service features.
 */

import { Request, Response } from 'express';
import { aiService } from '../services/AIService';
import { JobRepository } from '../repositories/JobRepository';
import { ResumeRepository } from '../repositories/ResumeRepository';

export class AIController {
  private jobRepo: JobRepository;
  private resumeRepo: ResumeRepository;

  constructor() {
    this.jobRepo = new JobRepository();
    this.resumeRepo = new ResumeRepository();
  }

  /**
   * POST /api/ai/match - Evaluate resume match percentage, strengths, weaknesses, gaps, and reasons
   */
  public evaluateMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const job = await this.jobRepo.findById(jobId);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job listing not found' });
        return;
      }
      const master = await this.resumeRepo.getMasterResume();
      const result = await aiService.evaluateResumeMatching(master, job);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/ai/tailor - Tailor summary, skills, experience, and keywords
   */
  public tailorResume = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const { tailoredResumeService } = require('../services/TailoredResumeService');
      const result = await tailoredResumeService.generateTailoredResume(jobId);
      res.json({ success: true, data: result.structured, tailoredResume: result.tailoredResume, version: result.version });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/ai/cover-letter - Draft customized cover letter
   */
  public generateCoverLetter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const { coverLetterService } = require('../services/CoverLetterService');
      const result = await coverLetterService.generateCoverLetter(jobId);
      res.json({ success: true, data: result.coverLetter, version: result.version });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/ai/keyword-optimization - ATS keyword optimization and gap analysis
   */
  public optimizeKeywords = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const job = await this.jobRepo.findById(jobId);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job listing not found' });
        return;
      }
      const master = await this.resumeRepo.getMasterResume();
      const result = await aiService.optimizeKeywords(master, job);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/ai/interview-prediction - Technical & behavioral question predictions with STAR outlines
   */
  public predictInterviewQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const job = await this.jobRepo.findById(jobId);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job listing not found' });
        return;
      }
      const master = await this.resumeRepo.getMasterResume();
      const result = await aiService.predictInterviewQuestions(master, job);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/ai/company-research - Company intelligence and interview preparation tips
   */
  public researchCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const { company, jobTitle, jobDescription } = req.body;
      if (!company) {
        res.status(400).json({ success: false, error: 'Company parameter is required' });
        return;
      }
      const result = await aiService.researchCompany(company, jobTitle, jobDescription);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/ai/metrics - Get AI token usage and cost tracking metrics
   */
  public getMetrics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const metrics = aiService.getCostMetrics();
      res.json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/ai/prompt-templates - List prompt templates and versions
   */
  public getPromptTemplates = async (_req: Request, res: Response): Promise<void> => {
    try {
      const templates = aiService.getPromptTemplates();
      res.json({ success: true, data: templates });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/ai/prompt-templates/:name - Update prompt template
   */
  public updatePromptTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const { templateText, version } = req.body;
      const updated = aiService.updatePromptTemplate(name, templateText, version);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
