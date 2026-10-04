import { Elysia, t } from "elysia";
import type { AnalysisOrchestrator } from "../analysis/orchestrator";
import type { AcceptedPost, PostSource } from "../analysis/pipeline";
import { requireOwner } from "../auth/owner-scope";
import { normalizePostUrl } from "./url-policy";

export const captureRoutes = (
  source: PostSource,
  orchestrator: AnalysisOrchestrator,
) =>
  new Elysia({ prefix: "/v1/posts" }).post(
    "/",
    async ({ body, headers, set }) => {
      const ownerId = requireOwner(headers, set);
      if (!ownerId)
        return { code: "UNAUTHORIZED", message: "owner identity is required" };
      if (body.sourceUrl) normalizePostUrl(body.sourceUrl);
      const post: AcceptedPost = {
        postId: body.postId,
        ownerId,
        version: body.version,
        sourceText: body.sourceText,
        platform: body.platform,
        albumIds: body.albumIds,
        capturedAt: body.capturedAt,
        mediaKinds: body.mediaKinds,
      };
      if (!source.save) throw new Error("Post source is read-only");
      await source.save(post);
      const job = await orchestrator.enqueue(
        body.postId,
        ownerId,
        body.version,
        "accepted",
      );
      return {
        postId: body.postId,
        version: body.version,
        jobId: job.id,
        status: "accepted" as const,
      };
    },
    {
      body: t.Object({
        postId: t.String(),
        version: t.Number({ minimum: 1 }),
        sourceText: t.String(),
        sourceUrl: t.Optional(t.String({ maxLength: 2048 })),
        platform: t.Optional(t.String()),
        albumIds: t.Optional(t.Array(t.String())),
        capturedAt: t.Optional(t.String()),
        mediaKinds: t.Optional(t.Array(t.String())),
      }),
    },
  );
