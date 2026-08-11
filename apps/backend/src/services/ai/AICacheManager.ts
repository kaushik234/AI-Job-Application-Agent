/**
 * @file src/services/ai/AICacheManager.ts
 * @description In-memory LRU-style cache for AI responses with TTL and hit/miss analytics.
 */

import crypto from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: string;
}

export class AICacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(defaultTtlMinutes: number = 60 * 24) { // Default 24h
    this.defaultTtlMs = defaultTtlMinutes * 60 * 1000;
  }

  /**
   * Generates a deterministic hash key from prompt/function parameters and prompt version
   */
  public generateKey(functionName: string, promptVersion: string, params: Record<string, any>): string {
    const serializedParams = JSON.stringify(params, Object.keys(params).sort());
    const raw = `${functionName}:${promptVersion}:${serializedParams}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMinutes?: number): void {
    const ttlMs = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: new Date().toISOString(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public getStats(): { cacheHits: number; cacheMisses: number; cacheSize: number } {
    return {
      cacheHits: this.hits,
      cacheMisses: this.misses,
      cacheSize: this.cache.size,
    };
  }

  public resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
