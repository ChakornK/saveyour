import { describe, expect, test } from 'bun:test'
import { AnalysisOrchestrator } from '../src/modules/analysis/orchestrator'
import { InMemoryAnalysisRepository } from '../src/modules/analysis/repository'
import { InMemoryJobQueue } from '../src/modules/analysis/queue'
import { InMemorySearchIndex } from '../src/modules/search/in-memory-index'

const successfulHandler = { run: async () => undefined }

describe('analysis orchestration', () => {
  test('enqueue is idempotent for a post version', async () => {
    const repository = new InMemoryAnalysisRepository()
    const orchestrator = new AnalysisOrchestrator(repository, successfulHandler)
    const first = await orchestrator.enqueue('post-1', 'owner-1', 1)
    const second = await orchestrator.enqueue('post-1', 'owner-1', 1)
    expect(second.id).toBe(first.id)
  })

  test('successful processing converges to completed', async () => {
    const repository = new InMemoryAnalysisRepository()
    const orchestrator = new AnalysisOrchestrator(repository, successfulHandler)
    const job = await orchestrator.enqueue('post-1', 'owner-1', 1)
    const result = await orchestrator.process(job.id)
    expect(result.status).toBe('completed')
    expect(Object.values(result.stages).every((stage) => stage.status === 'completed')).toBe(true)
  })

  test('queue claims and acknowledges jobs', async () => {
    const repository = new InMemoryAnalysisRepository()
    const orchestrator = new AnalysisOrchestrator(repository, successfulHandler)
    const job = await orchestrator.enqueue('post-1', 'owner-1', 1)
    const queue = new InMemoryJobQueue(repository)
    await queue.enqueue(job.id)
    expect((await queue.claim())?.id).toBe(job.id)
    expect(queue.depth).toBe(0)
    await queue.acknowledge(job.id)
  })
})

describe('search index', () => {
  test('enforces owner scope and filters', async () => {
    const index = new InMemorySearchIndex()
    await index.upsert({ documentId: '1', ownerId: 'owner-1', postId: 'post-1', text: 'blueprint design', tags: ['design'], albumIds: [], mediaKinds: ['image'], analysisStatus: 'completed', indexVersion: 1 })
    await index.upsert({ documentId: '2', ownerId: 'owner-2', postId: 'post-2', text: 'blueprint design', tags: ['design'], albumIds: [], mediaKinds: ['image'], analysisStatus: 'completed', indexVersion: 1 })
    const hits = await index.query({ ownerId: 'owner-1', rawQuery: 'design', filters: { mediaType: 'image' } })
    expect(hits.map((hit) => hit.document.documentId)).toEqual(['1'])
  })
})
