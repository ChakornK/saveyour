import { describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config/env'

const request = (app: ReturnType<typeof createApp>, path: string, init?: RequestInit) => app.handle(new Request(`http://localhost${path}`, init))

describe('API routes', () => {
  test('accepts an owner-scoped post and creates a job', async () => {
    const response = await request(createApp(loadConfig({ APP_ENV: 'test' })), '/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-owner-id': 'owner-1' },
      body: JSON.stringify({ postId: 'post-api-1', version: 1, sourceText: 'A saved design', mediaKinds: ['image'] })
    })
    expect(response.status).toBe(200)
    const body = await response.json() as { status: string; jobId: string }
    expect(body.status).toBe('accepted')
    expect(body.jobId).toBeString()
  })

  test('rejects posts without an owner identity', async () => {
    const response = await request(createApp(loadConfig({ APP_ENV: 'test' })), '/v1/posts', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'post-api-2', version: 1, sourceText: 'Missing owner' })
    })
    expect(response.status).toBe(401)
  })

  test('requires owner scope for search', async () => {
    const response = await request(createApp(loadConfig({ APP_ENV: 'test' })), '/v1/search?q=design')
    expect(response.status).toBe(401)
  })
})
