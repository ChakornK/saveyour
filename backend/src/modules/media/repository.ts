import type { Collection } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/client";
import type { OwnerScope } from "../capture/types";
import type { StoredAsset } from "./store";

export interface MediaAssetRepository {
  ensureIndexes(): Promise<void>;
  markDeleted(assetId: string, scope: OwnerScope): Promise<void>;
  insert(asset: StoredAsset): Promise<void>;
  findOwned(
    assetId: string,
    scope: OwnerScope,
  ): Promise<StoredAsset | undefined>;
  findByChecksum(
    ownerId: string,
    checksum: string,
  ): Promise<StoredAsset | undefined>;
}

export class MongoMediaAssetRepository implements MediaAssetRepository {
  private assets?: Collection<StoredAsset>;
  constructor(private readonly mongo: MongoDatabase) {}
  private get collection() {
    return (this.assets ??= this.mongo
      .db()
      .collection<StoredAsset>("media_assets"));
  }
  async ensureIndexes() {
    await this.collection.createIndex(
      { ownerId: 1, checksum: 1 },
      { unique: true },
    );
    await this.collection.createIndex({ ownerId: 1, postId: 1 });
    await this.collection.createIndex({ id: 1 }, { unique: true });
  }
  async markDeleted(assetId: string, scope: OwnerScope) {
    await this.collection.updateOne(
      { id: assetId, ownerId: scope.ownerId },
      { $set: { availability: "unavailable" } },
    );
  }
  async insert(asset: StoredAsset) {
    await this.collection.insertOne(asset);
  }
  async findOwned(assetId: string, scope: OwnerScope) {
    return (
      (await this.collection.findOne({
        id: assetId,
        ownerId: scope.ownerId,
      })) ?? undefined
    );
  }
  async findByChecksum(ownerId: string, checksum: string) {
    return (await this.collection.findOne({ ownerId, checksum })) ?? undefined;
  }
}
