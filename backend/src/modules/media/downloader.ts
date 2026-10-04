import { createHash } from "node:crypto";
import { MediaError, type MediaStore, type StoredAsset } from "./store";
import type { OwnerScope } from "../capture/types";

export interface DownloadPolicy {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  allowedHosts: Set<string>;
}

export interface DownloadedMedia {
  asset: StoredAsset;
  sourceUrl: string;
}

const isPrivateAddress = (hostname: string): boolean => {
  const value = hostname.toLowerCase().replace(/\.$/, "");
  return (
    value === "localhost" ||
    value.endsWith(".local") ||
    value === "::1" ||
    /^127\./.test(value) ||
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value)
  );
};

export class BoundedMediaDownloader {
  constructor(
    private readonly store: MediaStore,
    private readonly policy: DownloadPolicy,
  ) {}

  async download(
    url: string,
    postId: string,
    scope: OwnerScope,
  ): Promise<DownloadedMedia> {
    let current = new URL(url);
    if (current.protocol !== "https:")
      throw new MediaError("MEDIA_TYPE", "Media URL must use HTTPS");

    for (
      let redirect = 0;
      redirect <= this.policy.maxRedirects;
      redirect += 1
    ) {
      if (
        isPrivateAddress(current.hostname) ||
        !this.policy.allowedHosts.has(current.hostname.toLowerCase())
      )
        throw new MediaError("MEDIA_FORBIDDEN", "Media host is not allowed");
      const response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(this.policy.timeoutMs),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location)
          throw new MediaError(
            "MEDIA_NOT_FOUND",
            "Media redirect is missing a target",
          );
        current = new URL(location, current);
        continue;
      }
      if (!response.ok)
        throw new MediaError(
          "MEDIA_NOT_FOUND",
          `Media source returned ${response.status}`,
        );
      const mimeType =
        response.headers.get("content-type")?.split(";", 1)[0]?.trim() ??
        "application/octet-stream";
      const declaredLength = Number(
        response.headers.get("content-length") ?? 0,
      );
      if (declaredLength > this.policy.maxBytes)
        throw new MediaError(
          "MEDIA_SIZE",
          "Media exceeds the configured size limit",
        );
      const reader = response.body?.getReader();
      if (!reader)
        throw new MediaError(
          "MEDIA_NOT_FOUND",
          "Media source returned no body",
        );
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        total += chunk.value.byteLength;
        if (total > this.policy.maxBytes) {
          await reader.cancel();
          throw new MediaError(
            "MEDIA_SIZE",
            "Media exceeds the configured size limit",
          );
        }
        chunks.push(chunk.value);
      }
      const body = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      if (body.byteLength > this.policy.maxBytes)
        throw new MediaError(
          "MEDIA_SIZE",
          "Media exceeds the configured size limit",
        );
      return {
        asset: await this.store.put({ postId, body, mimeType }, scope),
        sourceUrl: current.toString(),
      };
    }
    throw new MediaError("MEDIA_NOT_FOUND", "Media redirect limit exceeded");
  }
}

export const mediaChecksum = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");
