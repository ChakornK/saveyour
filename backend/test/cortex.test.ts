import { afterEach, describe, expect, test } from 'bun:test'
import { FakeCortexClient, SnowflakeCortexClient, redactCortexDiagnostic, redactCortexValue } from '../src/infrastructure/ai/cortex-client'
import { CortexAnalysisProvider } from '../src/infrastructure/ai/cortex-provider'
import { CortexError } from '../src/infrastructure/ai/cortex-types'

const config = { model: 'test-model', embeddingModel: 'test-embedding', maxAttempts: 3 }
const image = { artifactUri: 's3://private/image.jpg', contentType: 'image/jpeg', sizeBytes: 100, ownerId: 'owner-1', postId: 'post-1' }
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

describe('SnowflakeCortexClient', () => {
  test.skip('uses Basic authentication for password credentials', async () => {
    let request: Request | undefined
    globalThis.fetch = (async (input, init) => { request = new Request(input, init); return new Response('{}', { status: 200 }) }) as typeof fetch
    const client = new SnowflakeCortexClient({ account: 'account', user: 'user', password: 'password', warehouse: 'warehouse', database: 'database', schema: 'schema' })
    await client.executeFunction('CURRENT_VERSION', [])
    expect(request?.headers.get('authorization')).toBe(`Basic ${btoa('user:password')}`)
  })

  test.skip('uses Bearer authentication for tokens', async () => {
    let request: Request | undefined
    globalThis.fetch = (async (input, init) => { request = new Request(input, init); return new Response('{}', { status: 200 }) }) as typeof fetch
    const client = new SnowflakeCortexClient({ account: 'account', user: 'user', token: 'token', warehouse: 'warehouse', database: 'database', schema: 'schema' })
    await client.executeFunction('CURRENT_VERSION', [])
    expect(request?.headers.get('authorization')).toBe('Bearer token')
  })
})

describe('CortexAnalysisProvider', () => {
  test('redacts credentials and signed URLs from diagnostics', () => {
    const result = redactCortexDiagnostic('password=secret https://example.test/file.wav?sig=private')
    expect(result).not.toContain('secret')
    expect(result).not.toContain('example.test')
  })

  test('redacts nested credential fields from provider values', () => {
    expect(redactCortexValue({ password: 'secret', nested: { token: 'private' }, text: 'safe' })).toEqual({ password: '[REDACTED]', nested: { token: '[REDACTED]' }, text: 'safe' })
  })

  test('normalizes image results', async () => {
    const client = new FakeCortexClient(() => ({ caption: 'A mountain', tags: ['mountain'], observations: ['outdoor'], warnings: [] }))
    const result = await new CortexAnalysisProvider(client, config).analyzeImage(image)
    expect(result.caption).toBe('A mountain')
    expect(result.tags).toEqual(['mountain'])
    expect(result.provider).toBe('snowflake-cortex')
  })

  test('preserves input timestamps for frame results', async () => {
    const client = new FakeCortexClient(() => ({ frames: [{ caption: 'first' }, { caption: 'second' }], warnings: [] }))
    const result = await new CortexAnalysisProvider(client, config).analyzeFrames({ mediaAssetId: 'asset-1', frames: [{ artifactUri: 's3://frame-1', timestampMs: 1000, contentType: 'image/jpeg', sizeBytes: 20 }, { artifactUri: 's3://frame-2', timestampMs: 3000, contentType: 'image/jpeg', sizeBytes: 20 }] })
    expect(result.frames.map((frame) => frame.timestampMs)).toEqual([1000, 3000])
  })

  test('creates a fallback segment when transcription has no timestamps', async () => {
    const client = new FakeCortexClient(() => ({ text: 'hello world', language: 'en' }))
    const result = await new CortexAnalysisProvider(client, config).transcribeAudio({ ...image, artifactUri: 's3://private/audio.wav', contentType: 'audio/wav', durationMs: 1200 })
    expect(result.segments).toEqual([{ sequence: 0, startMs: 0, endMs: 1200, text: 'hello world' }])
  })

  test('rejects invalid embedding values', async () => {
    const client = new FakeCortexClient(() => [0.1, Number.NaN])
    await expect(new CortexAnalysisProvider(client, config).generateTextEmbedding({ entityType: 'post', entityId: 'post-1', text: 'hello' })).rejects.toMatchObject({ category: 'response' })
  })

  test('retries transient errors and then succeeds', async () => {
    let attempts = 0
    const client = new FakeCortexClient(() => { attempts += 1; if (attempts < 3) throw new CortexError('transient', 'throttled'); return { caption: 'ok', tags: [], observations: [], warnings: [] } })
    const result = await new CortexAnalysisProvider(client, config).analyzeImage(image)
    expect(result.caption).toBe('ok')
    expect(attempts).toBe(3)
  })

  test('records attempts and outcome metrics', async () => {
    const client = new FakeCortexClient(() => ({ caption: 'ok', tags: [], observations: [], warnings: [] }))
    const provider = new CortexAnalysisProvider(client, config)
    await provider.analyzeImage(image)
    expect(provider.getMetrics()).toMatchObject([{ operation: 'AI_COMPLETE', attempts: 1, outcome: 'success' }])
  })

  test('rejects unsupported audio before invoking Cortex', async () => {
    let calls = 0
    const client = new FakeCortexClient(() => { calls += 1; return { text: 'unexpected' } })
    await expect(new CortexAnalysisProvider(client, config).transcribeAudio({ ...image, artifactUri: 's3://private/video.mp4', contentType: 'video/mp4' })).rejects.toMatchObject({ category: 'input' })
    expect(calls).toBe(0)
  })

  test('bounds raw transcription output', async () => {
    const client = new FakeCortexClient(() => ({ text: 'x'.repeat(2000), language: 'en' }))
    const result = await new CortexAnalysisProvider(client, config).transcribeAudio({ ...image, artifactUri: 's3://private/audio.wav', contentType: 'audio/wav' })
    expect(JSON.stringify(result.rawProviderResult).length).toBeLessThan(1200)
  })

  test('reports Cortex capability status', async () => {
    const client = new FakeCortexClient()
    const result = await new CortexAnalysisProvider(client, config).checkCapabilities()
    expect(result).toMatchObject({ status: 'available', functions: { AI_COMPLETE: true, AI_TRANSCRIBE: true, AI_EMBED: true } })
  })

  test('does not retry capability errors', async () => {
    let attempts = 0
    const client = new FakeCortexClient(() => { attempts += 1; throw new CortexError('capability', 'AI_TRANSCRIBE unavailable') })
    await expect(new CortexAnalysisProvider(client, config).transcribeAudio({ ...image, artifactUri: 's3://private/audio.wav', contentType: 'audio/wav' })).rejects.toMatchObject({ category: 'capability' })
    expect(attempts).toBe(1)
  })
})
