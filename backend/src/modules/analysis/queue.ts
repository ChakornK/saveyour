import type { AnalysisJob } from './contracts'
import type { AnalysisRepository } from './repository'

export interface JobQueue {
  enqueue(jobId: string, delayMs?: number): Promise<void>
  claim(): Promise<AnalysisJob | undefined>
  acknowledge(jobId: string): Promise<void>
  recoverExpired?(): Promise<number>
}

export class InMemoryJobQueue implements JobQueue {
  private readonly pending: string[] = []
  private readonly leased = new Set<string>()

  constructor(private readonly repository: AnalysisRepository) {}

  async enqueue(jobId: string, delayMs = 0) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    if (!this.pending.includes(jobId) && !this.leased.has(jobId)) this.pending.push(jobId)
  }

  async claim() {
    const jobId = this.pending.shift()
    if (!jobId) return undefined
    this.leased.add(jobId)
    return this.repository.get(jobId)
  }

  async acknowledge(jobId: string) {
    this.leased.delete(jobId)
  }

  async recoverExpired() { return 0 }

  get depth() {
    return this.pending.length
  }
}

export class AnalysisWorker {
  constructor(private readonly queue: JobQueue, private readonly process: (jobId: string) => Promise<unknown>) {}

  async runOnce() {
    const job = await this.queue.claim()
    if (!job) return false
    try {
      await this.process(job.id)
    } finally {
      await this.queue.acknowledge(job.id)
    }
    return true
  }
}
