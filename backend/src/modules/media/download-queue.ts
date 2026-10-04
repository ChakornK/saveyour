import type { OwnerScope } from "../capture/types";
import type { RedisLike } from "../../infrastructure/queue/redis-queue";
import type { MediaStore } from "./store";
import {
  cleanupMedia,
  ProcessYtDlp,
  readMedia,
  type YtDlpConfig,
} from "./yt-dlp";
import { BoundedMediaDownloader } from "./downloader";

export type MediaDownloadStatus =
  "queued" | "processing" | "completed" | "failed";
export interface MediaDownloadJob {
  id: string;
  url: string;
  postId: string;
  scope: OwnerScope;
  attempts: number;
  maxAttempts?: number;
}
export interface MediaDownloadQueue {
  enqueue(job: MediaDownloadJob): Promise<void>;
  claim(): Promise<MediaDownloadJob | undefined>;
  acknowledge(id: string): Promise<void>;
  retry?(job: MediaDownloadJob, reason: string): Promise<void>;
}

export class RedisMediaDownloadQueue implements MediaDownloadQueue {
  constructor(
    private readonly redis: RedisLike,
    private readonly key = "media:download:queue",
  ) {}
  async enqueue(job: MediaDownloadJob) {
    await this.redis.lPush(this.key, JSON.stringify(job));
  }
  async claim() {
    const value = await this.redis.rPop(this.key);
    return value ? (JSON.parse(value) as MediaDownloadJob) : undefined;
  }
  async acknowledge(_id: string) {}
  async retry(job: MediaDownloadJob, reason: string) {
    if (job.attempts >= (job.maxAttempts ?? 3)) {
      console.error(`media job ${job.id} failed permanently: ${reason}`);
      return;
    }
    await this.enqueue({ ...job, attempts: job.attempts + 1 });
  }
}

export class InMemoryMediaDownloadQueue implements MediaDownloadQueue {
  private readonly jobs: MediaDownloadJob[] = [];
  async enqueue(job: MediaDownloadJob) {
    if (
      !this.jobs.some(
        (item) => item.id === job.id && item.attempts === job.attempts,
      )
    )
      this.jobs.push(job);
  }
  async claim() {
    return this.jobs.shift();
  }
  async acknowledge(_id: string) {}
  async retry(job: MediaDownloadJob) {
    if (job.attempts < (job.maxAttempts ?? 3))
      await this.enqueue({ ...job, attempts: job.attempts + 1 });
  }
}

export const createYtDlpConfig = (
  binary: string,
  tempDir: string,
  maxBytes: number,
  timeoutMs: number,
): YtDlpConfig => ({ binary, tempDir, maxBytes, timeoutMs });

export class YtDlpMediaWorker {
  constructor(
    private readonly queue: MediaDownloadQueue,
    private readonly store: MediaStore,
    private readonly runner: ProcessYtDlp,
    private readonly directDownloader = new BoundedMediaDownloader(store, {
      timeoutMs: 15_000,
      maxBytes: 25 * 1024 * 1024,
      maxRedirects: 3,
      allowedHosts: new Set(["i.pinimg.com", "pinimg.com"]),
    }),
  ) {}
  async runOnce() {
    const job = await this.queue.claim();
    if (!job) return false;
    let filepath: string | undefined;
    try {
      let result;
      try {
        result = await this.runner.extract(job.url);
      } catch (error) {
        if (!/pinterest/i.test(job.url)) throw error;
        const page = await fetch(job.url, {
          headers: { "user-agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(15_000),
        });
        const html = await page.text();
        const mediaUrl = html
          .match(
            /https:\/\/i\.pinimg\.com\/(?:originals|736x|564x|474x|236x)\/[^" )]+/i,
          )?.[0]
          ?.replaceAll("\\u002F", "/");
        if (!mediaUrl) throw error;
        await this.directDownloader.download(mediaUrl, job.postId, job.scope);
        return true;
      }
      filepath = result.filepath;
      const media = await readMedia(filepath);
      const mime =
        result.ext === "mp4"
          ? "video/mp4"
          : result.ext === "webm"
            ? "video/webm"
            : result.ext === "mp3"
              ? "audio/mpeg"
              : `image/${result.ext ?? "jpeg"}`;
      await this.store.put(
        { postId: job.postId, body: media.body, mimeType: mime },
        job.scope,
      );
    } catch (error) {
      await this.queue.retry?.(
        job,
        error instanceof Error ? error.message : "download failed",
      );
    } finally {
      if (filepath) await cleanupMedia(filepath);
      await this.queue.acknowledge(job.id);
    }
    return true;
  }
}
