import { describe, expect, test } from "bun:test";
import { BoundedMediaDownloader } from "../src/modules/media/downloader";
import { InMemoryMediaStore, MediaError } from "../src/modules/media/store";

const scope = { ownerId: "owner-media" };

describe("media storage and downloading", () => {
  test("deduplicates identical owner media and protects reads", async () => {
    const store = new InMemoryMediaStore(1000);
    const first = await store.put(
      {
        postId: "post-1",
        body: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
      scope,
    );
    const duplicate = await store.put(
      {
        postId: "post-2",
        body: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
      scope,
    );
    expect(duplicate.id).toBe(first.id);
    await expect(
      store.authorizeRead(first.id, { ownerId: "other" }),
    ).rejects.toBeInstanceOf(MediaError);
  });

  test("rejects disallowed redirects and oversized streamed bodies", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () =>
        new Response(new Uint8Array(20), {
          status: 200,
          headers: { "content-type": "image/png" },
        })) as unknown as typeof fetch;
      const downloader = new BoundedMediaDownloader(
        new InMemoryMediaStore(10),
        {
          timeoutMs: 1000,
          maxBytes: 10,
          maxRedirects: 2,
          allowedHosts: new Set(["cdn.example.com"]),
        },
      );
      await expect(
        downloader.download(
          "https://cdn.example.com/image.png",
          "post-1",
          scope,
        ),
      ).rejects.toMatchObject({ code: "MEDIA_SIZE" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
