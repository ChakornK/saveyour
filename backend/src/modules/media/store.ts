import { createHash, randomUUID } from "node:crypto";
import type { OwnerScope } from "../capture/types";

export interface MediaPut {
  postId: string;
  body: Uint8Array;
  mimeType: string;
  filename?: string;
}

export interface StoredAsset {
  id: string;
  ownerId: string;
  postId: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
  storageRef: string;
  availability: "available" | "unavailable";
}

export class MediaError extends Error {
  constructor(
    public readonly code:
      "MEDIA_TYPE" | "MEDIA_SIZE" | "MEDIA_NOT_FOUND" | "MEDIA_FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export interface MediaStore {
  put(input: MediaPut, scope: OwnerScope): Promise<StoredAsset>;
  authorizeRead(
    assetId: string,
    scope: OwnerScope,
  ): Promise<{ asset: StoredAsset; body: Uint8Array }>;
}

export class InMemoryMediaStore implements MediaStore {
  private readonly assets = new Map<
    string,
    { asset: StoredAsset; body: Uint8Array }
  >();

  constructor(
    private readonly maxBytes = 25 * 1024 * 1024,
    private readonly allowedTypes = /^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm)$|^audio\/(mpeg|mp4|wav)$/,
  ) {}

  async put(input: MediaPut, scope: OwnerScope): Promise<StoredAsset> {
    if (!this.allowedTypes.test(input.mimeType))
      throw new MediaError("MEDIA_TYPE", "Media type is not allowed");
    if (input.body.byteLength > this.maxBytes)
      throw new MediaError(
        "MEDIA_SIZE",
        "Media exceeds the configured size limit",
      );
    const checksum = createHash("sha256").update(input.body).digest("hex");
    const duplicate = [...this.assets.values()].find(
      (entry) =>
        entry.asset.ownerId === scope.ownerId &&
        entry.asset.checksum === checksum,
    );
    if (duplicate) return duplicate.asset;
    const asset: StoredAsset = {
      id: randomUUID(),
      ownerId: scope.ownerId,
      postId: input.postId,
      mimeType: input.mimeType,
      byteSize: input.body.byteLength,
      checksum,
      storageRef: `memory://${scope.ownerId}/${randomUUID()}`,
      availability: "available",
    };
    this.assets.set(asset.id, { asset, body: input.body.slice() });
    return asset;
  }

  async authorizeRead(assetId: string, scope: OwnerScope) {
    const entry = this.assets.get(assetId);
    if (!entry) throw new MediaError("MEDIA_NOT_FOUND", "Media not found");
    if (entry.asset.ownerId !== scope.ownerId)
      throw new MediaError("MEDIA_FORBIDDEN", "Media not found");
    return { asset: entry.asset, body: entry.body.slice() };
  }
}
