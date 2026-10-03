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
import { MongoDatabase } from './infrastructure/mongo/client'
import { MongoAnalysisRepository } from './infrastructure/mongo/analysis-repository'
import { MongoDerivedPostStore } from './infrastructure/mongo/derived-post-store'
import { MongoPostSource } from './infrastructure/mongo/post-source'
import { MongoOutbox } from './infrastructure/mongo/outbox'
import { OpenSearchIndex } from './infrastructure/search/opensearch-index'
import { SearchEventDelivery } from './infrastructure/search/event-index-delivery'
import { GeminiProvider } from './infrastructure/ai/gemini-provider'

export const createApp = (config: AppConfig) => {
  const useProduction = config.appEnv === 'production'
  const mongo = useProduction ? new MongoDatabase({ uri: config.mongoUri, database: config.mongoDatabase }) : undefined
  const initialize = async () => {
    if (!mongo) return
    await mongo.connect()
    await Promise.all([
      new MongoAnalysisRepository(mongo).ensureIndexes(),
      new MongoDerivedPostStore(mongo).ensureIndexes(),
      new MongoPostSource(mongo).ensureIndexes(),
      new MongoOutbox(mongo).ensureIndexes()
    ])
  }
  const repository = useProduction ? new MongoAnalysisRepository(mongo!) : new InMemoryAnalysisRepository()
  const derivedStore = useProduction ? new MongoDerivedPostStore(mongo!) : new InMemoryDerivedPostStore()
  const source = useProduction ? new MongoPostSource(mongo!) : new InMemoryPostSource()
  const searchIndex = useProduction && config.searchUrl ? new OpenSearchIndex({ url: config.searchUrl, index: config.searchIndex, apiKey: config.searchApiKey }) : new InMemorySearchIndex()
  const searchService = new SearchService(searchIndex)
  const metrics = new InMemoryAnalysisMetrics()
  const provider = useProduction && config.geminiApiKey ? new GeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel, timeoutMs: config.geminiTimeoutMs, maxAttempts: config.geminiMaxAttempts }) : new FakeAiProvider()
  const pipeline = new AnalysisPipeline(source, derivedStore, provider)
  const orchestrator = new AnalysisOrchestrator(repository, pipeline, 3)
  const app = new Elysia({ name: 'saveyour-tech-api' })
    .use(openapi({ documentation: { info: { title: 'saveyour.tech API', version: '0.1.0' } } }))
    .use(cors({ origin: config.corsOrigins.length === 0 ? true : config.corsOrigins }))
    .onError(({ code, error, set }) => { const requestId = crypto.randomUUID(); set.status = code === 'NOT_FOUND' ? 404 : 500; const detail = error instanceof Error ? error.message : undefined; return { code: code === 'NOT_FOUND' ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: code === 'NOT_FOUND' ? 'Route not found' : 'An unexpected error occurred', requestId, ...(config.appEnv === 'development' && detail ? { detail } : {}) } })
    .use(healthRoutes)
    .use(analysisRoutes(orchestrator, repository, metrics))
    .use(searchRoutes(searchService, new TagSuggestionService(derivedStore)))
    .get('/', () => ({ name: 'saveyour.tech API', status: 'ok' as const, version: '0.1.0' }))
  return Object.assign(app, { initialize, close: async () => mongo?.close() })
}
