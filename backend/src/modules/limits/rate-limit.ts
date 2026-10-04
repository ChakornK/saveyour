import { Elysia } from 'elysia'

export interface RateLimitStore { increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> }

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>()
  async increment(key: string, windowMs: number) { const now = Date.now(); const current = this.entries.get(key); if (!current || current.resetAt <= now) { const next = { count: 1, resetAt: now + windowMs }; this.entries.set(key, next); return next }; current.count += 1; return current }
}

export const rateLimit = (store: RateLimitStore, max: number, windowMs: number) => new Elysia({ name: 'rate-limit' }).onBeforeHandle(async ({ request, set }) => { const key = request.headers.get('x-owner-id') ?? request.headers.get('x-forwarded-for') ?? 'anonymous'; const result = await store.increment(key, windowMs); set.headers['x-ratelimit-limit'] = String(max); set.headers['x-ratelimit-remaining'] = String(Math.max(0, max - result.count)); set.headers['x-ratelimit-reset'] = String(result.resetAt); if (result.count > max) { set.status = 429; return { code: 'RATE_LIMITED', message: 'Too many requests' } } })
