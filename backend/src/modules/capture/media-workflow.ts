import { normalizePostUrl } from "./url-policy";
import {
  defaultSourceAdapters,
  type ResolvedSource,
  type SourceAdapterRegistry,
} from "./provider";
import {
  BoundedMediaDownloader,
  type DownloadPolicy,
} from "../media/downloader";
import type { MediaStore, StoredAsset } from "../media/store";
import type { OwnerScope } from "./types";

export interface CaptureMediaResult {
  source: ResolvedSource;
  assets: StoredAsset[];
  failures: string[];
}

export class CaptureMediaWorkflow {
  constructor(
    private readonly store: MediaStore,
    private readonly registry: SourceAdapterRegistry = defaultSourceAdapters(),
    private readonly policy: DownloadPolicy = {
      timeoutMs: 10_000,
      maxBytes: 25 * 1024 * 1024,
      maxRedirects: 3,
      allowedHosts: new Set(),
    },
  ) {}
  async resolveAndStore(
    rawUrl: string,
    postId: string,
    scope: OwnerScope,
  ): Promise<CaptureMediaResult> {
    const canonical = normalizePostUrl(rawUrl);
    const source = await this.registry.resolve(canonical);
    const assets: StoredAsset[] = [];
    const failures: string[] = [];
    const allowedHosts =
      this.policy.allowedHosts.size > 0
        ? this.policy.allowedHosts
        : new Set(
            source.mediaUrls.map((value) =>
              new URL(value).hostname.toLowerCase(),
            ),
          );
    const downloader = new BoundedMediaDownloader(this.store, {
      ...this.policy,
      allowedHosts,
    });
    for (const mediaUrl of source.mediaUrls) {
      try {
        assets.push((await downloader.download(mediaUrl, postId, scope)).asset);
      } catch (error) {
        failures.push(
          error instanceof Error ? error.message : "media download failed",
        );
      }
    }
    return { source, assets, failures };
  }
}
