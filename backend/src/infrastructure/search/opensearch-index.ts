import type { RawSearchHit, SearchIndex, ScopedSearchRequest } from '../../modules/search/contracts'
import type { SearchDocument } from '../../modules/analysis/contracts'

export interface OpenSearchConfig { url: string; index: string; apiKey?: string }

export class OpenSearchIndex implements SearchIndex {
  constructor(private readonly config: OpenSearchConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers)
    headers.set('content-type', 'application/json')
    if (this.config.apiKey) headers.set('authorization', `ApiKey ${this.config.apiKey}`)
    const response = await fetch(`${this.config.url}/${this.config.index}${path}`, { ...init, headers })
    if (!response.ok) throw new Error(`Search request failed with status ${response.status}`)
    return response.json() as Promise<T>
  }

  async upsert(document: SearchDocument) { await this.request(`/_doc/${encodeURIComponent(document.documentId)}`, { method: 'PUT', body: JSON.stringify(document) }) }
  async delete(documentId: string) { const response = await fetch(`${this.config.url}/${this.config.index}/_doc/${encodeURIComponent(documentId)}`, { method: 'DELETE', headers: this.config.apiKey ? { authorization: `ApiKey ${this.config.apiKey}` } : undefined }); if (!response.ok && response.status !== 404) throw new Error(`Search delete failed with status ${response.status}`) }
  async query(request: ScopedSearchRequest) {
    const filters: Array<{ term: Record<string, string> }> = [{ term: { ownerId: request.ownerId } }]
    if (request.filters?.platform) filters.push({ term: { platform: request.filters.platform } })
    if (request.filters?.analysisStatus) filters.push({ term: { analysisStatus: request.filters.analysisStatus } })
    if (request.filters?.mediaType) filters.push({ term: { mediaKinds: request.filters.mediaType } })
    const body = { size: Math.min(request.limit ?? 20, 100), search_after: request.cursor ? [request.cursor] : undefined, sort: [{ _score: 'desc' }, { 'documentId.keyword': 'asc' }], query: { bool: { must: request.rawQuery ? [{ multi_match: { query: request.rawQuery, fields: ['text', 'tags'] } }] : [{ match_all: {} }], filter: filters, ...(request.vector ? { should: [{ knn: { embedding: { vector: request.vector, k: Math.min(request.limit ?? 20, 100) } } }] } : {}) } } }
    const result = await this.request<{ hits?: { hits?: Array<{ _score?: number; sort?: Array<string | number>; _source: SearchDocument; highlight?: Record<string, string[]> }> } }>('/_search', { method: 'POST', body: JSON.stringify(body) })
    return (result.hits?.hits ?? []).map((hit): RawSearchHit => ({ document: hit._source, score: hit._score ?? 0, sortKey: String(hit.sort?.[1] ?? hit.sort?.[0] ?? hit._source.documentId), matchedFields: Object.keys(hit.highlight ?? {}) }))
  }
  async rebuild(documents: AsyncIterable<SearchDocument>) { let count = 0; for await (const document of documents) { await this.upsert(document); count += 1 }; return count }
  async health() { try { await fetch(`${this.config.url}/_cluster/health`); return { status: 'healthy' as const } } catch (error) { return { status: 'unhealthy' as const, details: error instanceof Error ? error.message : 'Search unavailable' } } }
}
