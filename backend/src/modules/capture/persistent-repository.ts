import type { Collection } from "mongodb";
import type { CaptureRepository } from "./repository";
import type { CaptureResult, PageCursor, PostPage, SavedPost } from "./types";
import type { MongoDatabase } from "../../infrastructure/mongo/client";

interface StoredIdempotency {
  ownerId: string;
  key: string;
  result: CaptureResult;
  createdAt: string;
}

export class MongoCaptureRepository implements CaptureRepository {
  private readonly posts: Collection<SavedPost>;
  private readonly idempotency: Collection<StoredIdempotency>;

  constructor(mongo: MongoDatabase) {
    const database = mongo.db();
    this.posts = database.collection<SavedPost>("capture_posts");
    this.idempotency = database.collection<StoredIdempotency>(
      "capture_idempotency",
    );
  }

  async ensureIndexes() {
    await this.posts.createIndex(
      { ownerId: 1, canonicalUrl: 1 },
      { unique: true, partialFilterExpression: { deletionState: "active" } },
    );
    await this.posts.createIndex({ ownerId: 1, capturedAt: -1, id: -1 });
    await this.posts.createIndex({ ownerId: 1, deletionState: 1 });
    await this.idempotency.createIndex(
      { ownerId: 1, key: 1 },
      { unique: true },
    );
  }

  findActiveByUrl(ownerId: string, canonicalUrl: string) {
    return this.posts
      .findOne({
        ownerId,
        canonicalUrl,
        deletionState: "active",
      })
      .then((post) => post ?? undefined);
  }
  findById(ownerId: string, postId: string) {
    return this.posts
      .findOne({ ownerId, id: postId })
      .then((post) => post ?? undefined);
  }
  async insert(post: SavedPost) {
    await this.posts.insertOne(post);
    return post;
  }
  async list(
    ownerId: string,
    cursor: PageCursor | undefined,
    limit: number,
  ): Promise<PostPage> {
    const filter = {
      ownerId,
      deletionState: "active" as const,
      ...(cursor ? { capturedAt: { $lte: cursor.capturedAt } } : {}),
    };
    const items = await this.posts
      .find(filter)
      .sort({ capturedAt: -1, id: -1 })
      .limit(limit + 1)
      .toArray();
    const hasMore = items.length > limit;
    const page = items.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page,
      ...(hasMore && last
        ? {
            nextCursor: JSON.stringify({
              capturedAt: last.capturedAt,
              id: last.id,
            }),
          }
        : {}),
    };
  }
  async delete(ownerId: string, postId: string) {
    const deleted = {
      deletionState: "deleted" as const,
      updatedAt: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
    };
    const result = await this.posts.findOneAndUpdate(
      { ownerId, id: postId },
      { $set: deleted },
      { returnDocument: "after" },
    );
    return result ?? undefined;
  }
  async getIdempotent(ownerId: string, key: string) {
    return (await this.idempotency.findOne({ ownerId, key }))?.result;
  }
  async setIdempotent(ownerId: string, key: string, result: CaptureResult) {
    await this.idempotency.updateOne(
      { ownerId, key },
      {
        $setOnInsert: {
          ownerId,
          key,
          result,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  }
}
