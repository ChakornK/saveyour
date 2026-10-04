import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { AuthError, AuthService } from "../auth/service";
import { authContext } from "../auth/context";
import { CaptureError } from "./types";
import type { CaptureRepository } from "./repository";
import type { MediaStore } from "../media/store";

const dataUrlPattern =
  /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/;

const decodeImage = (value: string): { body: Uint8Array; mimeType: string } => {
  const match = dataUrlPattern.exec(value);
  const encoded = match?.[2] ?? value;
  const mimeType = match?.[1] ?? "image/jpeg";
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(encoded))
    throw new CaptureError(
      "URL_INVALID",
      "image must be a base64 string",
      "image",
    );
  const normalized = encoded.replace(/\s/g, "");
  const body = Uint8Array.from(Buffer.from(normalized, "base64"));
  if (body.byteLength === 0)
    throw new CaptureError("URL_INVALID", "image must not be empty", "image");
  if (
    Buffer.from(body).toString("base64").replace(/=+$/, "") !==
    normalized.replace(/=+$/, "")
  )
    throw new CaptureError("URL_INVALID", "image is not valid base64", "image");
  return { body, mimeType };
};

export const manualUploadRoutes = (
  repository: CaptureRepository,
  mediaStore: MediaStore | undefined,
  auth: AuthService,
) =>
  new Elysia({ name: "manual-upload" })
    .use(authContext(auth))
    .post(
      "/captured-posts/manual",
      async ({ body, authenticated, set }) => {
        if (!authenticated)
          throw new AuthError("AUTH_REQUIRED", "Authentication is required");
        if (!mediaStore)
          throw new Error("Manual uploads require SeaweedFS and MongoDB");
        const { body: image, mimeType } = decodeImage(body.image);
        const postId = randomUUID();
        const now = new Date().toISOString();
        const asset = await mediaStore.put(
          { postId, body: image, mimeType },
          authenticated,
        );
        const post = {
          id: postId,
          ownerId: authenticated.ownerId,
          canonicalUrl: `manual://${postId}`,
          platform: "pinterest" as const,
          capturedAt: now,
          updatedAt: now,
          sourceStatus: "resolved" as const,
          analysisStatus: "pending" as const,
          deletionState: "active" as const,
          description: body.description,
          mediaAssetId: asset.id,
        };
        try {
          await repository.insert(post);
        } catch (error) {
          await mediaStore
            .markDeleted(asset.id, authenticated)
            .catch(() => undefined);
          throw error;
        }
        set.status = 201;
        return {
          postId,
          mediaAssetId: asset.id,
          description: body.description,
        };
      },
      {
        body: t.Object({
          image: t.String({ minLength: 1 }),
          description: t.String({ minLength: 1, maxLength: 10_000 }),
        }),
      },
    )
    .onError(({ error, set }) => {
      if (error instanceof AuthError) {
        set.status = 401;
        return { code: error.code, message: error.message };
      }
      if (error instanceof CaptureError) {
        set.status = 422;
        return { code: error.code, message: error.message, field: error.field };
      }
    });
