import type { Collection } from "mongodb";
import type {
  DerivedPost,
  DerivedPostStore,
} from "../../modules/analysis/events";
import type { MongoDatabase } from "./client";

export class MongoDerivedPostStore implements DerivedPostStore {
  private collection?: Collection<DerivedPost>;
  constructor(private readonly mongo: MongoDatabase) {}
  private get posts() {
    return (this.collection ??= this.mongo
      .db()
      .collection<DerivedPost>("derived_posts"));
  }
  async ensureIndexes() {
    await this.posts.createIndex({ postId: 1, version: 1 }, { unique: true });
    await this.posts.createIndex({ ownerId: 1, updatedAt: -1 });
  }
  async get(postId: string, version: number) {
    const post = await this.posts.findOne({ postId, version });
    return post ? structuredClone(post) : undefined;
  }
  async save(post: DerivedPost) {
    await this.posts.replaceOne(
      { postId: post.postId, version: post.version },
      post,
      { upsert: true },
    );
    return structuredClone(post);
  }
  async list(ownerId?: string) {
    return (await this.posts.find(ownerId ? { ownerId } : {}).toArray()).map(
      (post) => structuredClone(post),
    );
  }
  async delete(postId: string, version: number) {
    await this.posts.deleteOne({ postId, version });
  }
}
