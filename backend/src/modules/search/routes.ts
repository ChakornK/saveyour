import { Elysia, t } from 'elysia'
import type { SearchService } from './service'
import type { SearchFilters } from './contracts'

export const searchRoutes = (service: SearchService) => new Elysia({ prefix: '/v1/search' })
  .get('/', async ({ query, headers }) => {
    const ownerId = headers['x-owner-id']
    if (!ownerId) return new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'x-owner-id is required' }), { status: 401, headers: { 'content-type': 'application/json' } })
    const filters: SearchFilters = {
      ...(query.tags ? { tags: query.tags.split(',').map((tag) => tag.trim()).filter(Boolean) } : {}),
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.albumId ? { albumId: query.albumId } : {}),
      ...(query.mediaType ? { mediaType: query.mediaType } : {})
    }
    return service.search({ ownerId, rawQuery: query.q, filters, cursor: query.cursor, limit: query.limit ? Number(query.limit) : undefined })
  }, { query: t.Object({ q: t.String({ default: '' }), tags: t.Optional(t.String()), platform: t.Optional(t.String()), albumId: t.Optional(t.String()), mediaType: t.Optional(t.String()), cursor: t.Optional(t.String()), limit: t.Optional(t.String()) }) })
  .get('/health', () => ({ status: 'healthy' as const }))
