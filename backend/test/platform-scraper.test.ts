import { describe, expect, test } from "bun:test";
import {
  OpenGraphScraper,
  PlatformScraperClient,
} from "../src/modules/capture/platform-scraper";

const suppliedUrls = [
  ["instagram", "https://www.instagram.com/p/DeCt4wiMgDA/"],
  ["instagram", "https://www.instagram.com/reels/DdvU3y5A4qi/"],
  ["tiktok", "https://www.tiktok.com/@funfeed608/video/7675039008543509791"],
] as const;

describe("platform scraper", () => {
  test("accepts supplied platform URLs", () => {
    for (const [platform, url] of suppliedUrls) {
      const client = new PlatformScraperClient({
        enabled: true,
        allowedPlatforms: new Set([platform]),
        allowedHosts: new Set([new URL(url).hostname]),
        maxRequests: 1,
        windowMs: 60_000,
        maxConcurrency: 1,
      });
      const result = client.scrape(url, "");
      expect(result.platform).toBe(platform);
    }
  });
  test("extracts safe Open Graph metadata and media candidates", () => {
    const scraper = new OpenGraphScraper("instagram");
    const result = scraper.scrape({
      url: "https://www.instagram.com/p/test/",
      html: `<meta property="og:title" content="A &amp; post"><meta property="og:image" content="https://i.example.test/image.jpg"><meta property="og:image" content="javascript:alert(1)">`,
    });
    expect(result.metadata.title).toBe("A & post");
    expect(result.mediaUrls).toEqual(["https://i.example.test/image.jpg"]);
  });
  test("enforces enabled scope and request budget", () => {
    const client = new PlatformScraperClient({
      enabled: true,
      allowedPlatforms: new Set(["pinterest"]),
      allowedHosts: new Set(["www.pinterest.com"]),
      maxRequests: 1,
      windowMs: 60_000,
      maxConcurrency: 1,
    });
    const html = `<meta property="og:image" content="https://pbs.twimg.com/image.jpg">`;
    expect(
      client.scrape("https://www.pinterest.com/pin/123/", html).requestCount,
    ).toBe(1);
    expect(() =>
      client.scrape("https://www.pinterest.com/pin/456/", html),
    ).toThrow("budget");
  });
});
