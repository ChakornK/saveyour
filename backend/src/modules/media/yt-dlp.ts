import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export interface YtDlpResult {
  id: string;
  title?: string;
  ext?: string;
  requestedDownloadUrl?: string;
  filepath: string;
}

export interface YtDlpRunner {
  extract(url: string): Promise<YtDlpResult>;
}

export interface YtDlpConfig {
  binary: string;
  tempDir: string;
  timeoutMs: number;
  maxBytes: number;
}

const allowedExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "mp4",
  "webm",
  "mp3",
  "m4a",
  "wav",
]);

export class ProcessYtDlp implements YtDlpRunner {
  constructor(private readonly config: YtDlpConfig) {}

  async extract(url: string): Promise<YtDlpResult> {
    await mkdir(this.config.tempDir, { recursive: true });
    const stem = join(this.config.tempDir, crypto.randomUUID());
    const output = `${stem}.%(ext)s`;
    const info = `${stem}.info.json`;
    const args = [
      "--no-playlist",
      "--no-warnings",
      "--restrict-filenames",
      "--socket-timeout",
      String(Math.ceil(this.config.timeoutMs / 1000)),
      "--retries",
      "1",
      "--fragment-retries",
      "1",
      "--extractor-retries",
      "1",
      "--max-filesize",
      String(this.config.maxBytes),
      "--write-info-json",
      "--merge-output-format",
      "mp4",
      "--output",
      output,
      url,
    ];
    await this.run(args);
    const metadata = await readFile(info, "utf8").catch(() => "{}");
    const parsed = JSON.parse(metadata) as {
      id?: string;
      title?: string;
      ext?: string;
      requested_downloads?: Array<{ url?: string }>;
    };
    const ext = parsed.ext?.toLowerCase();
    if (ext && !allowedExtensions.has(ext))
      throw new Error(`yt-dlp returned unsupported extension: ${ext}`);
    let filepath = output.replace("%(ext)s", ext ?? "bin");
    let details;
    try {
      details = await stat(filepath);
    } catch (error) {
      if (!ext) throw error;
      const fallback = `${stem}.${ext}`;
      filepath = fallback;
      details = await stat(filepath);
    }
    if (details.size > this.config.maxBytes)
      throw new Error("yt-dlp output exceeds media limit");
    return {
      id: parsed.id ?? crypto.randomUUID(),
      ...(parsed.title ? { title: parsed.title } : {}),
      ...(ext ? { ext } : {}),
      requestedDownloadUrl: parsed.requested_downloads?.[0]?.url,
      filepath,
    };
  }

  private run(args: string): Promise<void>;
  private run(args: string[]): Promise<void>;
  private run(args: string | string[]): Promise<void> {
    const command = typeof args === "string" ? [args] : args;
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.binary, command, {
        stdio: ["ignore", "pipe", "pipe"],
      });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("yt-dlp timed out"));
      }, this.config.timeoutMs);
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else
          reject(new Error(`yt-dlp failed (${code}): ${stderr.slice(-1000)}`));
      });
    });
  }
}

export const readMedia = async (filepath: string) => {
  const body = await readFile(filepath);
  return {
    body: new Uint8Array(body),
    checksum: createHash("sha256").update(body).digest("hex"),
  };
};

export const cleanupMedia = (filepath: string) => rm(filepath, { force: true });
