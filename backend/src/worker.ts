import { loadConfig } from './config/env'
import { MongoDatabase } from './infrastructure/mongo/client'
import { MongoAnalysisRepository } from './infrastructure/mongo/analysis-repository'
import { MongoDerivedPostStore } from './infrastructure/mongo/derived-post-store'
import { MongoPostSource } from './infrastructure/mongo/post-source'
import { MongoOutbox } from './infrastructure/mongo/outbox'
import { OutboxWorker } from './infrastructure/mongo/outbox-worker'
import { RedisClientAdapter } from './infrastructure/queue/redis-client'
import { RedisJobQueue } from './infrastructure/queue/redis-queue'
import { AnalysisWorker } from './modules/analysis/queue'
import { AnalysisOrchestrator } from './modules/analysis/orchestrator'
import { AnalysisPipeline } from './modules/analysis/pipeline'
import { GeminiProvider } from './infrastructure/ai/gemini-provider'
import { SnowflakeCortexClient } from './infrastructure/ai/cortex-client'
import { CortexAnalysisProvider } from './infrastructure/ai/cortex-provider'
import { MeilisearchIndex } from './infrastructure/search/meilisearch-index'
import { SearchEventDelivery } from './infrastructure/search/event-index-delivery'

const config = loadConfig()
const mongo = new MongoDatabase({ uri: config.mongoUri, database: config.mongoDatabase })
await mongo.connect()
const repository = new MongoAnalysisRepository(mongo)
const derived = new MongoDerivedPostStore(mongo)
const source = new MongoPostSource(mongo)
const outbox = new MongoOutbox(mongo)
await Promise.all([repository.ensureIndexes(), derived.ensureIndexes(), source.ensureIndexes(), outbox.ensureIndexes()])

if (!config.redisUrl) throw new Error('REDIS_URL is required for the worker')
if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY is required for the worker')
if (!config.searchUrl) throw new Error('SEARCH_URL is required for the worker')
const redis = new RedisClientAdapter(config.redisUrl)
await redis.connect()
const search = new MeilisearchIndex({ url: config.searchUrl, index: config.searchIndex, apiKey: config.searchApiKey })
const provider = config.snowflakeAccount && config.snowflakeUser && config.snowflakeWarehouse && config.snowflakeDatabase && config.snowflakeSchema && (config.snowflakePassword || config.snowflakeToken)
  ? new CortexAnalysisProvider(new SnowflakeCortexClient({ account: config.snowflakeAccount, user: config.snowflakeUser, password: config.snowflakePassword, token: config.snowflakeToken, warehouse: config.snowflakeWarehouse, database: config.snowflakeDatabase, schema: config.snowflakeSchema, endpoint: config.snowflakeEndpoint, timeoutMs: config.cortexTimeoutMs ?? 10_000 }), { model: config.cortexModel ?? 'claude-3-5-sonnet', embeddingModel: config.cortexEmbeddingModel ?? 'snowflake-arctic-embed-m-v1.5', maxAttempts: config.cortexMaxAttempts ?? 3 })
  : new GeminiProvider({ apiKey: config.geminiApiKey!, model: config.geminiModel, timeoutMs: config.geminiTimeoutMs, maxAttempts: config.geminiMaxAttempts })
const delivery = new SearchEventDelivery(search)
const outboxWorker = new OutboxWorker(outbox, delivery)
const orchestrator = new AnalysisOrchestrator(repository, new AnalysisPipeline(source, derived, provider), 3)
const queue = new RedisJobQueue(redis, repository)
const worker = new AnalysisWorker(queue, async (jobId) => { await orchestrator.process(jobId) })
let stopping = false

const loop = async () => {
  while (!stopping) {
    await worker.recover()
    const processed = await worker.runOnce()
    await outboxWorker.runOnce()
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

console.log(`Analysis worker running with concurrency ${config.workerConcurrency}`)
const running = Promise.all(Array.from({ length: config.workerConcurrency }, () => loop()))
const shutdown = async () => { stopping = true; await running; await redis.close(); await mongo.close(); process.exit(0) }
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
await running
