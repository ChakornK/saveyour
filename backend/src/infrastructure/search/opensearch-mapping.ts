import type { OpenSearchConfig } from './opensearch-index'

export const ensureOpenSearchIndex = async (config: OpenSearchConfig) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (config.apiKey) headers.set('authorization', `ApiKey ${config.apiKey}`)
  const base = `${config.url}/${config.index}`
  const exists = await fetch(base, { method: 'HEAD', headers })
  if (exists.ok) return false
  if (exists.status !== 404) throw new Error(`Search index check failed with status ${exists.status}`)
  const response = await fetch(base, { method: 'PUT', headers, body: JSON.stringify({
    mappings: { properties: {
      documentId: { type: 'keyword' }, ownerId: { type: 'keyword' }, postId: { type: 'keyword' },
      text: { type: 'text' }, tags: { type: 'keyword' }, platform: { type: 'keyword' }, albumIds: { type: 'keyword' },
      capturedAt: { type: 'date' }, mediaKinds: { type: 'keyword' }, analysisStatus: { type: 'keyword' },
      embedding: { type: 'dense_vector', dims: 8, index: true, similarity: 'cosine' }, indexVersion: { type: 'integer' }
    } }
  }) })
  if (!response.ok) throw new Error(`Search index creation failed with status ${response.status}`)
  return true
}
