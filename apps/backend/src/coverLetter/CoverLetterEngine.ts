/**
 * @file src/coverLetter/CoverLetterEngine.ts
 * @description Core Cover Letter Generator Engine for personalized, single-page, multi-format (PDF/DOCX/JSON) cover letters with version history, diffing, and rollback.
 * @architect Clean Architecture - Cover Letter Service Engine
 */

import { CoverLetterPDFExporter } from './CoverLetterPDFExporter';
import { CoverLetterDOCXExporter } from './CoverLetterDOCXExporter';
import { ResumeRepository } from '../repositories/ResumeRepository';
import {
  MasterResume,
  CoverLetter,
  CoverLetterVersion,
  CoverLetterDiff,
  CoverLetterRollbackResult,
} from '@sentinel/types';
import { logger } from '@sentinel/shared';

export interface GenerateCoverLetterOptions {
  jobId?: string;
  companyName: string;
  jobTitle: string;
  jobDescription?: string;
  relevantExperience?: string[];
  techStack?: string[];
  salutation?: string;
  customParagraphs?: string[];
  closing?: string;
}

export class CoverLetterEngine {
  private resumeRepo: ResumeRepository;

  constructor(resumeRepo: ResumeRepository = new ResumeRepository()) {
    this.resumeRepo = resumeRepo;
  }

  /**
   * Generates a personalized single-page cover letter mentioning Company, Position, Relevant Experience, and Tech Stack.
   * Renders PDF, DOCX, and JSON representations, storing it as a tracked CoverLetterVersion.
   */
  public async generateCoverLetter(
    options: GenerateCoverLetterOptions
  ): Promise<CoverLetterVersion> {
    const master = await this.resumeRepo.getMasterResume();

    // 1. Identify relevant candidate tech stack
    const candidateSkills = Array.from(
      new Set([
        ...master.skills.languages,
        ...master.skills.frameworks,
        ...master.skills.cloudAndDevOps,
        ...master.skills.databases,
      ])
    );

    const techStackMentioned = options.techStack && options.techStack.length > 0
      ? options.techStack
      : candidateSkills.slice(0, 6);

    // 2. Identify relevant experience
    const relevantExp = options.relevantExperience && options.relevantExperience.length > 0
      ? options.relevantExperience
      : master.experience.slice(0, 2).map((e) => `${e.role} at ${e.company} (${e.startDate} - ${e.endDate})`);

    // 3. Construct single-page paragraph content explicitly mentioning company, position, experience, & tech stack
    let contentParagraphs = options.customParagraphs;

    if (!contentParagraphs || contentParagraphs.length === 0) {
      const p1 = `I am writing to express my enthusiastic interest in the ${options.jobTitle} position at ${options.companyName}. With a proven background in engineering high-throughput, resilient software systems, I am confident in my ability to deliver immediate value to ${options.companyName}'s engineering team.`;

      const p2 = `Throughout my career, my relevant experience includes serving as ${relevantExp[0]}. In this role, I led full-lifecycle backend and frontend initiatives, optimizing response latencies and automating infrastructure deployments. My experience as ${relevantExp[1] || 'a Lead Systems Developer'} further solidified my capability in architecting mission-critical platforms.`;

      const p3 = `My core technology stack directly aligns with your requirements, prominently featuring ${techStackMentioned.join(', ')}. I thrive in high-velocity environments where engineering excellence, clean code standards, and robust continuous integration drive product outcomes.`;

      const p4 = `Thank you for reviewing my application for the ${options.jobTitle} role. I look forward to the opportunity to discuss how my technical expertise and passion for building scalable solutions will benefit ${options.companyName}.`;

      contentParagraphs = [p1, p2, p3, p4];
    }

    const salutation = options.salutation || `Dear ${options.companyName} Hiring Committee,`;
    const closing = options.closing || 'Sincerely,';

    const coverLetterModel: CoverLetter = {
      id: `cl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobId: options.jobId || 'general',
      companyName: options.companyName,
      jobTitle: options.jobTitle,
      salutation,
      contentParagraphs,
      closing,
      pdfStoragePath: `/cover_letters/${options.companyName.toLowerCase().replace(/\s+/g, '_')}_letter.pdf`,
      generatedAt: new Date().toISOString(),
    };

    // 4. Render PDF (pdf-lib)
    const { dataUrl: pdfDataUrl } = await CoverLetterPDFExporter.generatePDF(
      master,
      coverLetterModel
    );

    // 5. Render DOCX (docx library)
    const { base64: docxBase64 } = await CoverLetterDOCXExporter.generateDOCX(
      master,
      coverLetterModel
    );

    // 6. Form JSON representation
    const jsonRepresentation = {
      masterCandidate: {
        fullName: master.fullName,
        email: master.email,
        phone: master.phone,
      },
      coverLetter: coverLetterModel,
      mentions: {
        companyName: options.companyName,
        jobTitle: options.jobTitle,
        relevantExperience: relevantExp,
        techStack: techStackMentioned,
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };

    // 7. Generate Version Tag
    const existingVersions = await this.resumeRepo.getAllCoverLetterVersions();
    const versionNumber = existingVersions.length + 1;
    const versionTag = `v${versionNumber}.0`;

    const versionRecord: CoverLetterVersion = {
      id: `cl_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      versionTag,
      jobId: options.jobId,
      jobTitle: options.jobTitle,
      companyName: options.companyName,
      salutation,
      relevantExperienceMentioned: relevantExp,
      techStackMentioned,
      contentParagraphs,
      closing,
      formats: {
        pdfDataUrl,
        docxBase64,
        jsonRepresentation,
      },
      createdAt: new Date().toISOString(),
    };

    // 8. Persist to storage
    await this.resumeRepo.saveCoverLetterVersion(versionRecord);
    await this.resumeRepo.saveCoverLetter(coverLetterModel);

    logger.success('RESUME_GEN', `Created Cover Letter Version ${versionTag} for ${options.companyName}`, {
      versionId: versionRecord.id,
    });

    return versionRecord;
  }

