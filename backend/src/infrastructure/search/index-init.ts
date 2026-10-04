import type { SearchIndex } from '../../modules/search/contracts'
import { ensureOpenSearchIndex } from './opensearch-mapping'
import type { OpenSearchConfig } from './opensearch-index'

export const initializeSearchIndex = async (index: SearchIndex, config?: OpenSearchConfig) => {
  if (config) await ensureOpenSearchIndex(config)
  const health = await index.health()
  if (health.status !== 'healthy') throw new Error(health.details ?? 'Search index is unavailable')
}
