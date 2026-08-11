import { Injectable } from '@nestjs/common';
import { GenerateCoverLetterDto } from './dto/cover-letter.dto';
import { CoverLetterEngine } from '../../coverLetter/CoverLetterEngine';
import { ResumeRepository } from '../../repositories/ResumeRepository';
import { CoverLetterVersion, CoverLetterDiff, CoverLetterRollbackResult } from '@sentinel/types';

@Injectable()
export class CoverLetterService {
  private engine: CoverLetterEngine;
  private resumeRepo: ResumeRepository;

  constructor() {
    this.resumeRepo = new ResumeRepository();
    this.engine = new CoverLetterEngine(this.resumeRepo);
  }

  async generateCoverLetter(dto: GenerateCoverLetterDto): Promise<CoverLetterVersion> {
    const { coverLetterService } = require('../../services/CoverLetterService');
    const result = await coverLetterService.generateCoverLetter(dto.jobId);
    
    return {
      id: result.coverLetter.id,
      versionTag: `v${result.version}`,
      jobId: result.coverLetter.jobId,
      companyName: result.coverLetter.companyName,
      jobTitle: result.coverLetter.jobTitle,
      salutation: result.coverLetter.salutation,
      relevantExperienceMentioned: [],
      techStackMentioned: [],
      contentParagraphs: result.coverLetter.contentParagraphs,
      closing: result.coverLetter.closing,
      content: `${result.coverLetter.salutation}\n\n${result.coverLetter.contentParagraphs.join('\n\n')}\n\n${result.coverLetter.closing}`,
      formats: {
        pdfDataUrl: result.coverLetter.pdfStoragePath,
        docxBase64: '',
        jsonRepresentation: result.coverLetter,
      },
      createdAt: result.coverLetter.generatedAt,
    };
  }

  async getHistory(companyName?: string): Promise<CoverLetterVersion[]> {
    return this.engine.getHistory({ companyName });
  }

  async getPreview(versionId: string) {
    return this.engine.getPreview(versionId);
  }

  async compareVersions(versionIdA: string, versionIdB: string): Promise<CoverLetterDiff> {
    return this.engine.compareVersions(versionIdA, versionIdB);
  }

  async rollbackToVersion(versionId: string): Promise<CoverLetterRollbackResult> {
    return this.engine.rollbackToVersion(versionId);
  }
}
