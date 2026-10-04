export interface MediaLimits {
  maxBytes: number;
  maxDurationMs: number;
  maxFrames: number;
}

export interface MediaAsset {
  bytes: Uint8Array;
  mimeType: string;
  durationMs?: number;
}
export interface ExtractedFrame {
  timestampMs: number;
  bytes: Uint8Array;
  mimeType: string;
}

export interface MediaProcessor {
  extractFrames(asset: MediaAsset): Promise<ExtractedFrame[]>;
  extractAudio(asset: MediaAsset): Promise<MediaAsset | undefined>;
}

export class LimitedMediaProcessor implements MediaProcessor {
  constructor(
    private readonly limits: MediaLimits = {
      maxBytes: 50_000_000,
      maxDurationMs: 60 * 60 * 1000,
      maxFrames: 12,
    },
  ) {}

  private validate(asset: MediaAsset) {
    if (asset.bytes.byteLength > this.limits.maxBytes)
      throw new Error("Media exceeds byte limit");
    if (
      asset.durationMs !== undefined &&
      asset.durationMs > this.limits.maxDurationMs
    )
      throw new Error("Media exceeds duration limit");
    if (
      !asset.mimeType.startsWith("image/") &&
      !asset.mimeType.startsWith("video/") &&
      !asset.mimeType.startsWith("audio/")
    )
      throw new Error("Unsupported media type");
  }

  async extractFrames(asset: MediaAsset) {
    this.validate(asset);
    if (!asset.mimeType.startsWith("video/")) return [];
    const duration = asset.durationMs ?? 0;
    return Array.from(
      {
        length: Math.min(
          this.limits.maxFrames,
          Math.max(1, Math.ceil(duration / 10_000)),
        ),
      },
      (_, index) => ({
        timestampMs: Math.floor(
          (duration * index) / Math.max(1, this.limits.maxFrames - 1),
        ),
        bytes: asset.bytes,
        mimeType: "image/jpeg",
      }),
    );
  }

  async extractAudio(asset: MediaAsset) {
    this.validate(asset);
    return asset.mimeType.startsWith("audio/") ||
      asset.mimeType.startsWith("video/")
      ? { ...asset, mimeType: "audio/wav" }
      : undefined;
  }
}
