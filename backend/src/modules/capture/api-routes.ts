import { Elysia, t } from "elysia";
import { AuthError, AuthService } from "../auth/service";
import { CaptureError } from "./types";
import { CaptureService } from "./service";

const scopeFromHeaders = (
  auth: AuthService,
  authorization: string | undefined,
) => {
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token)
    throw new AuthError("AUTH_REQUIRED", "Authentication is required");
  return auth.authenticate(token);
};

export const captureApiRoutes = (service: CaptureService, auth: AuthService) =>
  new Elysia({ name: "capture-api" })
    .post(
      "/capture",
      async ({ body, headers, set }) => {
        const scope = scopeFromHeaders(auth, headers.authorization);
        const result = await service.capture(
          {
            rawUrl: body.url,
            ...(headers["idempotency-key"]
              ? { idempotencyKey: headers["idempotency-key"] }
              : {}),
          },
          scope,
        );
        set.status = result.duplicate ? 200 : 201;
        return {
          postId: result.post.id,
          duplicate: result.duplicate,
          replayed: result.replayed,
          sourceStatus: result.post.sourceStatus,
          analysisStatus: result.post.analysisStatus,
        };
      },
      { body: t.Object({ url: t.String({ minLength: 1, maxLength: 2048 }) }) },
    )
    .get(
      "/captured-posts",
      async ({ headers, query }) =>
        service.list(
          scopeFromHeaders(auth, headers.authorization),
          query.cursor,
          query.limit ? Number(query.limit) : 20,
        ),
      {
        query: t.Object({
          cursor: t.Optional(t.String()),
          limit: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/captured-posts/:postId",
      async ({ headers, params }) =>
        service.get(
          scopeFromHeaders(auth, headers.authorization),
          params.postId,
        ),
      { params: t.Object({ postId: t.String() }) },
    )
    .delete(
      "/captured-posts/:postId",
      async ({ headers, params }) =>
        service.delete(
          scopeFromHeaders(auth, headers.authorization),
          params.postId,
        ),
      { params: t.Object({ postId: t.String() }) },
    )
    .onError(({ error, set }) => {
      if (error instanceof AuthError) {
        set.status = 401;
        return { code: error.code, message: error.message };
      }
      if (error instanceof CaptureError) {
        set.status = error.code === "POST_NOT_FOUND" ? 404 : 422;
        return {
          code: error.code,
          message: error.message,
          ...(error.field ? { field: error.field } : {}),
        };
      }
    });
