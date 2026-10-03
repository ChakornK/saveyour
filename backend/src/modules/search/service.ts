import type { SearchIndex, SearchResponse, ScopedSearchRequest } from './contracts'

export class SearchService {
  constructor(private readonly index: SearchIndex) {}

  async search(request: ScopedSearchRequest): Promise<SearchResponse> {
    const started = performance.now()
    const queryId = crypto.randomUUID()
    const limit = Math.min(Math.max(request.limit ?? 20, 1), 100)
    const hits = await this.index.query({ ...request, limit: undefined })
    const offset = request.cursor ? Number.parseInt(request.cursor, 10) : 0
    const results = hits.slice(offset, offset + limit).map((hit) => ({
      ...hit,
      explanation: hit.matchedFields.length > 0 ? `Matched ${hit.matchedFields.join(' and ')}` : undefined
    }))
    return {
      queryId,
      results,
      ...(offset + limit < hits.length ? { nextCursor: String(offset + limit) } : {}),
      state: 'complete',
      latencyMs: Math.round(performance.now() - started)
    }
  }

  async suggestions(ownerId: string, query: string, tags: string[]) {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return [...new Set(tags.map((tag) => tag.trim().toLocaleLowerCase()).filter((tag) => tag && tag.includes(normalizedQuery)))].slice(0, 10)
  }
}
