import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/env";
import { AuthService } from "../src/modules/auth/service";
import type { GoogleClaims } from "../src/modules/auth/service";
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
    const claims: GoogleClaims = {
      issuer: "test",
      audience: "test",
      nonce: "test",
      subject: "cursor-user",
      email: "cursor@example.com",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = (
      await auth.signIn(
        claims,
        { issuer: "test", audience: "test", nonce: "test" },
        3600,
      )
    ).token;
    const result = await service
      .list({ ownerId: "owner-1" }, "not-json")
      .catch((error) => error);
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

  test("serves authenticated capture and profile routes", async () => {
    const app = createApp(
      loadConfig({
        APP_ENV: "test",
        AUTH_REQUIRED: "true",
        MONGO_URI: "",
        REDIS_URL: "",
      }),
    );
    const auth = new AuthService();
    const claims: GoogleClaims = {
      issuer: "test",
      audience: "test",
      nonce: "test",
      subject: "route-user",
      email: "route@example.com",
      name: "Route User",
      picture: "https://example.com/route.png",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = (
      await auth.signIn(
        claims,
        {
          issuer: "test",
          audience: "test",
          nonce: "test",
        },
        3600,
      )
    ).token;
    const captureResponse = await request(app, "/capture", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: "https://www.instagram.com/p/example123" }),
    });
    expect(captureResponse.status).toBe(500);
    expect(
      (
        await request(app, "/profile", {
          headers: { authorization: `Bearer ${token}` },
        })
      ).status,
    ).toBe(500);
  });

  test("profiles resolve identity through the app-owned auth service", async () => {
    const app = createApp(
      loadConfig({ APP_ENV: "test", MONGO_URI: "", REDIS_URL: "" }),
    );
    const auth = (app as ReturnType<typeof createApp> & { auth: AuthService })
      .auth;
    expect(auth).toBeDefined();
    const claims: GoogleClaims = {
      issuer: "test",
      audience: "test",
      nonce: "test",
      subject: "profile-user",
      email: "profile-user@example.com",
      name: "Profile Test User",
      picture: "https://example.com/profile-test.png",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = (
      await auth.signIn(
        claims,
        { issuer: "test", audience: "test", nonce: "test" },
        3600,
      )
    ).token;
    const response = await request(app, "/profile", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      displayName: "Profile Test User",
      username: "profile-user@example.com",
      avatarUrl: "https://example.com/profile-test.png",
    });
  });

  test("requires owner scope for search", async () => {
    const response = await request(
      createApp(loadConfig({ APP_ENV: "test" })),
      "/v1/search?q=design",
    );
    expect(response.status).toBe(401);
  });
});
