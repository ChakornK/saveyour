import type { AnalysisJob } from "./contracts";
import type { DurableOutbox, DurableOutboxRecord } from "./outbox-port";
import type { SqlExecutor } from "./tidb-port";

export class SqlOutbox implements DurableOutbox {
  constructor(private readonly db: SqlExecutor) {}

  async claim(limit: number): Promise<DurableOutboxRecord[]> {
    const rows = await this.db.transaction(async (tx) => {
      const candidates = await tx.query<
        DurableOutboxRecord & { payload: string | AnalysisJob }
      >(
        "SELECT event_id AS eventId, job_id AS jobId, owner_id AS ownerId, correlation_id AS correlationId, idempotency_key AS idempotencyKey, attempts, status, payload FROM analysis_outbox WHERE status IN ('pending', 'retryable') AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP(3)) ORDER BY created_at LIMIT ? FOR UPDATE",
        [limit],
      );
      for (const candidate of candidates) {
        await tx.query(
          "UPDATE analysis_outbox SET status = 'publishing', attempts = attempts + 1 WHERE event_id = ?",
          [candidate.eventId],
        );
      }
      return candidates;
    });
    return rows.map((row) => ({
      ...row,
      job:
        typeof row.payload === "string"
          ? (JSON.parse(row.payload) as AnalysisJob)
          : (row.payload as unknown as AnalysisJob),
    }));
  }

  async markDelivered(eventId: string): Promise<void> {
    await this.db.query(
      "UPDATE analysis_outbox SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP(3) WHERE event_id = ?",
      [eventId],
    );
  }

  async markRetry(
    eventId: string,
    attempts: number,
    nextAttemptAt: string,
  ): Promise<void> {
    await this.db.query(
      "UPDATE analysis_outbox SET status = 'retryable', attempts = ?, next_attempt_at = ? WHERE event_id = ?",
      [attempts, nextAttemptAt, eventId],
    );
  }

  async markDeadLetter(
    eventId: string,
    attempts: number,
    error: string,
  ): Promise<void> {
    await this.db.query(
      "UPDATE analysis_outbox SET status = 'dead-letter', attempts = ?, last_error = ? WHERE event_id = ?",
      [attempts, error, eventId],
    );
  }
}
