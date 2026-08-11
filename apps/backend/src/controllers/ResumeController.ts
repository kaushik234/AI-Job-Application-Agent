/**
 * @file src/controllers/ResumeController.ts
 * @description Controller handling master resume updates, tailored resume generation, cover letter export, and PDF rendering.
 * @architect Clean Architecture - Controller Layer
 */

import { Request, Response } from 'express';
import { ResumeRepository } from '../repositories/ResumeRepository';
import { JobRepository } from '../repositories/JobRepository';
import { GeminiAIService } from '../services/GeminiAIService';
import { ResumePDFGenerator } from '../resume/ResumePDFGenerator';
import { CoverLetterPDFExporter } from '../coverLetter/CoverLetterPDFExporter';
import { ResumeEngine } from '../resume/ResumeEngine';

export class ResumeController {
  private resumeRepo: ResumeRepository;
  private jobRepo: JobRepository;
  private aiService: GeminiAIService;
  private resumeEngine: ResumeEngine;

  constructor() {
    this.resumeRepo = new ResumeRepository();
    this.jobRepo = new JobRepository();
    this.aiService = new GeminiAIService();
    this.resumeEngine = new ResumeEngine(this.resumeRepo);
  }

  /** GET /api/resume/master - Get Candidate Master Resume */
  public getMasterResume = async (req: Request, res: Response): Promise<void> => {
    try {
      const master = await this.resumeRepo.getMasterResume();
      res.json({ success: true, data: master });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** PUT /api/resume/master - Update Master Resume */
  public updateMasterResume = async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await this.resumeRepo.updateMasterResume(req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/resume/versions/generate - Generate Resume Version (PDF, DOCX, JSON) */
  public generateVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId, jobTitle, company, changeDescription, targetKeywords, customSummary, tailoredPayload } = req.body;
      const version = await this.resumeEngine.generateResumeVersion({
        jobId,
        jobTitle,
        company,
        changeDescription,
        targetKeywords,
        customSummary,
        tailoredPayload,
      });
      res.json({ success: true, data: version });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** GET /api/resume/versions - Get Version History */
  public getVersionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = req.query.jobId as string | undefined;
      const history = await this.resumeEngine.getVersionHistory(jobId);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** GET /api/resume/versions/:id/preview - Get Resume Version Preview */
  public getVersionPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const preview = await this.resumeEngine.getResumePreview(req.params.id);
      res.json({ success: true, data: preview });
    } catch (error) {
      res.status(404).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/resume/versions/compare - Compare Two Resume Versions */
  public compareVersions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { versionIdA, versionIdB } = req.body;
      if (!versionIdA || !versionIdB) {
        res.status(400).json({ success: false, error: 'Both versionIdA and versionIdB are required' });
        return;
      }
      const diff = await this.resumeEngine.compareVersions(versionIdA, versionIdB);
      res.json({ success: true, data: diff });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/resume/versions/:id/rollback - Rollback Master Resume to Version */
  public rollbackVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.resumeEngine.rollbackToVersion(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/resume/tailor - Generate tailored resume and cover letter PDFs for a job */
  public tailorForJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.body;
      const job = await this.jobRepo.findById(jobId);

      if (!job) {
        res.status(404).json({ success: false, error: 'Job not found' });
        return;
      }

      const master = await this.resumeRepo.getMasterResume();

      // Tailor resume payload
      const tailoredPayload = await this.aiService.tailorResume(master, job);
      const { dataUrl: resumePdfDataUrl } = await ResumePDFGenerator.generatePDF(master, {
        ...tailoredPayload,
        id: `res-${job.id}`,
        pdfStoragePath: `/storage/resumes/${job.id}.pdf`,
        generatedAt: new Date().toISOString(),
      });

      const savedResume = await this.resumeRepo.saveTailoredResume({
        ...tailoredPayload,
        id: `res-${job.id}`,
        pdfStoragePath: `/storage/resumes/${job.id}.pdf`,
        pdfDataUrl: resumePdfDataUrl,
        generatedAt: new Date().toISOString(),
      });

      // Cover letter
      const coverLetterPayload = await this.aiService.generateCoverLetter(master, job);
      const { dataUrl: coverPdfDataUrl } = await CoverLetterPDFExporter.generatePDF(master, {
        ...coverLetterPayload,
        id: `cl-${job.id}`,
        pdfStoragePath: `/storage/coverLetters/${job.id}.pdf`,
        generatedAt: new Date().toISOString(),
      });

      const savedCoverLetter = await this.resumeRepo.saveCoverLetter({
        ...coverLetterPayload,
        id: `cl-${job.id}`,
        pdfStoragePath: `/storage/coverLetters/${job.id}.pdf`,
        pdfDataUrl: coverPdfDataUrl,
        generatedAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        tailoredResume: savedResume,
        coverLetter: savedCoverLetter,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
