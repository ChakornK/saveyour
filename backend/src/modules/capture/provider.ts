import type { CanonicalPostUrl, Platform } from "./types";

export interface ResolvedSource {
  platform: Platform;
  canonicalUrl: string;
  title?: string;
  author?: string;
  text?: string;
  mediaUrls: string[];
  status: "resolved" | "limited";
}

export interface SourceAdapter {
  platform: Platform;
  resolve(url: CanonicalPostUrl, signal?: AbortSignal): Promise<ResolvedSource>;
}

export class MetadataSourceAdapter implements SourceAdapter {
  constructor(
    public readonly platform: Platform,
    private readonly timeoutMs = 10_000,
  ) {}
  async resolve(
    url: CanonicalPostUrl,
    signal?: AbortSignal,
  ): Promise<ResolvedSource> {
    const response = await fetch(url.value, {
      redirect: "manual",
      signal: signal ?? AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok || response.status >= 300)
      return {
        platform: this.platform,
        canonicalUrl: url.value,
        mediaUrls: [],
        status: "limited",
      };
    const html = await response.text();
    const videoUrls = [
      ...html.matchAll(
        /<meta[^>]+(?:property|name)=["']og:video(?::url)?["'][^>]+content=["']([^"']+)["']/gi,
      ),
      ...html.matchAll(/https?:\\?\/\\?\/[^"'\\s]+\.(?:mp4|mov|webm)(?:\?[^"'\\s]*)?/gi),
    ]
      .map((match) => match[1] ?? match[0])
      .map((value) => value.replaceAll("\\u0026", "&").replaceAll("&amp;", "&"))
      .filter((value) => /^https:\/\//i.test(value));
    const imageUrls = [
      ...html.matchAll(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi,
      ),
      ...html.matchAll(/https?:\\?\/\\?\/[^"'\\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\s]*)?/gi),
    ]
      .map((match) => match[1] ?? match[0])
      .map((value) => value.replaceAll("\\u0026", "&").replaceAll("&amp;", "&"))
      .filter((value) => /^https:\/\//i.test(value));
    const mediaUrls = [...new Set(videoUrls.length ? videoUrls : imageUrls)].slice(0, 20);
    const title = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    )?.[1];
    return {
      platform: this.platform,
      canonicalUrl: url.value,
      ...(title ? { title } : {}),
      mediaUrls,
      status: "resolved",
    };
  }
}

export class SourceAdapterRegistry {
  private readonly adapters = new Map<Platform, SourceAdapter>();
  register(adapter: SourceAdapter) {
    this.adapters.set(adapter.platform, adapter);
    return this;
  }
  resolve(url: CanonicalPostUrl, signal?: AbortSignal) {
    const adapter = this.adapters.get(url.platform);
    if (!adapter) throw new Error(`No source adapter for ${url.platform}`);
    return adapter.resolve(url, signal);
  }
}

export const defaultSourceAdapters = (timeoutMs = 10_000) => {
  const registry = new SourceAdapterRegistry();
  for (const platform of [
    "instagram",
    "tiktok",
    "facebook",
    "pinterest",
  ] as Platform[])
    registry.register(new MetadataSourceAdapter(platform, timeoutMs));
  return registry;
};
