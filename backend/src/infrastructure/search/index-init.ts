import type { SearchIndex } from '../../modules/search/contracts'

export const initializeSearchIndex = async (index: SearchIndex) => {
  const health = await index.health()
  if (health.status !== 'healthy') throw new Error(health.details ?? 'Search index is unavailable')
}
