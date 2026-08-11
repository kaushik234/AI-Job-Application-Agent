/**
 * @file src/controllers/SystemController.ts
 * @description Controller providing pipeline triggers, email monitor triggers, and system logs streaming.
 * @architect Clean Architecture - Controller Layer
 */

import { Request, Response } from 'express';
import { schedulerService } from '../services/SchedulerService';
import { emailMonitorService } from '../services/EmailMonitorService';
import { logger } from '@sentinel/shared';

export class SystemController {
  /** POST /api/system/pipeline - Triggers morning automated search and auto-prep */
  public triggerPipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const outcome = await schedulerService.executeMorningPipeline();
      res.json({ success: true, data: outcome });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** POST /api/system/email-check - Trigger recruiter email check & classification */
  public triggerEmailCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const records = await emailMonitorService.checkInboundEmails();
      res.json({ success: true, count: records.length, data: records });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /** GET /api/system/logs - Fetch recent activity and execution logs */
  public getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const logs = logger.getLogs(150);
      res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
