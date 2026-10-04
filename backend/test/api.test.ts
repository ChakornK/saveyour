import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/env";
import { AuthService } from "../src/modules/auth/service";
import { CaptureService } from "../src/modules/capture/service";
import { InMemoryCaptureRepository } from "../src/modules/capture/repository";

const request = (
  app: ReturnType<typeof createApp>,
  path: string,
  init?: RequestInit,
) => app.handle(new Request(`http://localhost${path}`, init));

describe("API routes", () => {
  test("maps malformed capture cursors to a client error", async () => {
    const service = new CaptureService(new InMemoryCaptureRepository());
    const auth = new AuthService();
    const token = auth.signIn(
      {
        issuer: "test",
        audience: "test",
        nonce: "test",
        subject: "cursor-user",
        email: "cursor@example.com",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      { issuer: "test", audience: "test", nonce: "test" },
      3600,
    ).token;
    const result = await service.list({ ownerId: "owner-1" }, "not-json").catch((error) => error);
    expect(result).toMatchObject({ code: "URL_INVALID", field: "cursor" });
    expect(token).toBeString();
  });

  test("accepts an owner-scoped post and creates a job", async () => {
    const response = await request(
      createApp(loadConfig({ APP_ENV: "test" })),
      "/v1/posts",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-owner-id": "owner-1",
        },
        body: JSON.stringify({
          postId: "post-api-1",
          version: 1,
          sourceText: "A saved design",
          mediaKinds: ["image"],
        }),
      },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; jobId: string };
    expect(body.status).toBe("accepted");
    expect(body.jobId).toBeString();
  });

  test("rejects posts without an owner identity", async () => {
    const response = await request(
      createApp(loadConfig({ APP_ENV: "test" })),
      "/v1/posts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postId: "post-api-2",
          version: 1,
          sourceText: "Missing owner",
        }),
      },
    );
    expect(response.status).toBe(401);
  });

  test("requires owner scope for search", async () => {
    const response = await request(
      createApp(loadConfig({ APP_ENV: "test" })),
      "/v1/search?q=design",
    );
    expect(response.status).toBe(401);
  });
});
