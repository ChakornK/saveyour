import { describe, expect, test } from "bun:test";
import { CaptureService } from "../src/modules/capture/service";
import { InMemoryCaptureRepository } from "../src/modules/capture/repository";
const scope = { ownerId: "owner-1" };
describe("CaptureService", () => {
  test("captures and deduplicates posts", async () => {
    const service = new CaptureService(new InMemoryCaptureRepository());
    const first = await service.capture(
      { rawUrl: "https://www.instagram.com/p/test/" },
      scope,
    );
    const second = await service.capture(
      { rawUrl: "https://www.instagram.com/p/test/" },
      scope,
    );
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
  test("replays idempotency result", async () => {
    const service = new CaptureService(new InMemoryCaptureRepository());
    const first = await service.capture(
      {
        rawUrl: "https://www.instagram.com/p/test/",
        idempotencyKey: "retry-1",
      },
      scope,
    );
    const second = await service.capture(
      {
        rawUrl: "https://www.instagram.com/p/test/",
        idempotencyKey: "retry-1",
      },
      scope,
    );
    expect(second.post.id).toBe(first.post.id);
    expect(second.replayed).toBe(true);
  });
});
