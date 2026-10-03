import { createClient, type RedisClientType } from 'redis'
import type { RedisLike } from './redis-queue'

export class RedisClientAdapter implements RedisLike {
  private readonly client: RedisClientType
  constructor(url: string) { this.client = createClient({ url }) }
  async connect() { await this.client.connect() }
  async lPush(key: string, value: string) { return this.client.lPush(key, value) }
  async rPop(key: string) { return this.client.rPop(key) }
  async set(key: string, value: string, options?: { EX: number; NX?: boolean }) { return this.client.set(key, value, options) }
  async del(key: string) { return this.client.del(key) }
  async zAdd(key: string, item: { score: number; value: string }) { return this.client.zAdd(key, item) }
  async zRangeByScore(key: string, min: number, max: number) { return this.client.zRangeByScore(key, min, max) }
  async zRem(key: string, value: string) { return this.client.zRem(key, value) }
  async close() { await this.client.quit() }
}
