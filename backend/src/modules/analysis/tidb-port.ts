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
      await tx.query("INSERT INTO posts (id, owner_id, canonical_url, created_at) VALUES (?, ?, ?, ?)", [randomUUID(), input.ownerId, input.canonicalUrl, now]);
      await tx.query("INSERT INTO analysis_jobs (id, owner_id, post_id, idempotency_key, schema_version, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)", [jobId, input.ownerId, input.analysis.correlationId, input.analysis.idempotencyKey, input.analysis.schemaVersion, now, now]);
      await tx.query("INSERT INTO analysis_outbox (event_id, job_id, owner_id, event_type, correlation_id, idempotency_key, payload, created_at) VALUES (?, ?, ?, 'analysis.requested', ?, ?, ?, ?)", [randomUUID(), jobId, input.ownerId, correlationId, input.analysis.idempotencyKey, JSON.stringify(input), now]);
    });
    return { jobId, idempotencyKey: input.analysis.idempotencyKey, correlationId, replayed: false };
  }

  async claimLease(jobId: string, workerId: string): Promise<JobLease> {
    const now = new Date();
    const expires = new Date(now.getTime() + this.leaseMs);
    const rows = await this.db.query<{ lease_version: number }>(
      "UPDATE analysis_jobs SET lease_owner = ?, lease_version = lease_version + 1, lease_expires_at = ?, status = 'processing', updated_at = ? WHERE id = ? AND (lease_expires_at IS NULL OR lease_expires_at <= ?)",
      [workerId, expires.toISOString(), now.toISOString(), jobId, now.toISOString()],
    );
    if (!rows) throw new Error("Lease acquisition failed");
    const current = await this.db.query<{ lease_version: number }>("SELECT lease_version FROM analysis_jobs WHERE id = ? AND lease_owner = ?", [jobId, workerId]);
    if (!current[0]) throw new Error("Job lease unavailable");
    return { jobId, owner: workerId, version: current[0].lease_version, acquiredAt: now.toISOString(), expiresAt: expires.toISOString() };
  }

  async loadJobContext(jobId: string): Promise<JobContext> {
    const rows = await this.db.query<JobContext>("SELECT * FROM analysis_job_context WHERE job_id = ?", [jobId]);
    if (!rows[0]) throw new Error("Job context not found");
    return rows[0];
  }

  async persistCompletion(completion: AnalysisCompletion, lease: JobLease): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx.query("SELECT completion_key FROM analysis_completions WHERE completion_key = ?", [completion.completionIdempotencyKey]);
      if (existing[0]) return;
      const guard = await tx.query("UPDATE analysis_jobs SET status = 'completed', updated_at = ? WHERE id = ? AND lease_owner = ? AND lease_version = ?", [new Date().toISOString(), completion.jobId, lease.owner, lease.version]);
      if (!guard) throw new Error("STALE_LEASE");
      await tx.query("INSERT INTO analysis_completions (completion_key, job_id, lease_version, payload, created_at) VALUES (?, ?, ?, ?, ?)", [completion.completionIdempotencyKey, completion.jobId, lease.version, JSON.stringify(completion), new Date().toISOString()]);
      await tx.query("INSERT INTO analysis_outbox (event_id, job_id, owner_id, event_type, correlation_id, idempotency_key, payload, created_at) SELECT ?, job_id, owner_id, 'analysis.completed', ?, ?, ?, ? FROM analysis_jobs WHERE id = ?", [randomUUID(), completion.correlationId, completion.completionIdempotencyKey, JSON.stringify(completion), completion.jobId,]);
    });
  }

  async markFailure(failure: ClassifiedFailure, lease: JobLease): Promise<void> {
    await this.db.query("UPDATE analysis_jobs SET status = ?, attempts = attempts + 1, updated_at = ? WHERE id = ? AND lease_owner = ? AND lease_version = ?", [failure.retryable ? "retryable" : "failed", new Date().toISOString(), lease.jobId, lease.owner, lease.version]);
  }
}
