import { MongoClient, type Db } from 'mongodb'

export interface MongoConfig { uri: string; database: string }

export class MongoDatabase {
  private readonly client: MongoClient
  private database?: Db

  constructor(private readonly config: MongoConfig) { this.client = new MongoClient(config.uri) }

  async connect() { await this.client.connect(); this.database = this.client.db(this.config.database); return this.database }
  db() { if (!this.database) throw new Error('MongoDB is not connected'); return this.database }
  async ping() { await this.db().command({ ping: 1 }); return true }
  async close() { await this.client.close(); this.database = undefined }
}
