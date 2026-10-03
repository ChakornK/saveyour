export interface AnalysisMetrics {
  queueDepth: number
  jobsProcessed: number
  jobsSucceeded: number
  jobsRetried: number
  jobsFailed: number
  processingLatencyMs: number
}

export class InMemoryAnalysisMetrics {
  private readonly values: AnalysisMetrics = {
    queueDepth: 0,
    jobsProcessed: 0,
    jobsSucceeded: 0,
    jobsRetried: 0,
    jobsFailed: 0,
    processingLatencyMs: 0
  }

  setQueueDepth(value: number) { this.values.queueDepth = Math.max(0, value) }
  recordProcessed(latencyMs: number) { this.values.jobsProcessed += 1; this.values.processingLatencyMs = latencyMs }
  recordSucceeded() { this.values.jobsSucceeded += 1 }
  recordRetry() { this.values.jobsRetried += 1 }
  recordFailure() { this.values.jobsFailed += 1 }
  snapshot(): AnalysisMetrics { return { ...this.values } }
}

export interface HealthCheck { name: string; check(): Promise<boolean> }

export const checkHealth = async (checks: HealthCheck[]) => {
  const results = await Promise.all(checks.map(async ({ name, check }) => [name, await check()] as const))
  return {
    status: results.every(([, healthy]) => healthy) ? 'healthy' as const : 'unhealthy' as const,
    dependencies: Object.fromEntries(results)
  }
}
