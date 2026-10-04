import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ExtractedFrame,
  MediaAsset,
  MediaLimits,
  MediaProcessor,
} from "../../modules/analysis/media";

export interface FfmpegConfig {
  binary?: string;
  timeoutMs?: number;
  limits?: MediaLimits;
}

export class FfmpegMediaProcessor implements MediaProcessor {
  private readonly binary: string;
  private readonly timeoutMs: number;
  private readonly limits: MediaLimits;
  constructor(config: FfmpegConfig = {}) {
    this.binary = config.binary ?? "ffmpeg";
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.limits = config.limits ?? {
      maxBytes: 50_000_000,
      maxDurationMs: 60 * 60 * 1000,
      maxFrames: 12,
    };
  }

  private validate(asset: MediaAsset) {
    if (asset.bytes.byteLength > this.limits.maxBytes)
      throw new Error("Media exceeds byte limit");
    if (
      !asset.mimeType.startsWith("video/") &&
      !asset.mimeType.startsWith("audio/")
    )
      throw new Error("FFmpeg requires video or audio media");
  }
  private run(args: string[], cwd: string) {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(this.binary, args, {
        cwd,
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("FFmpeg timed out"));
      }, this.timeoutMs);
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed: ${stderr.slice(-500)}`));
      });
    });
  }
  async extractFrames(asset: MediaAsset): Promise<ExtractedFrame[]> {
    this.validate(asset);
    const dir = await mkdtemp(join(tmpdir(), "saveyour-ffmpeg-"));
    const input = join(dir, "input");
    const output = join(dir, "frame-%02d.jpg");
    try {
      await writeFile(input, asset.bytes);
      const count = Math.max(
        1,
        Math.min(
          this.limits.maxFrames,
          Math.ceil((asset.durationMs ?? 10_000) / 10_000),
        ),
      );
      await this.run(
        [
          "-y",
          "-i",
          input,
          "-vf",
          `fps=${count}/1`,
          "-frames:v",
          String(count),
          output,
        ],
        dir,
      );
      const frames: ExtractedFrame[] = [];
      for (let index = 1; index <= count; index += 1) {
        try {
          frames.push({
            timestampMs: Math.floor(
              ((asset.durationMs ?? 0) * (index - 1)) / Math.max(1, count - 1),
            ),
            bytes: await readFile(
              join(dir, `frame-${String(index).padStart(2, "0")}.jpg`),
            ),
            mimeType: "image/jpeg",
          });
        } catch {
          break;
        }
      }
      return frames;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  async extractAudio(asset: MediaAsset) {
    this.validate(asset);
    const dir = await mkdtemp(join(tmpdir(), "saveyour-ffmpeg-"));
    const input = join(dir, "input");
    const output = join(dir, "audio.wav");
    try {
      await writeFile(input, asset.bytes);
      await this.run(
        ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", output],
        dir,
      );
      return {
        bytes: await readFile(output),
        mimeType: "audio/wav",
        durationMs: asset.durationMs,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
