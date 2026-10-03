import type { AnalysisJob } from '../../modules/analysis/contracts'
import type { JobQueue } from '../../modules/analysis/queue'
import type { AnalysisRepository } from '../../modules/analysis/repository'

export interface RedisLike { lPush(key: string, value: string): Promise<number>; rPop(key: string): Promise<string | null>; set(key: string, value: string, options?: { EX: number; NX?: boolean }): Promise<string | null>; del(key: string): Promise<number> }

export class RedisJobQueue implements JobQueue {
  constructor(private readonly redis: RedisLike, private readonly repository: AnalysisRepository, private readonly queueKey = 'analysis:queue', private readonly leaseSeconds = 300) {}
  async enqueue(jobId: string) { await this.redis.lPush(this.queueKey, jobId) }
  async claim(): Promise<AnalysisJob | undefined> {
    const jobId = await this.redis.rPop(this.queueKey)
    if (!jobId) return undefined
    const acquired = await this.redis.set(`analysis:lease:${jobId}`, '1', { EX: this.leaseSeconds, NX: true })
    if (!acquired) return undefined
    return this.repository.get(jobId)
  }
  async acknowledge(jobId: string) { await this.redis.del(`analysis:lease:${jobId}`) }
}
