import { createHash, randomUUID } from "node:crypto";
import type { OwnerScope } from "../../modules/capture/types";
import {
  MediaError,
  type MediaPut,
  type MediaStore,
  type StoredAsset,
} from "../../modules/media/store";
import type { MediaAssetRepository } from "../../modules/media/repository";

export interface SeaweedFsConfig {
  endpoint: string;
  bucket: string;
  accessKey?: string;
  secretKey?: string;
  maxBytes: number;
  allowedTypes?: RegExp;
}

export class SeaweedFsMediaStore implements MediaStore {
  constructor(
    private readonly config: SeaweedFsConfig,
    private readonly repository: MediaAssetRepository,
  ) {}

  private objectUrl(key: string) {
    return `${this.config.endpoint.replace(/\/$/, "")}/${this.config.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  private headers(scope: OwnerScope, input?: MediaPut) {
    return {
      ...(input
        ? {
            "content-type": input.mimeType,
            "content-length": String(input.body.byteLength),
          }
        : {}),
      "x-amz-meta-owner-id": scope.ownerId,
    };
  }

  async put(input: MediaPut, scope: OwnerScope): Promise<StoredAsset> {
    const allowed =
      this.config.allowedTypes ??
      /^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm)$|^audio\/(mpeg|mp4|wav)$/;
    if (!allowed.test(input.mimeType))
      throw new MediaError("MEDIA_TYPE", "Media type is not allowed");
    if (input.body.byteLength > this.config.maxBytes)
      throw new MediaError(
        "MEDIA_SIZE",
        "Media exceeds the configured size limit",
      );
    const checksum = createHash("sha256").update(input.body).digest("hex");
    const duplicate = await this.repository.findByChecksum(
      scope.ownerId,
      checksum,
    );
    if (duplicate) return duplicate;
    const key = `${scope.ownerId}/${input.postId}/${checksum}-${randomUUID()}`;
    const response = await fetch(this.objectUrl(key), {
      method: "PUT",
      headers: this.headers(scope, input),
      body: input.body.buffer as ArrayBuffer,
    });
    if (!response.ok)
      throw new MediaError(
        "MEDIA_NOT_FOUND",
        `Media storage returned ${response.status}`,
      );
    const asset: StoredAsset = {
      id: randomUUID(),
      ownerId: scope.ownerId,
      postId: input.postId,
      mimeType: input.mimeType,
      byteSize: input.body.byteLength,
      checksum,
      storageRef: key,
      availability: "available",
    };
    await this.repository.insert(asset);
    return asset;
  }

  async markDeleted(assetId: string, scope: OwnerScope) {
    const asset = await this.repository.findOwned(assetId, scope);
    if (!asset) return;
    await this.repository.markDeleted(assetId, scope);
    const response = await fetch(this.objectUrl(asset.storageRef), {
      method: "DELETE",
      headers: this.headers(scope),
    });
    if (!response.ok && response.status !== 404)
      throw new MediaError("MEDIA_NOT_FOUND", "Media cleanup failed");
  }

  async authorizeRead(
    assetId: string,
    scope: OwnerScope,
  ): Promise<{ asset: StoredAsset; body: Uint8Array }> {
    const asset = await this.repository.findOwned(assetId, scope);
    if (!asset || asset.availability !== "available")
      throw new MediaError("MEDIA_NOT_FOUND", "Media not found");
    const response = await fetch(this.objectUrl(asset.storageRef), {
      headers: this.headers(scope),
    });
    if (!response.ok)
      throw new MediaError("MEDIA_NOT_FOUND", "Media object is unavailable");
    const body = new Uint8Array(await response.arrayBuffer());
    if (
      body.byteLength !== asset.byteSize ||
      createHash("sha256").update(body).digest("hex") !== asset.checksum
    )
      throw new MediaError("MEDIA_NOT_FOUND", "Media integrity check failed");
    return { asset, body };
  }
}
