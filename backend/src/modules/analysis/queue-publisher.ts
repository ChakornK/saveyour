import type { AnalysisJob } from './contracts'
import type { JobQueue } from './queue'

export interface AnalysisQueuePublisher {
  publish(job: AnalysisJob): Promise<void>
}

export class QueuePublisher implements AnalysisQueuePublisher {
  constructor(private readonly queue: JobQueue) {}
  async publish(job: AnalysisJob) { await this.queue.enqueue(job.id) }
}
