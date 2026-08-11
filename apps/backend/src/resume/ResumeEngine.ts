/**
 * @file src/resume/ResumeEngine.ts
 * @description Core Resume Engine managing ATS optimization, non-fabrication reordering, multi-format rendering (PDF/DOCX/JSON), version history, comparison diffing, and rollback.
 * @architect Clean Architecture - Resume Core Engine Service
 */

import { ResumePDFGenerator } from './ResumePDFGenerator';
import { ResumeDOCXGenerator } from './ResumeDOCXGenerator';
import { ResumeRepository } from '../repositories/ResumeRepository';
import {
  MasterResume,
  TailoredResume,
  ResumeVersion,
  ResumeDiff,
  ResumeRollbackResult,
} from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class ResumeEngine {
  private resumeRepo: ResumeRepository;

  constructor(resumeRepo: ResumeRepository = new ResumeRepository()) {
    this.resumeRepo = resumeRepo;
  }

  /**
   * Fetches the current candidate Master Resume
   */
  public async getMasterResume(): Promise<MasterResume> {
    return this.resumeRepo.getMasterResume();
  }

  /**
   * Updates master resume details
   */
  public async updateMasterResume(master: MasterResume): Promise<MasterResume> {
    return this.resumeRepo.updateMasterResume(master);
  }

  /**
   * Reorders candidate skills and experience highlights without fabricating any information.
   * Prioritizes content that matches target job keywords.
   * @param master Master candidate resume
   * @param targetKeywords Target job skill keywords
   */
  public reorderContent(
    master: MasterResume,
    targetKeywords: string[] = []
  ): {
    prioritizedSkills: string[];
    reorganizedExperience: {
      company: string;
      role: string;
      period: string;
      tailoredHighlights: string[];
    }[];
  } {
    const normalizedKeywords = targetKeywords.map((k) => k.toLowerCase().trim());

    // 1. Flatten all candidate skills into a single list
    const allSkills = Array.from(
      new Set([
        ...master.skills.languages,
        ...master.skills.frameworks,
        ...master.skills.cloudAndDevOps,
        ...master.skills.databases,
        ...master.skills.tools,
      ])
    );

    // 2. Reorder skills: matching target keywords first, then remaining existing skills
    const matchingSkills: string[] = [];
    const otherSkills: string[] = [];

    for (const skill of allSkills) {
      const lowerSkill = skill.toLowerCase();
      const isMatch = normalizedKeywords.some(
        (kw) => lowerSkill.includes(kw) || kw.includes(lowerSkill)
      );
      if (isMatch) {
        matchingSkills.push(skill);
      } else {
        otherSkills.push(skill);
      }
    }

    const prioritizedSkills = [...matchingSkills, ...otherSkills];

    // 3. Reorder experience bullet points/highlights without modifying text or fabricating facts
    const reorganizedExperience = master.experience.map((exp) => {
      const highlights = [...exp.highlights];
      // Sort highlights: those containing target keywords go higher up
      highlights.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aMatches = normalizedKeywords.filter((kw) => aLower.includes(kw)).length;
        const bMatches = normalizedKeywords.filter((kw) => bLower.includes(kw)).length;
        return bMatches - aMatches;
      });

      return {
        company: exp.company,
        role: exp.role,
        period: `${exp.startDate} - ${exp.endDate}`,
        tailoredHighlights: highlights,
      };
    });

    return { prioritizedSkills, reorganizedExperience };
  }

  /**
   * Generates a new Resume Version across PDF, DOCX, and JSON formats, storing it in version history.
   */
  public async generateResumeVersion(options: {
    jobId?: string;
    jobTitle?: string;
    company?: string;
    changeDescription?: string;
    targetKeywords?: string[];
    customSummary?: string;
    tailoredPayload?: TailoredResume;
  }): Promise<ResumeVersion> {
    const master = await this.getMasterResume();
    const existingVersions = await this.resumeRepo.getAllVersions();

    // Determine version tag (e.g. v1.0, v1.1)
    const versionNumber = existingVersions.length + 1;
    const versionTag = `v${versionNumber}.0`;

    // Perform non-fabricating reordering if target keywords provided
    const reordered = this.reorderContent(master, options.targetKeywords || []);

    const tailored: TailoredResume = options.tailoredPayload || {
      id: `tailored_${Date.now()}`,
      jobId: options.jobId || 'general',
      jobTitle: options.jobTitle || 'General Application',
      company: options.company || 'General',
      customSummary: options.customSummary || master.summary,
      prioritizedSkills: reordered.prioritizedSkills,
      reorganizedExperience: reordered.reorganizedExperience,
      keywordsOptimized: options.targetKeywords || [],
      pdfStoragePath: `/resumes/${versionTag}.pdf`,
      generatedAt: new Date().toISOString(),
    };

    // 1. Generate PDF via PDF-LIB
    const { dataUrl: pdfDataUrl } = await ResumePDFGenerator.generatePDF(master, tailored);

    // 2. Generate DOCX via docx library
    const { base64: docxBase64 } = await ResumeDOCXGenerator.generateDOCX(master, tailored);

    // 3. Generate JSON representation
    const jsonRepresentation = {
      master,
      tailored,
      meta: {
        versionTag,
        generatedAt: new Date().toISOString(),
        atsKeywordsCount: tailored.keywordsOptimized.length,
      },
    };

    const newVersion: ResumeVersion = {
      id: `res_ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      versionTag,
      jobId: options.jobId,
      jobTitle: options.jobTitle || 'General Application',
      company: options.company || 'General',
      changeDescription: options.changeDescription || `Generated ${versionTag} tailored for ${options.company || 'general target'}`,
      masterSnapshot: master,
      tailoredPayload: tailored,
      formats: {
        pdfDataUrl,
        docxBase64,
        jsonRepresentation,
      },
      createdAt: new Date().toISOString(),
    };

    await this.resumeRepo.saveVersion(newVersion);
    await this.resumeRepo.saveTailoredResume(tailored);

    logger.success('RESUME_GEN', `Created and stored Resume Version ${versionTag}`, {
      versionId: newVersion.id,
      company: newVersion.company,
    });

    return newVersion;
  }

  /**
   * Retrieves version history list for candidate or specific job
   */
  public async getVersionHistory(jobId?: string): Promise<ResumeVersion[]> {
    const all = await this.resumeRepo.getAllVersions();
    if (jobId) {
      return all.filter((v) => v.jobId === jobId);
    }
    return all;
  }

  /**
   * Fetches full preview payload for a given resume version ID
   */
  public async getResumePreview(versionId: string): Promise<{
    version: ResumeVersion;
    summary: string;
    skills: string[];
    experience: any[];
  }> {
    const version = await this.resumeRepo.getVersionById(versionId);
    if (!version) {
      throw new Error(`Resume version with ID "${versionId}" not found`);
    }

    const summary = version.tailoredPayload?.customSummary || version.masterSnapshot.summary;
    const skills =
      version.tailoredPayload?.prioritizedSkills ||
      Array.from(
        new Set([
          ...version.masterSnapshot.skills.languages,
          ...version.masterSnapshot.skills.frameworks,
          ...version.masterSnapshot.skills.cloudAndDevOps,
          ...version.masterSnapshot.skills.databases,
        ])
      );
    const experience =
      version.tailoredPayload?.reorganizedExperience ||
      version.masterSnapshot.experience.map((e) => ({
        company: e.company,
        role: e.role,
        period: `${e.startDate} - ${e.endDate}`,
        tailoredHighlights: e.highlights,
      }));

    return {
      version,
      summary,
      skills,
      experience,
    };
  }

  /**
   * Compares two resume versions and generates a detailed diff analysis
   */
  public async compareVersions(versionIdA: string, versionIdB: string): Promise<ResumeDiff> {
    const verA = await this.resumeRepo.getVersionById(versionIdA);
    const verB = await this.resumeRepo.getVersionById(versionIdB);

    if (!verA || !verB) {
      throw new Error('One or both specified resume versions were not found');
    }

    // Summary Diff
    const summaryA = verA.tailoredPayload?.customSummary || verA.masterSnapshot.summary;
    const summaryB = verB.tailoredPayload?.customSummary || verB.masterSnapshot.summary;

    // Skills Diff
    const skillsA = verA.tailoredPayload?.prioritizedSkills || [];
    const skillsB = verB.tailoredPayload?.prioritizedSkills || [];

    const setA = new Set(skillsA);
    const setB = new Set(skillsB);

    const addedSkills = skillsB.filter((s) => !setA.has(s));
    const removedSkills = skillsA.filter((s) => !setB.has(s));
    const retainedSkills = skillsB.filter((s) => setA.has(s));

    // Experience Diff
    const expA = verA.tailoredPayload?.reorganizedExperience || [];
    const expB = verB.tailoredPayload?.reorganizedExperience || [];

    const experienceDiff = expB.map((itemB) => {
      const matchA = expA.find((itemA) => itemA.company === itemB.company && itemA.role === itemB.role);
      const hlA = matchA ? matchA.tailoredHighlights : [];
      const hlB = itemB.tailoredHighlights;

      const setHlA = new Set(hlA);
      const setHlB = new Set(hlB);

      return {
        company: itemB.company,
        role: itemB.role,
        addedHighlights: hlB.filter((h) => !setHlA.has(h)),
        removedHighlights: hlA.filter((h) => !setHlB.has(h)),
        retainedHighlights: hlB.filter((h) => setHlA.has(h)),
      };
    });

    // Keywords Diff
    const kwA = verA.tailoredPayload?.keywordsOptimized || [];
    const kwB = verB.tailoredPayload?.keywordsOptimized || [];

    const setKwA = new Set(kwA);
    const setKwB = new Set(kwB);

    return {
      versionIdA: verA.id,
      versionTagA: verA.versionTag,
      versionIdB: verB.id,
      versionTagB: verB.versionTag,
      summaryDiff: {
        versionA: summaryA,
        versionB: summaryB,
        changed: summaryA !== summaryB,
      },
      skillsDiff: {
        addedInB: addedSkills,
        removedInB: removedSkills,
        retained: retainedSkills,
      },
      experienceDiff,
      keywordsDiff: {
        addedInB: kwB.filter((k) => !setKwA.has(k)),
        removedInB: kwA.filter((k) => !setKwB.has(k)),
      },
    };
  }

  /**
   * Rolls back the candidate Master Resume and active state to a specified historic version.
   */
  public async rollbackToVersion(versionId: string): Promise<ResumeRollbackResult> {
    const targetVersion = await this.resumeRepo.getVersionById(versionId);
    if (!targetVersion) {
      throw new Error(`Target rollback version "${versionId}" not found`);
    }

    // 1. Restore Master Resume snapshot
    const restoredMaster = await this.resumeRepo.updateMasterResume(targetVersion.masterSnapshot);

    // 2. Generate a new rollback version tag
    const allVersions = await this.resumeRepo.getAllVersions();
    const newTag = `v${allVersions.length + 1}.0-rollback`;

    // 3. Create a rollback version entry recording the event
    const rollbackVersion: ResumeVersion = {
      id: `res_ver_rb_${Date.now()}`,
      versionTag: newTag,
      jobId: targetVersion.jobId,
      jobTitle: targetVersion.jobTitle,
      company: targetVersion.company,
      changeDescription: `Rollback executed to version ${targetVersion.versionTag} (${targetVersion.id})`,
      masterSnapshot: restoredMaster,
      tailoredPayload: targetVersion.tailoredPayload,
      formats: targetVersion.formats,
      createdAt: new Date().toISOString(),
    };

    await this.resumeRepo.saveVersion(rollbackVersion);

    logger.success('RESUME_GEN', `Executed Rollback to ${targetVersion.versionTag}`, {
      restoredVersionId: targetVersion.id,
      rollbackTag: newTag,
    });

    return {
      success: true,
      restoredVersionId: targetVersion.id,
      currentVersionTag: newTag,
      masterResume: restoredMaster,
      message: `Successfully rolled back resume state to version ${targetVersion.versionTag}`,
    };
  }
}