  /**
   * Retrieves all cover letter versions, optionally filtered by jobId or company
   */
  public async getHistory(filter?: { jobId?: string; companyName?: string }): Promise<CoverLetterVersion[]> {
    const all = await this.resumeRepo.getAllCoverLetterVersions();
    if (!filter) return all;

    return all.filter((v) => {
      const matchJob = filter.jobId ? v.jobId === filter.jobId : true;
      const matchComp = filter.companyName
        ? v.companyName.toLowerCase().includes(filter.companyName.toLowerCase())
        : true;
      return matchJob && matchComp;
    });
  }

  /**
   * Retrieves structured preview payload for a cover letter version
   */
  public async getPreview(versionId: string): Promise<{
    version: CoverLetterVersion;
    companyName: string;
    jobTitle: string;
    contentParagraphs: string[];
    techStackMentioned: string[];
    relevantExperienceMentioned: string[];
    formats: CoverLetterVersion['formats'];
  }> {
    const version = await this.resumeRepo.getCoverLetterVersionById(versionId);
    if (!version) {
      throw new Error(`Cover letter version with ID "${versionId}" not found`);
    }

    return {
      version,
      companyName: version.companyName,
      jobTitle: version.jobTitle,
      contentParagraphs: version.contentParagraphs,
      techStackMentioned: version.techStackMentioned,
      relevantExperienceMentioned: version.relevantExperienceMentioned,
      formats: version.formats,
    };
  }

