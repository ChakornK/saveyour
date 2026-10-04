import type { AnalysisJob } from "./contracts";

export interface DurableOutboxRecord {
  eventId: string;
  job: AnalysisJob;
  correlationId: string;
  idempotencyKey: string;
  attempts: number;
  status: "pending" | "retryable" | "dead-letter" | "delivered";
  nextAttemptAt?: string;
}

export interface DurableOutbox {
  claim(limit: number): Promise<DurableOutboxRecord[]>;
  markDelivered(eventId: string): Promise<void>;
  markRetry(
    eventId: string,
    attempts: number,
    nextAttemptAt: string,
  ): Promise<void>;
  markDeadLetter(
    eventId: string,
    attempts: number,
    error: string,
  ): Promise<void>;
}

export interface JobReferenceQueue {
  publish(reference: {
    jobId: string;
    correlationId: string;
    idempotencyKey: string;
  }): Promise<void>;
}

export class OutboxQueuePublisher {
  constructor(
    private readonly outbox: DurableOutbox,
    private readonly queue: JobReferenceQueue,
    private readonly maxAttempts = 5,
  ) {}

  async runOnce(limit = 100): Promise<number> {
    const records = await this.outbox.claim(limit);
    for (const record of records) {
      try {
        await this.queue.publish({
          jobId: record.job.id,
          correlationId: record.correlationId,
          idempotencyKey: record.idempotencyKey,
        });
        await this.outbox.markDelivered(record.eventId);
      } catch (error) {
        const attempts = record.attempts + 1;
        if (attempts >= this.maxAttempts) {
          await this.outbox.markDeadLetter(
            record.eventId,
            attempts,
            error instanceof Error ? error.message : "Queue publication failed",
          );
          continue;
        }
        await this.outbox.markRetry(
          record.eventId,
          attempts,
          new Date(Date.now() + 2 ** attempts * 1000).toISOString(),
        );
      }
    }
    return records.length;
  }
}
