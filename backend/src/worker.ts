import { loadConfig } from './config/env'
import { MongoDatabase } from './infrastructure/mongo/client'
import { MongoAnalysisRepository } from './infrastructure/mongo/analysis-repository'
import { MongoDerivedPostStore } from './infrastructure/mongo/derived-post-store'
import { MongoOutbox } from './infrastructure/mongo/outbox'

const config = loadConfig()
const mongo = new MongoDatabase({ uri: config.mongoUri, database: config.mongoDatabase })
await mongo.connect()
const repository = new MongoAnalysisRepository(mongo)
const derived = new MongoDerivedPostStore(mongo)
const outbox = new MongoOutbox(mongo)
await Promise.all([repository.ensureIndexes(), derived.ensureIndexes(), outbox.ensureIndexes()])
console.log(`Analysis worker infrastructure ready for ${config.mongoDatabase}`)

const shutdown = async () => { await mongo.close(); process.exit(0) }
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
await new Promise(() => undefined)