  /**
   * Compares two cover letter versions and returns a detailed diff report
   */
  public async compareVersions(versionIdA: string, versionIdB: string): Promise<CoverLetterDiff> {
    const verA = await this.resumeRepo.getCoverLetterVersionById(versionIdA);
    const verB = await this.resumeRepo.getCoverLetterVersionById(versionIdB);

    if (!verA || !verB) {
      throw new Error('One or both specified cover letter versions were not found');
    }

    // Paragraph Diffs
    const maxParagraphs = Math.max(verA.contentParagraphs.length, verB.contentParagraphs.length);
    const paragraphDiffs = [];

    for (let i = 0; i < maxParagraphs; i++) {
      const paraA = verA.contentParagraphs[i] || '';
      const paraB = verB.contentParagraphs[i] || '';
      paragraphDiffs.push({
        index: i,
        paragraphA: paraA,
        paragraphB: paraB,
        changed: paraA !== paraB,
      });
    }

    // Tech Stack Diff
    const setTechA = new Set(verA.techStackMentioned);
    const setTechB = new Set(verB.techStackMentioned);

    const techStackDiff = {
      addedInB: verB.techStackMentioned.filter((t) => !setTechA.has(t)),
      removedInB: verA.techStackMentioned.filter((t) => !setTechB.has(t)),
      retained: verB.techStackMentioned.filter((t) => setTechA.has(t)),
    };

    // Experience Mentioned Diff
    const setExpA = new Set(verA.relevantExperienceMentioned);
    const setExpB = new Set(verB.relevantExperienceMentioned);

    const experienceDiff = {
      addedInB: verB.relevantExperienceMentioned.filter((e) => !setExpA.has(e)),
      removedInB: verA.relevantExperienceMentioned.filter((e) => !setExpB.has(e)),
      retained: verB.relevantExperienceMentioned.filter((e) => setExpA.has(e)),
    };

    return {
      versionIdA: verA.id,
      versionTagA: verA.versionTag,
      versionIdB: verB.id,
      versionTagB: verB.versionTag,
      companyNameA: verA.companyName,
      companyNameB: verB.companyName,
      jobTitleA: verA.jobTitle,
      jobTitleB: verB.jobTitle,
      paragraphDiffs,
      techStackDiff,
      experienceDiff,
    };
  }

  /**
   * Rolls back candidate active cover letter to a historic version snapshot
   */
  public async rollbackToVersion(versionId: string): Promise<CoverLetterRollbackResult> {
    const targetVersion = await this.resumeRepo.getCoverLetterVersionById(versionId);
    if (!targetVersion) {
      throw new Error(`Target cover letter rollback version "${versionId}" not found`);
    }

    const restoredCoverLetter: CoverLetter = {
      id: `cl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobId: targetVersion.jobId || 'general',
      companyName: targetVersion.companyName,
      jobTitle: targetVersion.jobTitle,
      salutation: targetVersion.salutation,
      contentParagraphs: targetVersion.contentParagraphs,
      closing: targetVersion.closing,
      pdfStoragePath: `/cover_letters/${targetVersion.companyName.toLowerCase().replace(/\s+/g, '_')}_restored.pdf`,
      pdfDataUrl: targetVersion.formats.pdfDataUrl,
      generatedAt: new Date().toISOString(),
    };

    await this.resumeRepo.saveCoverLetter(restoredCoverLetter);

    const allVersions = await this.resumeRepo.getAllCoverLetterVersions();
    const rollbackTag = `v${allVersions.length + 1}.0-rollback`;

    const rollbackVersionRecord: CoverLetterVersion = {
      id: `cl_ver_rb_${Date.now()}`,
      versionTag: rollbackTag,
      jobId: targetVersion.jobId,
      jobTitle: targetVersion.jobTitle,
      companyName: targetVersion.companyName,
      salutation: targetVersion.salutation,
      relevantExperienceMentioned: targetVersion.relevantExperienceMentioned,
      techStackMentioned: targetVersion.techStackMentioned,
      contentParagraphs: targetVersion.contentParagraphs,
      closing: targetVersion.closing,
      formats: targetVersion.formats,
      createdAt: new Date().toISOString(),
    };

    await this.resumeRepo.saveCoverLetterVersion(rollbackVersionRecord);

    logger.success('RESUME_GEN', `Executed Cover Letter Rollback to ${targetVersion.versionTag}`, {
      restoredVersionId: targetVersion.id,
      rollbackTag,
    });

    return {
      success: true,
      restoredVersionId: targetVersion.id,
      currentVersionTag: rollbackTag,
      coverLetter: restoredCoverLetter,
      message: `Successfully rolled back cover letter state to version ${targetVersion.versionTag}`,
    };
  }
}
