import type { Collection } from 'mongodb'
import type { AcceptedPost, PostSource } from '../../modules/analysis/pipeline'
import type { MongoDatabase } from './client'

export class MongoPostSource implements PostSource {
  private collection?: Collection<AcceptedPost>
  constructor(private readonly mongo: MongoDatabase) {}
  private get posts() { return this.collection ??= this.mongo.db().collection<AcceptedPost>('saved_posts') }
  async ensureIndexes() { await this.posts.createIndex({ postId: 1, version: 1 }, { unique: true }); await this.posts.createIndex({ ownerId: 1, updatedAt: -1 }) }
  async get(postId: string, version: number) { const post = await this.posts.findOne({ postId, version }); return post ? structuredClone(post) : undefined }
}
