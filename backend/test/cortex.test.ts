import { describe, expect, test } from 'bun:test'
import { FakeCortexClient } from '../src/infrastructure/ai/cortex-client'
import { CortexAnalysisProvider } from '../src/infrastructure/ai/cortex-provider'
import { CortexError } from '../src/infrastructure/ai/cortex-types'

const config = { model: 'test-model', embeddingModel: 'test-embedding', maxAttempts: 3 }
const image = { artifactUri: 's3://private/image.jpg', contentType: 'image/jpeg', sizeBytes: 100, ownerId: 'owner-1', postId: 'post-1' }

describe('CortexAnalysisProvider', () => {
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

  test('does not retry capability errors', async () => {
    let attempts = 0
    const client = new FakeCortexClient(() => { attempts += 1; throw new CortexError('capability', 'AI_TRANSCRIBE unavailable') })
    await expect(new CortexAnalysisProvider(client, config).transcribeAudio({ ...image, artifactUri: 's3://private/audio.wav', contentType: 'audio/wav' })).rejects.toMatchObject({ category: 'capability' })
    expect(attempts).toBe(1)
  })
})
