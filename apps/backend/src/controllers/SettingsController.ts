/**
 * @file src/controllers/SettingsController.ts
 * @description Controller managing system configuration, country target filters, salary limits, and blacklist/whitelist rules.
 * @architect Clean Architecture - Controller Layer
 */

import { Request, Response } from 'express';
import { SettingsRepository } from '../repositories/SettingsRepository';

export class SettingsController {
  private settingsRepo: SettingsRepository;

  constructor() {
    this.settingsRepo = new SettingsRepository();
  }

  /** GET /api/settings - Fetch current settings */
  public getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await this.settingsRepo.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** PUT /api/settings - Update settings */
  public updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await this.settingsRepo.updateSettings(req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
