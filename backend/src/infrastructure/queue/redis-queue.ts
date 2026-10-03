import type { AnalysisJob } from '../../modules/analysis/contracts'
import type { JobQueue } from '../../modules/analysis/queue'
import type { AnalysisRepository } from '../../modules/analysis/repository'

export interface RedisLike {
  lPush(key: string, value: string): Promise<number>
  rPop(key: string): Promise<string | null>
  set(key: string, value: string, options?: { EX: number; NX?: boolean }): Promise<string | null>
  del(key: string): Promise<number>
  zAdd?(key: string, item: { score: number; value: string }): Promise<number>
  zRangeByScore?(key: string, min: number, max: number): Promise<string[]>
  zRem?(key: string, value: string): Promise<number>
}

export class RedisJobQueue implements JobQueue {
  constructor(private readonly redis: RedisLike, private readonly repository: AnalysisRepository, private readonly queueKey = 'analysis:queue', private readonly leaseSeconds = 300, private readonly retryKey = 'analysis:retry') {}
  async enqueue(jobId: string, delayMs = 0) { if (delayMs > 0 && this.redis.zAdd) { await this.redis.zAdd(this.retryKey, { score: Date.now() + delayMs, value: jobId }); return }; await this.redis.lPush(this.queueKey, jobId) }
  async promoteDueRetries() { if (!this.redis.zRangeByScore || !this.redis.zRem) return 0; const ids = await this.redis.zRangeByScore(this.retryKey, 0, Date.now()); for (const id of ids) { await this.redis.zRem(this.retryKey, id); await this.redis.lPush(this.queueKey, id) }; return ids.length }
  async claim(): Promise<AnalysisJob | undefined> { await this.promoteDueRetries(); const jobId = await this.redis.rPop(this.queueKey); if (!jobId) return undefined; const acquired = await this.redis.set(`analysis:lease:${jobId}`, '1', { EX: this.leaseSeconds, NX: true }); if (!acquired) return undefined; return this.repository.get(jobId) }
  async acknowledge(jobId: string) { await this.redis.del(`analysis:lease:${jobId}`) }
}
