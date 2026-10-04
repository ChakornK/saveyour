export interface IntegrationMetrics {
  stageLatency(stage: string, milliseconds: number, correlationId: string): void;
  leaseConflict(correlationId: string): void;
  retryExhausted(correlationId: string): void;
  outboxBacklog(size: number): void;
}

export class InMemoryIntegrationMetrics implements IntegrationMetrics {
  readonly latencies: Array<{ stage: string; milliseconds: number; correlationId: string }> = [];
  leaseConflicts = 0;
  retriesExhausted = 0;
  backlog = 0;
  stageLatency(stage: string, milliseconds: number, correlationId: string) { this.latencies.push({ stage, milliseconds, correlationId }); }
  leaseConflict(_correlationId: string) { this.leaseConflicts += 1; }
  retryExhausted(_correlationId: string) { this.retriesExhausted += 1; }
  outboxBacklog(size: number) { this.backlog = size; }
}
