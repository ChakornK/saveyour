import type { MeilisearchConfig } from './meilisearch-index'

export const ensureMeilisearchIndex = async (config: MeilisearchConfig) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (config.apiKey) headers.set('authorization', `Bearer ${config.apiKey}`)
  const base = `${config.url}/indexes/${encodeURIComponent(config.index)}`
  const exists = await fetch(base, { method: 'GET', headers })
  if (exists.ok) return false
  if (exists.status !== 404) throw new Error(`Search index check failed with status ${exists.status}`)
  const response = await fetch(`${config.url}/indexes`, { method: 'POST', headers, body: JSON.stringify({ uid: config.index, primaryKey: 'documentId' }) })
  if (!response.ok && response.status !== 409) throw new Error(`Search index creation failed with status ${response.status}`)
  const settings = await fetch(`${base}/settings`, { method: 'PATCH', headers, body: JSON.stringify({ filterableAttributes: ['ownerId', 'platform', 'analysisStatus', 'mediaKinds'], searchableAttributes: ['text', 'tags'] }) })
  if (!settings.ok) throw new Error(`Search index settings failed with status ${settings.status}`)
  return true
}
