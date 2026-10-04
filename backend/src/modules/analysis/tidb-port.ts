import { randomUUID } from "node:crypto";
import type {
  AnalysisCompletion,
  CaptureInput,
  JobContext,
  JobLease,
  JobReceipt,
  ClassifiedFailure,
  TiDBIntegrationPort,
} from "./integration-contract";

export interface SqlExecutor {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

export class SqlTiDBIntegrationPort implements TiDBIntegrationPort {
  constructor(private readonly db: SqlExecutor, private readonly leaseMs = 300_000) {}

  async createCaptureTransaction(input: CaptureInput): Promise<JobReceipt> {
    const existing = await this.db.query<{ id: string; correlation_id: string }>(
      "SELECT id, correlation_id FROM analysis_jobs WHERE owner_id = ? AND idempotency_key = ?",
      [input.ownerId, input.analysis.idempotencyKey],
    );
    if (existing[0]) return {
      jobId: existing[0].id,
      idempotencyKey: input.analysis.idempotencyKey,
      correlationId: existing[0].correlation_id,
      replayed: true,
    };
    const jobId = randomUUID();
    const now = new Date().toISOString();
    const correlationId = input.analysis.correlationId;
    await this.db.transaction(async (tx) => {
      const postId = randomUUID();
      await tx.query("INSERT INTO posts (id, owner_id, canonical_url, created_at) VALUES (?, ?, ?, ?)", [postId, input.ownerId, input.canonicalUrl, now]);
      await tx.query("INSERT INTO analysis_jobs (id, owner_id, post_id, correlation_id, idempotency_key, schema_version, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)", [jobId, input.ownerId, postId, correlationId, input.analysis.idempotencyKey, input.analysis.schemaVersion, now, now]);
      await tx.query("INSERT INTO analysis_job_context (job_id, owner_id, post_id, schema_version, correlation_id, idempotency_key, post_version, requested_stages, media, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [jobId, input.ownerId, postId, input.analysis.schemaVersion, correlationId, input.analysis.idempotencyKey, 1, JSON.stringify(input.analysis.requestedStages), JSON.stringify(input.media), now]);
      await tx.query("INSERT INTO analysis_outbox (event_id, job_id, owner_id, event_type, correlation_id, idempotency_key, payload, created_at) VALUES (?, ?, ?, 'analysis.requested', ?, ?, ?, ?)", [randomUUID(), jobId, input.ownerId, correlationId, input.analysis.idempotencyKey, JSON.stringify(input), now]);
    });
    return { jobId, idempotencyKey: input.analysis.idempotencyKey, correlationId, replayed: false };
  }

  async claimLease(jobId: string, workerId: string): Promise<JobLease> {
    const now = new Date();
    const expires = new Date(now.getTime() + this.leaseMs);
    await this.db.query(
      "UPDATE analysis_jobs SET lease_owner = ?, lease_version = lease_version + 1, lease_expires_at = ?, status = 'processing', updated_at = ? WHERE id = ? AND (lease_expires_at IS NULL OR lease_expires_at <= ?)",
      [workerId, expires.toISOString(), now.toISOString(), jobId, now.toISOString()],
    );
    const current = await this.db.query<{ lease_version: number }>("SELECT lease_version FROM analysis_jobs WHERE id = ? AND lease_owner = ?", [jobId, workerId]);
    if (!current[0]) throw new Error("Job lease unavailable");
    return { jobId, owner: workerId, version: current[0].lease_version, acquiredAt: now.toISOString(), expiresAt: expires.toISOString() };
  }

  async renewLease(lease: JobLease, expiresAt: string): Promise<JobLease> {
    await this.db.query("UPDATE analysis_jobs SET lease_expires_at = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND lease_owner = ? AND lease_version = ?", [expiresAt, lease.jobId, lease.owner, lease.version]);
    const rows = await this.db.query<{ lease_version: number; lease_expires_at: string }>("SELECT lease_version, lease_expires_at FROM analysis_jobs WHERE id = ? AND lease_owner = ? AND lease_version = ?", [lease.jobId, lease.owner, lease.version]);
    const row = rows[0];
    if (!row) throw new Error("STALE_LEASE");
    return { ...lease, expiresAt: row.lease_expires_at };
  }

  async reclaimExpiredLeases(now: string): Promise<number> {
    const rows = await this.db.query<{ id: string }>("SELECT id FROM analysis_jobs WHERE lease_expires_at IS NOT NULL AND lease_expires_at <= ?", [now]);
    await this.db.query("UPDATE analysis_jobs SET lease_owner = NULL, lease_expires_at = NULL, status = 'queued', updated_at = ? WHERE lease_expires_at IS NOT NULL AND lease_expires_at <= ?", [now, now]);
    return rows.length;
  }

  async loadJobContext(jobId: string): Promise<JobContext> {
    const rows = await this.db.query<JobContext>("SELECT * FROM analysis_job_context WHERE job_id = ?", [jobId]);
    if (!rows[0]) throw new Error("Job context not found");
    const context = rows[0];
    const raw = context as JobContext & { requested_stages?: string | unknown[]; media?: string | unknown[] };
    const normalized = {
      ...context,
      requestedStages: typeof raw.requested_stages === "string" ? JSON.parse(raw.requested_stages) : raw.requested_stages ?? context.requestedStages,
      media: typeof raw.media === "string" ? JSON.parse(raw.media) : raw.media ?? context.media,
    } as JobContext;
    if (normalized.media.some((media) => media.ownerId !== normalized.ownerId || media.postId !== normalized.postId)) throw new Error("MEDIA_SCOPE_MISMATCH");
    return normalized;
  }

  async persistCompletion(completion: AnalysisCompletion, lease: JobLease): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx.query("SELECT completion_key FROM analysis_completions WHERE completion_key = ?", [completion.completionIdempotencyKey]);
      if (existing[0]) return;
      await tx.query("UPDATE analysis_jobs SET status = 'completed', updated_at = ? WHERE id = ? AND lease_owner = ? AND lease_version = ?", [new Date().toISOString(), completion.jobId, lease.owner, lease.version]);
      const guarded = await tx.query<{ job_id: string }>("SELECT id AS job_id FROM analysis_jobs WHERE id = ? AND lease_owner = ? AND lease_version = ?", [completion.jobId, lease.owner, lease.version]);
      if (!guarded[0]) throw new Error("STALE_LEASE");
      for (const result of completion.results) {
        await tx.query("INSERT INTO analysis_results (result_key, job_id, post_id, media_asset_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)", [`${completion.completionIdempotencyKey}:${result.mediaAssetId ?? "post"}`, completion.jobId, completion.postId, result.mediaAssetId ?? null, JSON.stringify(result), new Date().toISOString()]);
      }
      for (const stage of completion.completedStages) {
        await tx.query("INSERT INTO analysis_stage_states (job_id, stage, status, attempts, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), attempts = VALUES(attempts), payload = VALUES(payload), updated_at = VALUES(updated_at)", [completion.jobId, stage.stage, stage.status, stage.attempts, JSON.stringify(stage), stage.updatedAt]);
      }
      await tx.query("INSERT INTO analysis_completions (completion_key, job_id, lease_version, payload, created_at) VALUES (?, ?, ?, ?, ?)", [completion.completionIdempotencyKey, completion.jobId, lease.version, JSON.stringify(completion), new Date().toISOString()]);
      await tx.query("INSERT INTO analysis_outbox (event_id, job_id, owner_id, event_type, correlation_id, idempotency_key, payload, created_at) SELECT ?, job_id, owner_id, 'analysis.completed', ?, ?, ?, ? FROM analysis_jobs WHERE id = ?", [randomUUID(), completion.correlationId, completion.completionIdempotencyKey, JSON.stringify(completion), completion.jobId,]);
    });
  }

  async markFailure(failure: ClassifiedFailure, lease: JobLease): Promise<void> {
    await this.db.query("UPDATE analysis_jobs SET status = ?, attempts = attempts + 1, updated_at = ? WHERE id = ? AND lease_owner = ? AND lease_version = ?", [failure.retryable ? "retryable" : "failed", new Date().toISOString(), lease.jobId, lease.owner, lease.version]);
  }
}
