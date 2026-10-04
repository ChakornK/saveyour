import { Elysia, t } from "elysia";
import { AuthError, AuthService } from "../auth/service";
import { CaptureError } from "./types";
import { CaptureService } from "./service";
import { authContext } from "../auth/context";

const scopeFromContext = (authenticated: { ownerId: string } | undefined) => {
  if (!authenticated)
    throw new AuthError("AUTH_REQUIRED", "Authentication is required");
  return authenticated;
};

export const captureApiRoutes = (service: CaptureService, auth: AuthService) =>
  new Elysia({ name: "capture-api" })
    .use(authContext(auth))
    .post(
      "/capture",
      async ({ body, headers, set, authenticated }) => {
        const scope = scopeFromContext(authenticated);
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
      async ({ query, authenticated }) =>
        service.list(
          scopeFromContext(authenticated),
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
      async ({ params, authenticated }) =>
        service.get(scopeFromContext(authenticated), params.postId),
      { params: t.Object({ postId: t.String() }) },
    )
    .delete(
      "/captured-posts/:postId",
      async ({ params, authenticated }) =>
        service.delete(scopeFromContext(authenticated), params.postId),
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
