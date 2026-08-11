/**
 * @file src/repositories/EmailRepository.ts
 * @description Repository pattern implementation for monitored recruiter emails and status classifications.
 * @architect Clean Architecture - Repository Layer
 */

import { db, DatabaseManager } from '../database';
import { EmailRecord } from '@sentinel/types';

export class EmailRepository {
  private database: DatabaseManager;

  constructor(databaseManager: DatabaseManager = db) {
    this.database = databaseManager;
  }

  /**
   * Retrieves all monitored recruiter emails
   */
  public async findAll(): Promise<EmailRecord[]> {
    return this.database.getAllEmails();
  }

  /**
   * Saves a collection of classified email records
   */
  public async saveMany(emails: EmailRecord[]): Promise<EmailRecord[]> {
    return this.database.saveEmails(emails);
  }

  /**
   * Deletes a stored email record
   */
  public async delete(id: string): Promise<boolean> {
    return this.database.deleteEmail(id);
  }
}
