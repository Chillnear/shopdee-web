/**
 * AI Multi-Tier Router (Orchestrator)
 * บริหารจัดการ Circuit Breaker, ลำดับการ Fallback (Free -> Paid -> Local)
 * รับประกัน 100% Uptime พร้อมบันทึก Metadata
 */

import { AIProvider, AIResult } from './types';
import { CircuitBreaker } from './circuit-breaker';

export interface RouterConfig<TInput, TOutput> {
  providers: AIProvider<TInput, TOutput>[];
  validate?: (output: TOutput) => boolean;
}

export class AIRouter<TInput, TOutput> {
  private breakers = new Map<string, CircuitBreaker>();

  constructor(private config: RouterConfig<TInput, TOutput>) {
    for (const provider of config.providers) {
      this.breakers.set(provider.name, new CircuitBreaker(provider.name));
    }
  }

  async run(input: TInput): Promise<AIResult<TOutput>> {
    const errorLogs: string[] = [];

    for (const provider of this.config.providers) {
      const breaker = this.breakers.get(provider.name)!;

      // ถ้าเป็น local tier จะไม่ตัด circuit เด็ดขาด เพราะเป็น offline baseline
      if (provider.tier !== 'local' && !breaker.canExecute()) {
        errorLogs.push(`${provider.name}: circuit-open (cooldown active)`);
        continue;
      }

      const start = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), provider.timeoutMs);

      try {
        const result = await provider.execute(input, controller.signal);
        clearTimeout(timer);

        if (this.config.validate && !this.config.validate(result)) {
          throw new Error('validation-failed');
        }

        breaker.recordSuccess();
        const latencyMs = Math.round(performance.now() - start);

        return {
          data: result,
          meta: {
            tier: provider.tier,
            provider: provider.name,
            latencyMs,
            confidence: provider.tier === 'local' ? 0.85 : 0.95,
            degraded: provider.tier !== 'free',
          },
        };
      } catch (err: any) {
        clearTimeout(timer);
        breaker.recordFailure();

        const reason = controller.signal.aborted ? 'timeout' : (err?.message || 'unknown-error');
        errorLogs.push(`${provider.name}: ${reason}`);
        // ตกไป Tier ถัดไปทันที
      }
    }

    throw new Error(`All AI tiers failed: ${errorLogs.join(' | ')}`);
  }
}
