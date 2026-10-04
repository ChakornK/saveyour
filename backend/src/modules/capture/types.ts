export type Platform = "instagram" | "tiktok" | "facebook" | "pinterest";
export type SourceStatus = "pending" | "limited" | "resolved";
export type AnalysisStatus = "pending" | "queued";
export type DeletionState = "active" | "deleted";

export interface OwnerScope {
  ownerId: string;
}

export interface CanonicalPostUrl {
  value: string;
  platform: Platform;
}

export interface SavedPost {
  id: string;
  ownerId: string;
  canonicalUrl: string;
  platform: Platform;
  capturedAt: string;
  updatedAt: string;
  sourceStatus: SourceStatus;
  analysisStatus: AnalysisStatus;
  deletionState: DeletionState;
}

export interface CaptureCommand {
  rawUrl: string;
  idempotencyKey?: string;
}

export interface CaptureResult {
  post: SavedPost;
  duplicate: boolean;
  replayed: boolean;
}

export interface PageCursor {
  capturedAt: string;
  id: string;
}

export interface PostPage {
  items: SavedPost[];
  nextCursor?: string;
}

export type CaptureErrorCode =
  | "URL_INVALID"
  | "PLATFORM_UNSUPPORTED"
  | "NETWORK_TARGET_DISALLOWED"
  | "IDEMPOTENCY_CONFLICT"
  | "POST_NOT_FOUND";

export class CaptureError extends Error {
  constructor(
    public readonly code: CaptureErrorCode,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "CaptureError";
  }
}
