/**
 * @file src/browser/SessionManager.ts
 * @description Manages browser session persistence, cookie storage, and storage state serialization to disk.
 * @architect Clean Architecture - Browser Session Management
 */

import fs from 'fs';
import path from 'path';
import { logger } from '@sentinel/shared';

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface SessionState {
  domain: string;
  cookies: CookieData[];
  localStorage?: Record<string, string>;
  updatedAt: string;
}

export class SessionManager {
  private storageDir: string;

  constructor(storageDir: string = path.join(process.cwd(), 'data', 'browser_sessions')) {
    this.storageDir = storageDir;
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getSessionFilePath(domain: string): string {
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `${sanitizedDomain}_session.json`);
  }

  /**
   * Saves cookies and local storage state for a domain to disk.
   */
  public async saveSession(domain: string, cookies: CookieData[], localStorageData?: Record<string, string>): Promise<SessionState> {
    const sessionState: SessionState = {
      domain,
      cookies,
      localStorage: localStorageData || {},
      updatedAt: new Date().toISOString(),
    };

    const filePath = this.getSessionFilePath(domain);
    fs.writeFileSync(filePath, JSON.stringify(sessionState, null, 2), 'utf-8');

    logger.info('BROWSER', `Persisted browser session cookies for domain: ${domain}`, {
      cookieCount: cookies.length,
      filePath,
    });

    return sessionState;
  }

  /**
   * Loads saved session cookies and state for a domain from disk.
   */
  public async loadSession(domain: string): Promise<SessionState | null> {
    const filePath = this.getSessionFilePath(domain);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const session: SessionState = JSON.parse(content);
      logger.info('BROWSER', `Loaded persisted browser session for domain: ${domain}`, {
        cookieCount: session.cookies?.length || 0,
      });
      return session;
    } catch (error) {
      logger.error('BROWSER', `Failed to load browser session file for ${domain}`, { error });
      return null;
    }
  }

  /**
   * Clears saved session state for a domain.
   */
  public async clearSession(domain: string): Promise<boolean> {
    const filePath = this.getSessionFilePath(domain);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('BROWSER', `Cleared browser session cookies for domain: ${domain}`);
      return true;
    }
    return false;
  }
}

export const sessionManager = new SessionManager();
