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
  private posts?: Collection<SavedPost>;
  private idempotency?: Collection<StoredIdempotency>;
  constructor(private readonly mongo: MongoDatabase) {}
  private get postCollection() {
    return (this.posts ??= this.mongo
      .db()
      .collection<SavedPost>("capture_posts"));
  }
  private get idempotencyCollection() {
    return (this.idempotency ??= this.mongo
      .db()
      .collection<StoredIdempotency>("capture_idempotency"));
  }
  async ensureIndexes() {
    await this.postCollection.createIndex(
      { ownerId: 1, canonicalUrl: 1 },
      { unique: true, partialFilterExpression: { deletionState: "active" } },
    );
    await this.postCollection.createIndex({
      ownerId: 1,
      capturedAt: -1,
      id: -1,
    });
    await this.postCollection.createIndex({ ownerId: 1, deletionState: 1 });
    await this.idempotencyCollection.createIndex(
      { ownerId: 1, key: 1 },
      { unique: true },
    );
  }
  findActiveByUrl(ownerId: string, canonicalUrl: string) {
    return this.postCollection
      .findOne({ ownerId, canonicalUrl, deletionState: "active" })
      .then((post) => post ?? undefined);
  }
  findById(ownerId: string, postId: string) {
    return this.postCollection
      .findOne({ ownerId, id: postId })
      .then((post) => post ?? undefined);
  }
  async insert(post: SavedPost) {
    await this.postCollection.insertOne(post);
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
      ...(cursor
        ? {
            $or: [
              { capturedAt: { $lt: cursor.capturedAt } },
              { capturedAt: cursor.capturedAt, id: { $lt: cursor.id } },
            ],
          }
        : {}),
    };
    const items = await this.postCollection
      .find(filter)
      .sort({ capturedAt: -1, id: -1 })
      .limit(limit + 1)
      .toArray();
    const page = items.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page,
      ...(items.length > limit && last
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
    const now = new Date().toISOString();
    const result = await this.postCollection.findOneAndUpdate(
      { ownerId, id: postId },
      { $set: { deletionState: "deleted", updatedAt: now, deletedAt: now } },
      { returnDocument: "after" },
    );
    return result ?? undefined;
  }
  async getIdempotent(ownerId: string, key: string) {
    return (await this.idempotencyCollection.findOne({ ownerId, key }))?.result;
  }
  async setIdempotent(ownerId: string, key: string, result: CaptureResult) {
    await this.idempotencyCollection.updateOne(
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
