import { analysisStages, createStageStates, stageKey, type AnalysisJob, type AnalysisReason, type AnalysisStage, type SafeError } from './contracts'
import type { AnalysisRepository } from './repository'
import type { DerivedPostStore, EventPublisher } from './events'

export interface StageHandler {
  run(job: AnalysisJob, stage: AnalysisStage): Promise<void>
}

const isRetryable = (error: unknown): boolean => error instanceof Error && error.name !== 'PermanentError'
const safeError = (error: unknown, retryable: boolean): SafeError => ({ code: error instanceof Error && error.name === 'PermanentError' ? 'PERMANENT_ERROR' : 'STAGE_ERROR', message: error instanceof Error ? error.message : 'Analysis stage failed', retryable })

export class AnalysisOrchestrator {
  constructor(private readonly repository: AnalysisRepository, private readonly handler: StageHandler, private readonly maxAttempts = 3, private readonly publisher?: EventPublisher) {}

  async enqueue(postId: string, ownerId: string, version: number, reason: AnalysisReason = 'accepted') {
    const key = `${postId}:${version}`
    const existing = await this.repository.findByKey(key)
    if (existing) return existing
    const now = new Date().toISOString()
    const job = await this.repository.save({ id: crypto.randomUUID(), postId, ownerId, postVersion: version, reason, status: 'queued', stages: createStageStates(now), idempotencyKey: key, createdAt: now, updatedAt: now })
    if (this.publisher) await this.publisher.publish({ type: 'analysis.requested', version: 1, job })
    return job
  }

  async process(id: string) {
    const job = await this.repository.get(id)
    if (!job) throw new Error('Analysis job not found')
    for (const stage of analysisStages) {
      const state = job.stages[stage]
      if (state.status === 'completed') continue
      const processing = { ...state, status: 'processing' as const, attempts: state.attempts + 1, updatedAt: new Date().toISOString() }
      await this.repository.updateStage(id, stage, processing)
      try {
        await this.handler.run(job, stage)
        await this.repository.updateStage(id, stage, { ...processing, status: 'completed', updatedAt: new Date().toISOString(), error: undefined })
      } catch (error) {
        const retryable = isRetryable(error) && processing.attempts < this.maxAttempts
        await this.repository.updateStage(id, stage, { ...processing, status: retryable ? 'retryable' : 'failed', updatedAt: new Date().toISOString(), error: safeError(error, retryable), ...(retryable ? { nextAttemptAt: new Date(Date.now() + 2 ** processing.attempts * 1000).toISOString() } : {}) })
        break
      }
    }
    const updated = await this.repository.get(id) as AnalysisJob
    const states = Object.values(updated.stages)
    const failed = states.some((state) => state.status === 'failed')
    const pending = states.some((state) => state.status !== 'completed')
    updated.status = failed ? (states.some((state) => state.status === 'completed') ? 'partial' : 'failed') : pending ? 'processing' : 'completed'
    const saved = await this.repository.save(updated)
    if (this.publisher) await this.publisher.publish({ type: 'analysis.updated', version: 1, job: saved })
    return saved
  }

  async retry(id: string) {
    const job = await this.repository.get(id)
    if (!job) throw new Error('Analysis job not found')
    for (const stage of analysisStages) if (job.stages[stage].status !== 'completed') job.stages[stage] = { ...job.stages[stage], status: 'queued', error: undefined, nextAttemptAt: undefined }
    return this.repository.save({ ...job, reason: 'manual-retry', status: 'queued', updatedAt: new Date().toISOString() })
  }
}

export const stageIdempotencyKey = stageKey
