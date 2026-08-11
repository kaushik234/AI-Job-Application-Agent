/**
 * @file src/controllers/CoverLetterController.ts
 * @description Controller handling endpoints for Phase 9 Cover Letter Generator, history, preview, comparison diffs, and rollback.
 * @architect Clean Architecture - API Controller Layer
 */

import { Request, Response } from 'express';
import { CoverLetterEngine } from '../coverLetter/CoverLetterEngine';

export class CoverLetterController {
  private coverLetterEngine: CoverLetterEngine;

  constructor(coverLetterEngine: CoverLetterEngine = new CoverLetterEngine()) {
    this.coverLetterEngine = coverLetterEngine;
  }

  /** POST /api/coverletter/generate - Generate Personalized Cover Letter (PDF, DOCX, JSON) */
  public generate = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        jobId,
        companyName,
        jobTitle,
        jobDescription,
        relevantExperience,
        techStack,
        salutation,
        customParagraphs,
        closing,
      } = req.body;

      if (!companyName || !jobTitle) {
        res.status(400).json({
          success: false,
          error: 'companyName and jobTitle are required parameters',
        });
        return;
      }

      const version = await this.coverLetterEngine.generateCoverLetter({
        jobId,
        companyName,
        jobTitle,
        jobDescription,
        relevantExperience,
        techStack,
        salutation,
        customParagraphs,
        closing,
      });

      res.json({ success: true, data: version });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** GET /api/coverletter/history - Get Cover Letter Version History */
  public getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = req.query.jobId as string | undefined;
      const companyName = req.query.companyName as string | undefined;

      const history = await this.coverLetterEngine.getHistory({ jobId, companyName });
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** GET /api/coverletter/versions/:id/preview - Get Cover Letter Preview */
  public getPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const preview = await this.coverLetterEngine.getPreview(req.params.id);
      res.json({ success: true, data: preview });
    } catch (error) {
      res.status(404).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/coverletter/versions/compare - Compare Two Cover Letter Versions */
  public compare = async (req: Request, res: Response): Promise<void> => {
    try {
      const { versionIdA, versionIdB } = req.body;
      if (!versionIdA || !versionIdB) {
        res.status(400).json({
          success: false,
          error: 'Both versionIdA and versionIdB are required',
        });
        return;
      }

      const diff = await this.coverLetterEngine.compareVersions(versionIdA, versionIdB);
      res.json({ success: true, data: diff });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/coverletter/versions/:id/rollback - Rollback Active Cover Letter */
  public rollback = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.coverLetterEngine.rollbackToVersion(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
