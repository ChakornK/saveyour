import {
  captureIdempotencyKey,
  type CaptureInput,
  type JobReceipt,
  type AnalysisPersistencePort,
} from "./integration-contract";

export interface CaptureTransactionStore {
  createPostAndJob(
    input: CaptureInput & { idempotencyKey: string },
  ): Promise<JobReceipt>;
  findCaptureByIdempotencyKey(key: string): Promise<JobReceipt | undefined>;
}

export class CaptureTransactionPort implements AnalysisPersistencePort {
  constructor(private readonly store: CaptureTransactionStore) {}

  async createCaptureTransaction(input: CaptureInput): Promise<JobReceipt> {
    const idempotencyKey = captureIdempotencyKey(
      input.ownerId,
      input.analysis.idempotencyKey,
    );
    const existing =
      await this.store.findCaptureByIdempotencyKey(idempotencyKey);
    if (existing) return { ...existing, replayed: true };

    return this.store.createPostAndJob({ ...input, idempotencyKey });
  }

  renewLease(): Promise<never> {
    return Promise.reject(new Error("Lease support is not configured"));
  }

  reclaimExpiredLeases(): Promise<never> {
    return Promise.reject(new Error("Lease support is not configured"));
  }

  claimLease(): Promise<never> {
    return Promise.reject(new Error("Lease support is not configured"));
  }

  loadJobContext(): Promise<never> {
    return Promise.reject(new Error("Job context support is not configured"));
  }

  persistCompletion(): Promise<void> {
    return Promise.reject(new Error("Completion support is not configured"));
  }

  markFailure(): Promise<void> {
    return Promise.reject(new Error("Failure support is not configured"));
  }
}
