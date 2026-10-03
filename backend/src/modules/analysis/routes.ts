import { Elysia, t } from 'elysia'
import type { AnalysisOrchestrator } from './orchestrator'
import type { AnalysisRepository } from './repository'
import type { InMemoryAnalysisMetrics } from './observability'

export const analysisRoutes = (orchestrator: AnalysisOrchestrator, repository: AnalysisRepository, metrics: InMemoryAnalysisMetrics) => new Elysia({ prefix: '/v1/analysis' })
  .post('/jobs', async ({ body }) => orchestrator.enqueue(body.postId, body.ownerId, body.version, body.reason), { body: t.Object({ postId: t.String(), ownerId: t.String(), version: t.Number(), reason: t.Optional(t.Union([t.Literal('accepted'), t.Literal('manual-retry'), t.Literal('replay')])) }) })
  .get('/jobs/:id', async ({ params, set }) => {
    const job = await repository.get(params.id)
    if (!job) { set.status = 404; return { code: 'NOT_FOUND', message: 'Analysis job not found' } }
    return job
  })
  .post('/jobs/:id/process', async ({ params }) => orchestrator.process(params.id))
  .post('/jobs/:id/retry', async ({ params }) => orchestrator.retry(params.id))
  .get('/metrics', () => metrics.snapshot())
