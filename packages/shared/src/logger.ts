import { LogEntry } from '@sentinel/types';

type LogListener = (entry: LogEntry) => void;

class ActivityLogger {
  private inMemoryLogs: LogEntry[] = [];
  private listeners: LogListener[] = [];
  private maxLogs = 500;

  constructor() {
    this.info('SEARCH', 'AI Job Application Agent Logger initialized');
  }

  public info(category: LogEntry['category'], message: string, details?: Record<string, unknown>): LogEntry {
    return this.createEntry('INFO', category, message, details);
  }

  public success(category: LogEntry['category'], message: string, details?: Record<string, unknown>): LogEntry {
    return this.createEntry('SUCCESS', category, message, details);
  }

  public warn(category: LogEntry['category'], message: string, details?: Record<string, unknown>): LogEntry {
    return this.createEntry('WARN', category, message, details);
  }

  public error(category: LogEntry['category'], message: string, details?: Record<string, unknown>): LogEntry {
    return this.createEntry('ERROR', category, message, details);
  }

  private createEntry(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    details?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };

    this.inMemoryLogs.unshift(entry);
    if (this.inMemoryLogs.length > this.maxLogs) {
      this.inMemoryLogs.pop();
    }

    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.category}]`;
    if (level === 'ERROR') {
      console.error(`${prefix} ${message}`, details || '');
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}`, details || '');
    } else {
      console.log(`${prefix} ${message}`);
    }

    this.listeners.forEach((listener) => listener(entry));
    return entry;
  }

  public getLogs(limit = 100): LogEntry[] {
    return this.inMemoryLogs.slice(0, limit);
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public clear(): void {
    this.inMemoryLogs = [];
  }
}

export const logger = new ActivityLogger();
