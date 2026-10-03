import cors from '@elysiajs/cors'
import openapi from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import type { AppConfig } from './config/env'
import { healthRoutes } from './modules/health/routes'
import { InMemorySearchIndex } from './modules/search/in-memory-index'
import { SearchService } from './modules/search/service'
import { searchRoutes } from './modules/search/routes'
import { InMemoryAnalysisRepository } from './modules/analysis/repository'
import { AnalysisOrchestrator } from './modules/analysis/orchestrator'
import { FakeAiProvider } from './modules/analysis/provider'
import { InMemoryPostSource, AnalysisPipeline } from './modules/analysis/pipeline'
import { InMemoryDerivedPostStore } from './modules/analysis/events'
import { InMemoryAnalysisMetrics } from './modules/analysis/observability'
import { analysisRoutes } from './modules/analysis/routes'
import { TagSuggestionService } from './modules/search/suggestions'

export const createApp = (config: AppConfig) => {
  const repository = new InMemoryAnalysisRepository()
  const derivedStore = new InMemoryDerivedPostStore()
  const source = new InMemoryPostSource()
  const metrics = new InMemoryAnalysisMetrics()
  const orchestrator = new AnalysisOrchestrator(repository, new AnalysisPipeline(source, derivedStore, new FakeAiProvider()), 3)
  const searchIndex = new InMemorySearchIndex()
  const searchService = new SearchService(searchIndex)
  return new Elysia({ name: 'saveyour-tech-api' })
    .use(openapi({ documentation: { info: { title: 'saveyour.tech API', version: '0.1.0' } } }))
    .use(cors({ origin: config.corsOrigins.length === 0 ? true : config.corsOrigins }))
    .onError(({ code, error, set }) => {
      const requestId = crypto.randomUUID()
      set.status = code === 'NOT_FOUND' ? 404 : 500
      const detail = error instanceof Error ? error.message : undefined
      return {
        code: code === 'NOT_FOUND' ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: code === 'NOT_FOUND' ? 'Route not found' : 'An unexpected error occurred',
        requestId,
        ...(config.appEnv === 'development' && detail ? { detail } : {})
      }
    })
    .use(healthRoutes)
    .use(analysisRoutes(orchestrator, repository, metrics))
    .use(searchRoutes(searchService, new TagSuggestionService(derivedStore)))
    .get('/', () => ({ name: 'saveyour.tech API', status: 'ok' as const, version: '0.1.0' }))
}
