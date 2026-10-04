import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { AuthError, AuthService } from "../auth/service";
import { MediaError, type MediaStore } from "./store";
import type { MediaDownloadQueue } from "./download-queue";

const bearer = (value: string | undefined) => {
  const token = value?.replace(/^Bearer\s+/i, "");
  if (!token)
    throw new AuthError("AUTH_REQUIRED", "Authentication is required");
  return token;
};

export const createMediaRoutes = (
  auth: AuthService,
  store: MediaStore,
  downloads?: MediaDownloadQueue,
) =>
  new Elysia({ name: "media" })
    .post(
      "/media",
      async ({ headers, body, set }) => {
        const scope = await auth.authenticate(bearer(headers.authorization));
        const asset = await store.put(
          {
            postId: body.postId,
            body: new Uint8Array(await body.file.arrayBuffer()),
            mimeType: body.file.type,
          },
          scope,
        );
        set.status = 201;
        return asset;
      },
      { body: t.Object({ postId: t.String(), file: t.File() }) },
    )
    .post(
      "/media/download",
      async ({ headers, body, set }) => {
        const scope = await auth.authenticate(bearer(headers.authorization));
        if (!downloads) {
          set.status = 503;
          return {
            code: "MEDIA_QUEUE_UNAVAILABLE",
            message: "Media download queue unavailable",
          };
        }
        const job = {
          id: randomUUID(),
          url: body.url,
          postId: body.postId,
          scope,
          attempts: 0,
        };
        await downloads.enqueue(job);
        set.status = 202;
        return { jobId: job.id, status: "queued" as const };
      },
      {
        body: t.Object({
          postId: t.String(),
          url: t.String({ minLength: 1, maxLength: 2048 }),
        }),
      },
    )
    .get(
      "/media/:assetId",
      async ({ headers, params }) => {
        const scope = await auth.authenticate(bearer(headers.authorization));
        const result = await store.authorizeRead(params.assetId, scope);
        return new Response(result.body.buffer as ArrayBuffer, {
          headers: {
            "content-type": result.asset.mimeType,
            "cache-control": "private, max-age=60",
          },
        });
      },
      { params: t.Object({ assetId: t.String() }) },
    )
    .onError(({ error, set }) => {
      if (error instanceof AuthError) {
        set.status = 401;
        return { code: error.code, message: error.message };
      }
      if (error instanceof MediaError) {
        set.status =
          error.code === "MEDIA_FORBIDDEN" || error.code === "MEDIA_NOT_FOUND"
            ? 404
            : 422;
        return { code: error.code, message: error.message };
      }
    });
