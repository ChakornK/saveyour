import type { SearchIndex } from '../../modules/search/contracts'
import { ensureMeilisearchIndex } from './meilisearch-mapping'
import type { MeilisearchConfig } from './meilisearch-index'

export const initializeSearchIndex = async (index: SearchIndex, config?: MeilisearchConfig) => {
  if (config) await ensureMeilisearchIndex(config)
  const health = await index.health()
  if (health.status !== 'healthy') throw new Error(health.details ?? 'Search index is unavailable')
}
