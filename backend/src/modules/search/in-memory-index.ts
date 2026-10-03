import type { RawSearchHit, SearchIndex, ScopedSearchRequest } from './contracts'
import type { SearchDocument } from '../analysis/contracts'

const tokenize = (value: string) => value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)

const matchesFilters = (document: SearchDocument, request: ScopedSearchRequest) => {
  const filters = request.filters
  if (document.ownerId !== request.ownerId) return false
  if (!filters) return true
  if (filters.tags?.some((tag) => !document.tags.includes(tag))) return false
  if (filters.platform && document.platform !== filters.platform) return false
  if (filters.albumId && !document.albumIds.includes(filters.albumId)) return false
  if (filters.analysisStatus && document.analysisStatus !== filters.analysisStatus) return false
  if (filters.mediaType && !document.mediaKinds.includes(filters.mediaType)) return false
  if (filters.capturedAfter && (!document.capturedAt || document.capturedAt < filters.capturedAfter)) return false
  if (filters.capturedBefore && (!document.capturedAt || document.capturedAt > filters.capturedBefore)) return false
  return true
}

export class InMemorySearchIndex implements SearchIndex {
  private readonly documents = new Map<string, SearchDocument>()

  async upsert(document: SearchDocument) {
    const current = this.documents.get(document.documentId)
    if (!current || document.indexVersion >= current.indexVersion) this.documents.set(document.documentId, structuredClone(document))
  }

  async delete(documentId: string) {
    this.documents.delete(documentId)
  }

  async query(request: ScopedSearchRequest): Promise<RawSearchHit[]> {
    const terms = tokenize(request.rawQuery)
    return [...this.documents.values()]
      .filter((document) => matchesFilters(document, request))
      .map((document) => {
        const fields: Array<[string, string]> = [['text', document.text], ['tags', document.tags.join(' ')]]
        const matchedFields = fields.filter(([, value]) => terms.some((term) => tokenize(value).includes(term))).map(([field]) => field)
        const score = terms.length === 0 ? 0 : matchedFields.reduce((total, field) => total + (field === 'tags' ? 2 : 1), 0)
        return { document, score, matchedFields }
      })
      .filter((hit) => terms.length === 0 || hit.score > 0)
      .sort((a, b) => b.score - a.score || a.document.documentId.localeCompare(b.document.documentId))
  }

  async rebuild(documents: AsyncIterable<SearchDocument>) {
    this.documents.clear()
    let count = 0
    for await (const document of documents) {
      await this.upsert(document)
      count += 1
    }
    return count
  }

  async health() {
    return { status: 'healthy' as const }
  }
}
