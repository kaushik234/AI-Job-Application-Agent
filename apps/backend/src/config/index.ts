/**
 * @file src/config/index.ts
 * @description Application Configuration Manager loading validated environment variables and system constants.
 * @architect Clean Architecture - Configuration Layer
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

/** Global App Configuration Interface */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  geminiApiKey: string;
  appUrl: string;
  encryptionSecret: string;
  databasePath: string;
  storageDir: string;
  logsDir: string;
  isProduction: boolean;
}

/**
 * Validates and retrieves process environment variables with defaults.
 * Follows SOLID single responsibility principle for configuration management.
 */
function loadConfig(): AppConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const encryptionSecret = process.env.ENCRYPTION_SECRET || 'ai-job-agent-default-secret-key-32ch';
  const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ai_job_agent.json');
  const storageDir = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage');
  const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

  return {
    port,
    nodeEnv,
    geminiApiKey,
    appUrl,
    encryptionSecret,
    databasePath,
    storageDir,
    logsDir,
    isProduction: nodeEnv === 'production',
  };
}

/** Export singleton configuration instance */
export const config: AppConfig = loadConfig();
