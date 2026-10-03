import type { Collection } from 'mongodb'
import type { AnalysisEvent, EventPublisher } from '../../modules/analysis/events'
import type { MongoDatabase } from './client'

interface OutboxRecord { eventId: string; event: AnalysisEvent; status: 'pending' | 'delivered'; attempts: number; createdAt: string; nextAttemptAt?: string }

export class MongoOutbox implements EventPublisher {
  private collection?: Collection<OutboxRecord>
  constructor(private readonly mongo: MongoDatabase) {}
  private get events() { return this.collection ??= this.mongo.db().collection<OutboxRecord>('outbox_events') }
  async ensureIndexes() { await this.events.createIndex({ eventId: 1 }, { unique: true }); await this.events.createIndex({ status: 1, nextAttemptAt: 1 }) }
  async publish(event: AnalysisEvent) { const record = { eventId: crypto.randomUUID(), event, status: 'pending' as const, attempts: 0, createdAt: new Date().toISOString() }; await this.events.insertOne(record) }
  async pending(limit = 100) { return this.events.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(limit).toArray() }
  async markDelivered(eventId: string) { await this.events.updateOne({ eventId }, { $set: { status: 'delivered' } }) }
  async markRetry(eventId: string, attempts: number, nextAttemptAt: string) { await this.events.updateOne({ eventId }, { $set: { attempts, nextAttemptAt } }) }
}
