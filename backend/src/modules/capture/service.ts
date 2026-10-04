import { randomUUID } from "node:crypto";
import type { CaptureRepository } from "./repository";
import { normalizePostUrl } from "./url-policy";
import {
  CaptureError,
  type CaptureCommand,
  type CaptureResult,
  type OwnerScope,
  type SavedPost,
} from "./types";

export class CaptureService {
  constructor(
    private readonly repository: CaptureRepository,
    private readonly onCaptured?: (
      post: SavedPost,
      scope: OwnerScope,
    ) => Promise<void>,
  ) {}

  async capture(
    command: CaptureCommand,
    scope: OwnerScope,
  ): Promise<CaptureResult> {
    const normalized = normalizePostUrl(command.rawUrl);
    if (command.idempotencyKey) {
      const replay = await this.repository.getIdempotent(
        scope.ownerId,
        command.idempotencyKey,
      );
      if (replay) return { ...replay, replayed: true };
    }
    const existing = await this.repository.findActiveByUrl(
      scope.ownerId,
      normalized.value,
    );
    if (existing) {
      const result = { post: existing, duplicate: true, replayed: false };
      if (command.idempotencyKey)
        await this.repository.setIdempotent(
          scope.ownerId,
          command.idempotencyKey,
          result,
        );
      return result;
    }
    const now = new Date().toISOString();
    const post: SavedPost = {
      id: randomUUID(),
      ownerId: scope.ownerId,
      canonicalUrl: normalized.value,
      platform: normalized.platform,
      capturedAt: now,
      updatedAt: now,
      sourceStatus: "pending",
      analysisStatus: "queued",
      deletionState: "active",
    };
    await this.repository.insert(post);
    await this.onCaptured?.(post, scope);
    const result = { post, duplicate: false, replayed: false };
    if (command.idempotencyKey)
      await this.repository.setIdempotent(
        scope.ownerId,
        command.idempotencyKey,
        result,
      );
    return result;
  }

  async list(scope: OwnerScope, cursor: string | undefined, limit = 20) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new CaptureError(
        "URL_INVALID",
        "limit must be an integer between 1 and 100",
        "limit",
      );
    let decoded: unknown;
    try {
      decoded = cursor ? JSON.parse(cursor) : undefined;
    } catch {
      throw new CaptureError("URL_INVALID", "cursor is invalid", "cursor");
    }
    return this.repository.list(scope.ownerId, decoded as never, limit);
  }

  async get(scope: OwnerScope, postId: string): Promise<SavedPost> {
    const post = await this.repository.findById(scope.ownerId, postId);
    if (!post || post.deletionState === "deleted")
      throw new CaptureError("POST_NOT_FOUND", "Post not found");
    return post;
  }

  async delete(scope: OwnerScope, postId: string): Promise<SavedPost> {
    const post = await this.repository.findById(scope.ownerId, postId);
    if (!post) throw new CaptureError("POST_NOT_FOUND", "Post not found");
    return (await this.repository.delete(scope.ownerId, postId)) ?? post;
  }
}
