import { Elysia, t } from "elysia";
import { AuthError, AuthService } from "../auth/service";
import { MediaError, type MediaStore } from "./store";

const bearer = (value: string | undefined) => {
  const token = value?.replace(/^Bearer\s+/i, "");
  if (!token)
    throw new AuthError("AUTH_REQUIRED", "Authentication is required");
  return token;
};

export const createMediaRoutes = (auth: AuthService, store: MediaStore) =>
  new Elysia({ name: "media" })
    .post(
      "/media",
      async ({ headers, body, set }) => {
        const scope = auth.authenticate(bearer(headers.authorization));
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
    .get(
      "/media/:assetId",
      async ({ headers, params }) => {
        const scope = auth.authenticate(bearer(headers.authorization));
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
