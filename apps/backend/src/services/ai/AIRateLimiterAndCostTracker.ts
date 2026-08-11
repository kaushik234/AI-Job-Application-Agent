/**
 * @file src/services/ai/AIRateLimiterAndCostTracker.ts
 * @description Manages rate limiting, exponential backoff retries, and token/cost tracking for Gemini API requests.
 */

import { AICostMetrics } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class AIRateLimiterAndCostTracker {
  private requestsInWindow: number[] = [];
  private maxRequestsPerMinute: number;
  private metrics: AICostMetrics = {
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalEstimatedCostUsd: 0,
    cacheHitCount: 0,
    cacheMissCount: 0,
  };

  constructor(maxRequestsPerMinute: number = 20) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
  }

  /**
   * Enforces rate limits using a sliding window. Delays execution if rate limit is reached.
   */
  public async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000;

    // Filter timestamps within the 1-minute window
    this.requestsInWindow = this.requestsInWindow.filter((t) => t > windowStart);

    if (this.requestsInWindow.length >= this.maxRequestsPerMinute) {
      const oldest = this.requestsInWindow[0];
      const waitMs = oldest + 60000 - now + 100; // wait until oldest request slides out
      logger.warn('AI_PROMPT', `Rate limit threshold reached (${this.maxRequestsPerMinute} req/min). Throttling for ${waitMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, Math.max( waitMs, 500)));
    }

    this.requestsInWindow.push(Date.now());
  }

  /**
   * Wraps an async AI API function with exponential backoff retry logic.
   */
  public async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
  ): Promise<T> {
    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt < maxRetries) {
      try {
        await this.enforceRateLimit();
        return await fn();
      } catch (error: any) {
        attempt++;
        const errorMessage = error?.message || String(error);
        
        const isQuotaError =
          errorMessage.includes('429') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('Quota exceeded') ||
          errorMessage.includes('quota');

        if (isQuotaError) {
          logger.warn('AI_PROMPT', `Gemini API quota exceeded or 429 rate-limited. Immediately triggering deterministic fallback.`);
          throw error;
        }

        logger.warn('AI_PROMPT', `Gemini API call failed on attempt ${attempt}/${maxRetries}: ${errorMessage}`);

        if (attempt >= maxRetries) {
          logger.error('AI_PROMPT', `Exhausted retries (${maxRetries}) for Gemini API call.`);
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    throw new Error('Unexpected retry loop termination');
  }

  /**
   * Records usage tokens and computes cost estimation in USD.
   */
  public recordUsage(
    inputTokens: number,
    outputTokens: number,
    model: string = 'gemini-3.1-pro-preview'
  ): number {
    this.metrics.totalCalls++;
    this.metrics.totalInputTokens += inputTokens;
    this.metrics.totalOutputTokens += outputTokens;

    // Pricing estimation
    const isPro = model.includes('pro') || model.includes('2.5');
    const inputCostPer1k = isPro ? 0.00125 : 0.000075;
    const outputCostPer1k = isPro ? 0.005 : 0.0003;

    const callCost = (inputTokens / 1000) * inputCostPer1k + (outputTokens / 1000) * outputCostPer1k;
    this.metrics.totalEstimatedCostUsd += callCost;
    this.metrics.lastCallTimestamp = new Date().toISOString();

    logger.info(
      'AI_PROMPT',
      `Tokens used [${model}]: ${inputTokens} in / ${outputTokens} out | Est Cost: $${callCost.toFixed(6)} | Cumulative: $${this.metrics.totalEstimatedCostUsd.toFixed(4)}`
    );

    return callCost;
  }

  public getMetrics(cacheHits: number, cacheMisses: number): AICostMetrics {
    return {
      ...this.metrics,
      cacheHitCount: cacheHits,
      cacheMissCount: cacheMisses,
    };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCostUsd: 0,
      cacheHitCount: 0,
      cacheMissCount: 0,
    };
    this.requestsInWindow = [];
  }
}
