/**
 * @file src/resume/__tests__/ResumeEngine.spec.ts
 * @description Comprehensive unit tests for Phase 8 Resume Engine.
 */

import fs from 'fs';
import path from 'path';
import { ResumeEngine } from '../ResumeEngine';
import { ResumeRepository } from '../../repositories/ResumeRepository';
import { DatabaseManager } from '../../database';
import { MasterResume, TailoredResume } from '@sentinel/types';

describe('ResumeEngine Phase 8 Suite', () => {
  let dbManager: DatabaseManager;
  let resumeRepo: ResumeRepository;
  let resumeEngine: ResumeEngine;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(process.cwd(), 'data', `test_resume_engine_${Date.now()}_${Math.random()}.json`);
    dbManager = new DatabaseManager(testDbPath);
    resumeRepo = new ResumeRepository(dbManager);
    resumeEngine = new ResumeEngine(resumeRepo);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {
        // ignore
      }
    }
  });

  describe('1. Read Master Resume & Anti-Fabrication Reordering', () => {
    it('should read candidate Master Resume correctly', async () => {
      const master = await resumeEngine.getMasterResume();
      expect(master).toBeDefined();
      expect(master.fullName).toBe('Kaushik Khandala');
      expect(master.skills.languages).toContain('Dart');
    });

    it('should reorder skills and highlights based on keywords WITHOUT fabricating information', async () => {
      const master = await resumeEngine.getMasterResume();
      const targetKeywords = ['Firebase', 'SQLite', 'Flutter'];

      const reordered = resumeEngine.reorderContent(master, targetKeywords);

      // Verify skills reordering: matching skills placed first
      expect(reordered.prioritizedSkills).toBeDefined();
      expect(reordered.prioritizedSkills[0]).toMatch(/Firebase|SQLite|Flutter/i);

      // Verify skills set completeness (no fake skills invented)
      const originalSkills = new Set([
        ...master.skills.languages,
        ...master.skills.frameworks,
        ...master.skills.cloudAndDevOps,
        ...master.skills.databases,
        ...master.skills.tools,
      ]);
      for (const skill of reordered.prioritizedSkills) {
        expect(originalSkills.has(skill)).toBe(true);
      }

      // Verify experience highlights reordering without text modification
      expect(reordered.reorganizedExperience.length).toBe(master.experience.length);
      const topRole = reordered.reorganizedExperience[0];
      expect(topRole.company).toBe(master.experience[0].company);
      expect(topRole.tailoredHighlights.length).toBe(master.experience[0].highlights.length);
    });
  });

  describe('2. Multi-Format Output Generation (PDF, DOCX, JSON) & Storage', () => {
    it('should generate PDF, DOCX, and JSON formats for a new resume version', async () => {
      const version = await resumeEngine.generateResumeVersion({
        jobId: 'job-101',
        jobTitle: 'Lead Software Architect',
        company: 'Stripe',
        targetKeywords: ['TypeScript', 'Distributed Systems', 'AWS'],
        changeDescription: 'Tailored for Stripe Lead Architect role',
      });

      expect(version.id).toBeDefined();
      expect(version.versionTag).toBe('v1.0');
      expect(version.company).toBe('Stripe');

      // Verify PDF Format
      expect(version.formats.pdfDataUrl).toBeDefined();
      expect(version.formats.pdfDataUrl).toMatch(/^data:application\/pdf;base64,/);

      // Verify DOCX Format
      expect(version.formats.docxBase64).toBeDefined();
      expect(typeof version.formats.docxBase64).toBe('string');
      expect(version.formats.docxBase64.length).toBeGreaterThan(100);

      // Verify JSON Format
      expect(version.formats.jsonRepresentation).toBeDefined();
      expect(version.formats.jsonRepresentation.master.fullName).toBe('Kaushik Khandala');
      expect(version.formats.jsonRepresentation.tailored.jobTitle).toBe('Lead Software Architect');
    });

    it('should store created version in version history', async () => {
      await resumeEngine.generateResumeVersion({
        jobId: 'job-201',
        jobTitle: 'Senior Frontend Engineer',
        company: 'Canva',
      });

      await resumeEngine.generateResumeVersion({
        jobId: 'job-202',
        jobTitle: 'Full Stack Engineer',
        company: 'Atlassian',
      });

      const history = await resumeEngine.getVersionHistory();
      expect(history.length).toBe(2);
      expect(history[0].versionTag).toBe('v2.0');
      expect(history[1].versionTag).toBe('v1.0');

      const canvaHistory = await resumeEngine.getVersionHistory('job-201');
      expect(canvaHistory.length).toBe(1);
      expect(canvaHistory[0].company).toBe('Canva');
    });
  });

  describe('3. Resume Preview', () => {
    it('should generate preview payload for a stored version', async () => {
      const created = await resumeEngine.generateResumeVersion({
        jobId: 'job-301',
        company: 'Shopify',
        customSummary: 'Custom tailored summary for Shopify e-commerce platform',
      });

      const preview = await resumeEngine.getResumePreview(created.id);
      expect(preview.version.id).toBe(created.id);
      expect(preview.summary).toContain('Shopify e-commerce');
      expect(preview.skills.length).toBeGreaterThan(0);
      expect(preview.experience.length).toBeGreaterThan(0);
    });

    it('should throw error when previewing non-existent version ID', async () => {
      await expect(resumeEngine.getResumePreview('non_existent_id')).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('4. Resume Comparison (Diffing)', () => {
    it('should compute detailed diff between two versions', async () => {
      const v1 = await resumeEngine.generateResumeVersion({
        jobId: 'job-401',
        company: 'Google',
        targetKeywords: ['Go', 'Kubernetes'],
        customSummary: 'Summary Version 1 for Cloud Engineer',
      });

      const v2 = await resumeEngine.generateResumeVersion({
        jobId: 'job-401',
        company: 'Google',
        targetKeywords: ['Go', 'Kubernetes', 'Python', 'AI'],
        customSummary: 'Summary Version 2 updated for Senior Cloud AI Engineer',
      });

      const diff = await resumeEngine.compareVersions(v1.id, v2.id);

      expect(diff.versionIdA).toBe(v1.id);
      expect(diff.versionIdB).toBe(v2.id);

      // Summary Diff
      expect(diff.summaryDiff.changed).toBe(true);
      expect(diff.summaryDiff.versionA).toContain('Summary Version 1');
      expect(diff.summaryDiff.versionB).toContain('Summary Version 2');

      // Keywords Diff
      expect(diff.keywordsDiff.addedInB).toContain('Python');
      expect(diff.keywordsDiff.addedInB).toContain('AI');
    });
  });

  describe('5. Resume Rollback', () => {
    it('should rollback master resume to a historic version snapshot', async () => {
      const initialMaster = await resumeEngine.getMasterResume();
      expect(initialMaster.fullName).toBe('Kaushik Khandala');

      // 1. Create original version
      const originalVer = await resumeEngine.generateResumeVersion({
        company: 'Original Startup',
        changeDescription: 'Original baseline version',
      });

      // 2. Modify Master Resume
      const modifiedMaster: MasterResume = {
        ...initialMaster,
        fullName: 'Alex Mercer (Modified)',
        summary: 'Completely modified summary',
      };
      await resumeEngine.updateMasterResume(modifiedMaster);

      const checkModified = await resumeEngine.getMasterResume();
      expect(checkModified.fullName).toBe('Alex Mercer (Modified)');

      // 3. Rollback to original version
      const rollbackResult = await resumeEngine.rollbackToVersion(originalVer.id);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.restoredVersionId).toBe(originalVer.id);
      expect(rollbackResult.currentVersionTag).toMatch(/rollback/i);

      // Verify Master Resume state restored
      const restoredMaster = await resumeEngine.getMasterResume();
      expect(restoredMaster.fullName).toBe('Kaushik Khandala');
      expect(restoredMaster.summary).toBe(initialMaster.summary);
    });
  });
});
