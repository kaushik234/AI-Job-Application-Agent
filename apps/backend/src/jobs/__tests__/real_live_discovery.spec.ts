/**
 * @file src/jobs/__tests__/real_live_discovery.spec.ts
 * @description Real Live Discovery Test verifying POST /api/jobs/discover telemetry and results for query "" and query "flutter".
 */

import { JobScraperEngine } from '../JobScraperEngine';

describe('Real Live Discovery Engine Execution', () => {
  jest.setTimeout(45000);

  test('1. Executes real live discovery with query ""', async () => {
    const engine = new JobScraperEngine();
    const result = await engine.executeParallelCrawl({ q: '' });

    expect(result).toBeDefined();
    expect(result.pipeline).toBeDefined();
    expect(result.pipeline!.returned).toBeLessThanOrEqual(50);
    expect(result.pipeline!.returned).toBe(result.jobs.length);
    expect(result.pipeline!.returned).toBe(result.pipeline!.recommended + result.pipeline!.consider);
    expect(result.pipeline!.afterApplyDecision).toBe(result.pipeline!.recommended + result.pipeline!.consider);
    expect(result.pipeline!.afterCandidateMatching).toBeGreaterThanOrEqual(result.pipeline!.afterApplyDecision);
  });

  test('2. Executes real live discovery with query "flutter"', async () => {
    const engine = new JobScraperEngine();
    const result = await engine.executeParallelCrawl({ q: 'flutter' });

    expect(result).toBeDefined();
    expect(result.pipeline).toBeDefined();
    expect(result.pipeline!.returned).toBeLessThanOrEqual(50);
    expect(result.pipeline!.returned).toBe(result.jobs.length);
    expect(result.pipeline!.returned).toBe(result.pipeline!.recommended + result.pipeline!.consider);
    expect(result.pipeline!.afterApplyDecision).toBe(result.pipeline!.recommended + result.pipeline!.consider);
    expect(result.pipeline!.afterCandidateMatching).toBeGreaterThanOrEqual(result.pipeline!.afterApplyDecision);
  });
});
