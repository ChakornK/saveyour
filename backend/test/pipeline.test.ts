import { describe, expect, test } from 'bun:test'
import { AnalysisOrchestrator } from '../src/modules/analysis/orchestrator'
import { InMemoryAnalysisRepository } from '../src/modules/analysis/repository'
import { FakeAiProvider } from '../src/modules/analysis/provider'
import { AnalysisPipeline, InMemoryPostSource } from '../src/modules/analysis/pipeline'
import { InMemoryDerivedPostStore, InMemoryEventPublisher } from '../src/modules/analysis/events'
import { InMemorySearchIndex } from '../src/modules/search/in-memory-index'
import { SearchRebuilder } from '../src/modules/search/rebuild'
import { TagSuggestionService } from '../src/modules/search/suggestions'

describe('analysis pipeline', () => {
  test('preserves source and publishes index update after completion', async () => {
    const source = new InMemoryPostSource()
    source.add({ postId: 'post-1', ownerId: 'owner-1', version: 1, sourceText: 'A design system', mediaKinds: ['image'] })
    const derived = new InMemoryDerivedPostStore()
    const publisher = new InMemoryEventPublisher()
    const pipeline = new AnalysisPipeline(source, derived, new FakeAiProvider(), publisher)
    const repository = new InMemoryAnalysisRepository()
    const orchestrator = new AnalysisOrchestrator(repository, pipeline, 3, publisher)
    const job = await orchestrator.enqueue('post-1', 'owner-1', 1)
    const result = await orchestrator.process(job.id)
    const post = await derived.get('post-1', 1)
    expect(result.status).toBe('completed')
    expect(post?.sourceText).toBe('A design system')
    expect(publisher.events.some((event) => event.type === 'search.index-upsert')).toBe(true)
  })
})

describe('rebuild and suggestions', () => {
  test('rebuilds deterministic documents and scopes tags', async () => {
    const store = new InMemoryDerivedPostStore()
    await store.save({ postId: '1', ownerId: 'a', version: 1, sourceText: 'one', tags: ['Design', 'design'], albumIds: [], mediaKinds: [], status: 'completed', completedStages: [], updatedAt: new Date().toISOString() })
    await store.save({ postId: '2', ownerId: 'b', version: 1, sourceText: 'two', tags: ['Design'], albumIds: [], mediaKinds: [], status: 'completed', completedStages: [], updatedAt: new Date().toISOString() })
    const index = new InMemorySearchIndex()
    expect(await new SearchRebuilder(store, index).rebuild('a')).toBe(1)
    expect((await new TagSuggestionService(store).suggest('a', 'des')).map((item) => item.tag)).toEqual(['design'])
    expect((await index.query({ ownerId: 'b', rawQuery: '' })).length).toBe(0)
  })
})
