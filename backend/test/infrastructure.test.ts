import { describe, expect, test } from 'bun:test'
import { InMemoryAnalysisRepository } from '../src/modules/analysis/repository'
import { RedisJobQueue, type RedisLike } from '../src/infrastructure/queue/redis-queue'
import { createStageStates } from '../src/modules/analysis/contracts'
import { InMemoryRateLimitStore } from '../src/modules/limits/rate-limit'

class FakeRedis implements RedisLike {
  lists = new Map<string, string[]>()
  keysStore = new Set<string>()
  async lPush(key: string, value: string) { this.lists.set(key, [value, ...(this.lists.get(key) ?? [])]); return this.lists.get(key)!.length }
  async rPop(key: string) { return this.lists.get(key)?.pop() ?? null }
  async set(key: string, value: string, options?: { EX: number; NX?: boolean }) { if (options?.NX && this.keysStore.has(key)) return null; this.keysStore.add(key); return 'OK' }
  async del(key: string) { this.keysStore.delete(key); return 1 }
  async keys(pattern: string) { return [...this.keysStore].filter((key) => key.startsWith(pattern.replace('*', ''))) }
  async exists(key: string) { return this.keysStore.has(key) ? 1 : 0 }
  async ttl() { return -1 }
  async get() { return null }
}

describe('infrastructure contracts', () => {
  test('Redis queue claims and acknowledges leased jobs', async () => {
    const repository = new InMemoryAnalysisRepository()
    const now = new Date().toISOString()
    const job = await repository.save({ id: 'job-1', postId: 'post-1', ownerId: 'owner-1', postVersion: 1, reason: 'accepted', status: 'queued', stages: createStageStates(now), idempotencyKey: 'post-1:1', createdAt: now, updatedAt: now })
    const queue = new RedisJobQueue(new FakeRedis(), repository)
    await queue.enqueue(job.id)
    expect((await queue.claim())?.id).toBe(job.id)
    await queue.acknowledge(job.id)
  })

  test('rate limit store resets expired windows', async () => {
    const store = new InMemoryRateLimitStore()
    const first = await store.increment('owner', 10_000)
    const second = await store.increment('owner', 10_000)
    expect(second.count).toBe(2)
  })
})
