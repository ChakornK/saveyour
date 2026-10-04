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
    const { _id, ...document } = post as DerivedPost & { _id?: unknown };
    const existing = await this.posts.findOne(
      { postId: post.postId, version: post.version },
      { projection: { _id: 1 } },
    );
    if (existing) {
      await this.posts.updateOne({ _id: existing._id }, { $set: document });
    } else {
      await this.posts.insertOne(document);
    }
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
