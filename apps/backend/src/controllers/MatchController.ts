/**
 * @file src/controllers/MatchController.ts
 * @description Controller handling Gemini AI job match evaluation requests.
 * @architect Clean Architecture - Controller Layer
 */

import { Request, Response } from 'express';
import { JobRepository } from '../repositories/JobRepository';
import { ResumeRepository } from '../repositories/ResumeRepository';
import { GeminiAIService } from '../services/GeminiAIService';

export class MatchController {
  private jobRepo: JobRepository;
  private resumeRepo: ResumeRepository;
  private aiService: GeminiAIService;

  constructor() {
    this.jobRepo = new JobRepository();
    this.resumeRepo = new ResumeRepository();
    this.aiService = new GeminiAIService();
  }

  /**
   * POST /api/jobs/:jobId/match - Evaluates AI match percentage and gaps for job
   */
  public evaluateMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = req.params.jobId;
      const job = await this.jobRepo.findById(jobId);

      if (!job) {
        res.status(404).json({ success: false, error: 'Job listing not found' });
        return;
      }

      const masterResume = await this.resumeRepo.getMasterResume();
      const matchResult = await this.aiService.evaluateJobMatch(masterResume, job);

      await this.jobRepo.saveMatchResult(matchResult);

      res.json({ success: true, data: matchResult });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
