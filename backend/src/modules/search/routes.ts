import { Elysia, t } from 'elysia'
import type { SearchService } from './service'
import type { SearchFilters } from './contracts'
import type { TagSuggestionService } from './suggestions'
import { ownerScope } from '../auth/owner-scope'

export const searchRoutes = (service: SearchService, suggestions?: TagSuggestionService) => new Elysia({ prefix: '/v1/search' }).use(ownerScope)
  .get('/', async ({ query, headers }) => {
    const ownerId = headers['x-owner-id']
    const filters: SearchFilters = {
      ...(query.tags ? { tags: query.tags.split(',').map((tag) => tag.trim()).filter(Boolean) } : {}),
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.albumId ? { albumId: query.albumId } : {}),
      ...(query.mediaType ? { mediaType: query.mediaType } : {})
    }
    return service.search({ ownerId, rawQuery: query.q, filters, cursor: query.cursor, limit: query.limit ? Number(query.limit) : undefined })
  }, { query: t.Object({ q: t.String({ default: '' }), tags: t.Optional(t.String()), platform: t.Optional(t.String()), albumId: t.Optional(t.String()), mediaType: t.Optional(t.String()), cursor: t.Optional(t.String()), limit: t.Optional(t.String()) }) })
  .get('/suggestions', async ({ query, headers, set }) => {
    const ownerId = headers['x-owner-id']
    if (!suggestions) { set.status = 503; return { code: 'UNAVAILABLE', message: 'Search suggestions are unavailable' } }
    return suggestions.suggest(ownerId, query.q, query.limit ? Number(query.limit) : 10)
  }, { query: t.Object({ q: t.String({ default: '' }), limit: t.Optional(t.String()) }) })
  .get('/health', () => ({ status: 'healthy' as const }))
