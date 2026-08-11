/**
 * @file src/coverLetter/__tests__/CoverLetterEngine.spec.ts
 * @description Unit tests for Phase 9 Cover Letter Generator Engine.
 */

import { CoverLetterEngine } from '../CoverLetterEngine';
import { DatabaseManager } from '../../database';
import { ResumeRepository } from '../../repositories/ResumeRepository';
import path from 'path';
import fs from 'fs';

describe('CoverLetterEngine Phase 9 Suite', () => {
  let testDbPath: string;
  let dbManager: DatabaseManager;
  let resumeRepo: ResumeRepository;
  let engine: CoverLetterEngine;

  beforeEach(() => {
    testDbPath = path.join(process.cwd(), 'data', `test_cover_letter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json`);
    dbManager = new DatabaseManager(testDbPath);
    resumeRepo = new ResumeRepository(dbManager);
    engine = new CoverLetterEngine(resumeRepo);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (err) {
        // ignore cleanup error
      }
    }
  });

  describe('1. Cover Letter Generation', () => {
    it('should generate a personalized cover letter mentioning Company, Position, Experience, & Tech Stack', async () => {
      const version = await engine.generateCoverLetter({
        jobId: 'job_stripe_01',
        companyName: 'Stripe',
        jobTitle: 'Staff Backend Engineer',
        techStack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        relevantExperience: ['Senior Engineer at Atlassian (2021 - Present)'],
      });

      expect(version).toBeDefined();
      expect(version.versionTag).toBe('v1.0');
      expect(version.companyName).toBe('Stripe');
      expect(version.jobTitle).toBe('Staff Backend Engineer');
      expect(version.techStackMentioned).toContain('TypeScript');
      expect(version.relevantExperienceMentioned[0]).toContain('Atlassian');

      // Check paragraph contents
      const fullContent = version.contentParagraphs.join(' ');
      expect(fullContent).toContain('Stripe');
      expect(fullContent).toContain('Staff Backend Engineer');
      expect(fullContent).toContain('Atlassian');
      expect(fullContent).toContain('TypeScript');
    });

    it('should produce PDF (dataUrl), DOCX (base64), and JSON formats', async () => {
      const version = await engine.generateCoverLetter({
        companyName: 'Canva',
        jobTitle: 'Frontend Architect',
      });

      expect(version.formats.pdfDataUrl).toMatch(/^data:application\/pdf;base64,/);
      expect(typeof version.formats.docxBase64).toBe('string');
      expect(version.formats.docxBase64.length).toBeGreaterThan(100);
      expect(version.formats.jsonRepresentation.mentions.companyName).toBe('Canva');
    });
  });

  describe('2. History & Versions', () => {
    it('should store and retrieve version history', async () => {
      await engine.generateCoverLetter({ companyName: 'Google', jobTitle: 'L6 Software Engineer' });
      await engine.generateCoverLetter({ companyName: 'Google', jobTitle: 'L6 Software Engineer', techStack: ['Go', 'Kubernetes'] });

      const history = await engine.getHistory({ companyName: 'Google' });
      expect(history.length).toBe(2);
      expect(history[0].versionTag).toBe('v2.0');
      expect(history[1].versionTag).toBe('v1.0');
    });
  });

  describe('3. Preview', () => {
    it('should return preview structure for a created version', async () => {
      const version = await engine.generateCoverLetter({
        companyName: 'Atlassian',
        jobTitle: 'Senior Full Stack Developer',
      });

      const preview = await engine.getPreview(version.id);
      expect(preview.companyName).toBe('Atlassian');
      expect(preview.jobTitle).toBe('Senior Full Stack Developer');
      expect(preview.contentParagraphs.length).toBeGreaterThanOrEqual(3);
      expect(preview.formats.pdfDataUrl).toBeDefined();
    });

    it('should throw an error for non-existent version ID', async () => {
      await expect(engine.getPreview('invalid_id')).rejects.toThrow('not found');
    });
  });

  describe('4. Comparison (Diffing)', () => {
    it('should compute paragraph, tech stack, and experience diffs between two versions', async () => {
      const v1 = await engine.generateCoverLetter({
        companyName: 'Shopify',
        jobTitle: 'Backend Lead',
        techStack: ['Ruby', 'Node.js', 'Redis'],
      });

      const v2 = await engine.generateCoverLetter({
        companyName: 'Shopify',
        jobTitle: 'Backend Lead',
        techStack: ['TypeScript', 'Node.js', 'PostgreSQL'],
      });

      const diff = await engine.compareVersions(v1.id, v2.id);
      expect(diff.versionIdA).toBe(v1.id);
      expect(diff.versionIdB).toBe(v2.id);
      expect(diff.techStackDiff.addedInB).toContain('TypeScript');
      expect(diff.techStackDiff.removedInB).toContain('Ruby');
      expect(diff.techStackDiff.retained).toContain('Node.js');
    });
  });

  describe('5. Rollback', () => {
    it('should rollback active cover letter to a historic version', async () => {
      const v1 = await engine.generateCoverLetter({
        companyName: 'Datadog',
        jobTitle: 'Site Reliability Engineer',
        techStack: ['Python', 'Docker'],
      });

      await engine.generateCoverLetter({
        companyName: 'Datadog',
        jobTitle: 'Site Reliability Engineer',
        techStack: ['Go', 'Kubernetes'],
      });

      const rollbackRes = await engine.rollbackToVersion(v1.id);
      expect(rollbackRes.success).toBe(true);
      expect(rollbackRes.restoredVersionId).toBe(v1.id);
      expect(rollbackRes.currentVersionTag).toContain('rollback');
      expect(rollbackRes.coverLetter.companyName).toBe('Datadog');
    });
  });
});
