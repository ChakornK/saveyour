import { normalizePostUrl } from "./url-policy";
import type { Platform } from "./types";

export interface ScraperScope {
  enabled: boolean;
  allowedPlatforms: Set<Platform>;
  allowedHosts: Set<string>;
  maxRequests: number;
  windowMs: number;
  maxConcurrency: number;
}

export interface ScrapeResult {
  platform: Platform;
  canonicalUrl: string;
  mediaUrls: string[];
  metadata: Record<string, string>;
  requestCount: number;
  live: boolean;
}

export interface PlatformScraper {
  platform: Platform;
  scrape(input: { url: string; html: string }): ScrapeResult;
}

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
const metadata = (html: string, key: string) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  );
  return match?.[1] ? decodeHtml(match[1]) : undefined;
};

const mediaCandidates = (html: string) => {
  const values = [
    metadata(html, "og:image"),
    metadata(html, "og:video"),
    metadata(html, "twitter:image"),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(values)].filter((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  });
};

export class OpenGraphScraper implements PlatformScraper {
  constructor(public readonly platform: Platform) {}
  scrape(input: { url: string; html: string }): ScrapeResult {
    const canonical = normalizePostUrl(input.url);
    const title = metadata(input.html, "og:title");
    const description = metadata(input.html, "og:description");
    return {
      platform: this.platform,
      canonicalUrl: canonical.value,
      mediaUrls: mediaCandidates(input.html),
      metadata: Object.fromEntries(
        [
          ["title", title],
          ["description", description],
        ].filter((entry): entry is [string, string] => Boolean(entry[1])),
      ),
      requestCount: 0,
      live: false,
    };
  }
}

const defaultScrapers = () =>
  new Map<Platform, PlatformScraper>(
    (["instagram", "tiktok", "facebook", "pinterest"] as Platform[]).map(
      (platform) => [platform, new OpenGraphScraper(platform)],
    ),
  );

export class PlatformScraperClient {
  private windowStarted = Date.now();
  private requests = 0;
  private active = 0;
  constructor(
    private readonly scope: ScraperScope,
    private readonly scrapers = defaultScrapers(),
  ) {}
  scrape(url: string, html: string): ScrapeResult {
    if (!this.scope.enabled) throw new Error("Scraper is disabled");
    const canonical = normalizePostUrl(url);
    const host = new URL(canonical.value).hostname;
    if (
      !this.scope.allowedPlatforms.has(canonical.platform) ||
      !this.scope.allowedHosts.has(host)
    )
      throw new Error("Target is outside the configured scraper scope");
    if (Date.now() - this.windowStarted >= this.scope.windowMs) {
      this.windowStarted = Date.now();
      this.requests = 0;
    }
    if (this.requests >= this.scope.maxRequests)
      throw new Error("Scraper request budget exhausted");
    if (this.active >= this.scope.maxConcurrency)
      throw new Error("Scraper concurrency limit reached");
    const scraper = this.scrapers.get(canonical.platform);
    if (!scraper) throw new Error("No scraper configured");
    this.requests += 1;
    this.active += 1;
    try {
      return {
        ...scraper.scrape({ url, html }),
        requestCount: this.requests,
        live: false,
      };
    } finally {
      this.active -= 1;
    }
  }
}
