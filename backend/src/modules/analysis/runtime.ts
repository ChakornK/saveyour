import type { AnalysisCompletion, JobLease } from "./integration-contract";
import { retryDecision, type RetryDecision } from "./retry-policy";

export interface QueueMessage {
  jobId: string;
  correlationId: string;
  idempotencyKey: string;
}

export interface QueueRuntime {
  ack(message: QueueMessage): Promise<void>;
  retry(message: QueueMessage, nextAttemptAt: string): Promise<void>;
  deadLetter(message: QueueMessage, reason: string): Promise<void>;
}

export interface CompletionRuntime {
  process(jobId: string, workerId: string): Promise<AnalysisCompletion>;
  persistResults(
    completion: AnalysisCompletion,
    lease: JobLease,
  ): Promise<void>;
}

export class AnalysisQueueRuntime {
  constructor(
    private readonly queue: QueueRuntime,
    private readonly coordinator: CompletionRuntime,
  ) {}

  async handle(
    message: QueueMessage,
    workerId: string,
    lease: JobLease,
  ): Promise<void> {
    try {
      const completion = await this.coordinator.process(
        message.jobId,
        workerId,
      );
      if (
        completion.jobId !== message.jobId ||
        completion.correlationId !== message.correlationId
      )
        throw new Error("QUEUE_IDENTITY_MISMATCH");
      await this.coordinator.persistResults(completion, lease);
      await this.queue.ack(message);
    } catch (error) {
      const decision: RetryDecision = retryDecision({
        category: "persistence",
        code: "ANALYSIS_PROCESSING_FAILED",
        message:
          error instanceof Error ? error.message : "Analysis processing failed",
        retryable: true,
        attempt: 1,
        correlationId: message.correlationId,
      });
      if (decision.retry && decision.nextAttemptAt)
        await this.queue.retry(message, decision.nextAttemptAt);
      else
        await this.queue.deadLetter(
          message,
          error instanceof Error ? error.message : "Analysis processing failed",
        );
    }
  }
}
