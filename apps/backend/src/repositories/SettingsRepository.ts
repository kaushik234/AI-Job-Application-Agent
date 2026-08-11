/**
 * @file src/repositories/SettingsRepository.ts
 * @description Repository pattern implementation for System Configuration and Preference settings.
 * @architect Clean Architecture - Repository Layer
 */

import { db, DatabaseManager } from '../database';
import { AgentSettings } from '@sentinel/types';

export class SettingsRepository {
  private database: DatabaseManager;

  constructor(databaseManager: DatabaseManager = db) {
    this.database = databaseManager;
  }

  /**
   * Retrieves current agent configuration settings
   */
  public async getSettings(): Promise<AgentSettings> {
    return this.database.getSettings();
  }

  /**
   * Updates application preferences
   */
  public async updateSettings(settings: Partial<AgentSettings>): Promise<AgentSettings> {
    return this.database.updateSettings(settings);
  }
}
