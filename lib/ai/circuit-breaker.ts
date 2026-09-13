/**
 * Circuit Breaker Pattern for AI Providers
 * ป้องกันการส่ง request ซ้ำๆ ไปยัง Provider ที่ล่มหรือ timeout ต่อเนื่อง
 */

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private failures = 0;
  private state: CircuitState = 'closed';
  private nextAttemptTimestamp = 0;

  constructor(
    public readonly name: string,
    private readonly failureThreshold = 3,  // ล้มเหลวติดกันกี่ครั้งถึงจะตัดวงจร
    private readonly cooldownMs = 30_000     // พักใช้งาน provider นาน 30 วินาที
  ) {}

  canExecute(): boolean {
    const now = Date.now();
    if (this.state === 'closed') {
      return true;
    }
    if (this.state === 'open') {
      if (now >= this.nextAttemptTimestamp) {
        this.state = 'half-open'; // ทดสอบ 1 ครั้ง
        return true;
      }
      return false;
    }
    // half-open
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTimestamp = Date.now() + this.cooldownMs;
    }
  }

  get currentState(): CircuitState {
    return this.state;
  }
}
