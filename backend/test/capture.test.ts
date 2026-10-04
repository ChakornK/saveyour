import { describe, expect, test } from "bun:test";
import { normalizePostUrl } from "../src/modules/capture/url-policy";
import { InMemoryCaptureRepository } from "../src/modules/capture/repository";
import { CaptureService } from "../src/modules/capture/service";

const scope = { ownerId: "owner-a" };

describe("normalizePostUrl", () => {
  test("removes tracking parameters and fragments", () => {
    expect(
      normalizePostUrl(
        "https://www.instagram.com/p/ABC123/?utm_source=share#comments",
      ),
    ).toEqual({
      value: "https://www.instagram.com/p/ABC123/",
      platform: "instagram",
    });
  });
  test("is idempotent", () => {
    const normalized = normalizePostUrl(
      "https://x.com/example/status/123?utm_medium=social",
    );
    expect(normalizePostUrl(normalized.value)).toEqual(normalized);
  });
  test("rejects unsupported and private URLs", () => {
    expect(() => normalizePostUrl("https://example.com/post/1")).toThrow(
      "not supported",
    );
    expect(() => normalizePostUrl("http://127.0.0.1/post/1")).toThrow("HTTPS");
  });
});

describe("CaptureService", () => {
  test("returns duplicate for repeated canonical URL", async () => {
    const service = new CaptureService(new InMemoryCaptureRepository());
    const first = await service.capture(
      { rawUrl: "https://x.com/example/status/123" },
      scope,
    );
    const second = await service.capture(
      { rawUrl: "https://twitter.com/example/status/123?utm_source=share" },
      scope,
    );
    expect(first.post.id).toBe(second.post.id);
    expect(second.duplicate).toBe(true);
  });
  test("replays idempotency result", async () => {
    const service = new CaptureService(new InMemoryCaptureRepository());
    const first = await service.capture(
      {
        rawUrl: "https://www.reddit.com/r/test/comments/abc/title",
        idempotencyKey: "retry-1",
      },
      scope,
    );
    const second = await service.capture(
      {
        rawUrl: "https://www.reddit.com/r/test/comments/abc/title",
        idempotencyKey: "retry-1",
      },
      scope,
    );
    expect(second.post.id).toBe(first.post.id);
    expect(second.replayed).toBe(true);
  });
  test("isolates owners and excludes deleted posts", async () => {
    const service = new CaptureService(new InMemoryCaptureRepository());
    const created = await service.capture(
      { rawUrl: "https://www.tiktok.com/@creator/video/123" },
      scope,
    );
    expect((await service.list(scope, undefined)).items).toHaveLength(1);
    await service.delete(scope, created.post.id);
    expect((await service.list(scope, undefined)).items).toHaveLength(0);
    await expect(
      service.get({ ownerId: "owner-b" }, created.post.id),
    ).rejects.toThrow("not found");
  });
});
