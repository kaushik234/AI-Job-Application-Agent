/**
 * @file src/repositories/ResumeRepository.ts
 * @description Repository pattern implementation for Master Resume and Tailored Resumes.
 * @architect Clean Architecture - Repository Layer
 */

import { db, DatabaseManager } from '../database';
import { MasterResume, TailoredResume, CoverLetter, ResumeVersion, CoverLetterVersion } from '@sentinel/types';

export class ResumeRepository {
  private database: DatabaseManager;

  constructor(databaseManager: DatabaseManager = db) {
    this.database = databaseManager;
  }

  /**
   * Retrieves the candidate master resume profile
   */
  public async getMasterResume(): Promise<MasterResume> {
    return this.database.getMasterResume();
  }

  /**
   * Updates master resume profile details
   */
  public async updateMasterResume(resume: MasterResume): Promise<MasterResume> {
    return this.database.updateMasterResume(resume);
  }

  /**
   * Save tailored resume version
   */
  public async saveTailoredResume(resume: TailoredResume): Promise<TailoredResume> {
    return this.database.saveTailoredResume(resume);
  }

  /**
   * Find tailored resume for job
   */
  public async findTailoredResumeByJobId(jobId: string): Promise<TailoredResume | null> {
    return this.database.getTailoredResumeByJobId(jobId);
  }

  /**
   * Find all tailored resumes
   */
  public async findAllTailoredResumes(): Promise<TailoredResume[]> {
    return this.database.getAllTailoredResumes();
  }

  /**
   * Save generated resume version record
   */
  public async saveVersion(version: ResumeVersion): Promise<ResumeVersion> {
    return this.database.saveResumeVersion(version);
  }

  /**
   * Get all stored resume versions
   */
  public async getAllVersions(): Promise<ResumeVersion[]> {
    return this.database.getAllResumeVersions();
  }

  /**
   * Find resume version by ID
   */
  public async getVersionById(id: string): Promise<ResumeVersion | null> {
    return this.database.getResumeVersionById(id);
  }

  /**
   * Save generated cover letter
   */
  public async saveCoverLetter(coverLetter: CoverLetter): Promise<CoverLetter> {
    return this.database.saveCoverLetter(coverLetter);
  }

  /**
   * Find cover letter for job
   */
  public async findCoverLetterByJobId(jobId: string): Promise<CoverLetter | null> {
    return this.database.getCoverLetterByJobId(jobId);
  }

  /**
   * Save cover letter version
   */
  public async saveCoverLetterVersion(version: CoverLetterVersion): Promise<CoverLetterVersion> {
    return this.database.saveCoverLetterVersion(version);
  }

  /**
   * Get all cover letter versions
   */
  public async getAllCoverLetterVersions(): Promise<CoverLetterVersion[]> {
    return this.database.getAllCoverLetterVersions();
  }

  /**
   * Get cover letter version by ID
   */
  public async getCoverLetterVersionById(id: string): Promise<CoverLetterVersion | null> {
    return this.database.getCoverLetterVersionById(id);
  }
}
