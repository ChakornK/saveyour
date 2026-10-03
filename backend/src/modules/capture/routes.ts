import { Elysia, t } from 'elysia'
import type { AnalysisOrchestrator } from '../analysis/orchestrator'
import type { AcceptedPost, PostSource } from '../analysis/pipeline'

export const captureRoutes = (source: PostSource, orchestrator: AnalysisOrchestrator) => new Elysia({ prefix: '/v1/posts' })
  .post('/', async ({ body }) => {
    const post: AcceptedPost = { postId: body.postId, ownerId: body.ownerId, version: body.version, sourceText: body.sourceText, platform: body.platform, albumIds: body.albumIds, capturedAt: body.capturedAt, mediaKinds: body.mediaKinds }
    if (!source.save) throw new Error('Post source is read-only')
    await source.save(post)
    const job = await orchestrator.enqueue(body.postId, body.ownerId, body.version, 'accepted')
    return { postId: body.postId, version: body.version, jobId: job.id, status: 'accepted' as const }
  }, { body: t.Object({ postId: t.String(), ownerId: t.String(), version: t.Number(), sourceText: t.String(), platform: t.Optional(t.String()), albumIds: t.Optional(t.Array(t.String())), capturedAt: t.Optional(t.String()), mediaKinds: t.Optional(t.Array(t.String())) }) })
