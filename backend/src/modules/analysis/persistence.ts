import {
  completionKey,
  type AnalysisCompletion,
  type JobLease,
  type TiDBIntegrationPort,
} from "./integration-contract";

export interface CompletionTransactionStore {
  findCompletion(key: string): Promise<AnalysisCompletion | undefined>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
  persistCompletion(
    completion: AnalysisCompletion,
    lease: JobLease,
  ): Promise<void>;
}

export class AtomicCompletionPersister {
  constructor(private readonly store: CompletionTransactionStore) {}

  async persist(
    completion: AnalysisCompletion,
    lease: JobLease,
  ): Promise<AnalysisCompletion> {
    const key =
      completion.completionIdempotencyKey ||
      completionKey(completion.jobId, lease.version);
    const existing = await this.store.findCompletion(key);
    if (existing) return existing;
    await this.store.transaction(() =>
      this.store.persistCompletion(completion, lease),
    );
    return completion;
  }
}

export class CompletionPort implements Pick<
  TiDBIntegrationPort,
  "persistCompletion"
> {
  constructor(private readonly persister: AtomicCompletionPersister) {}
  async persistCompletion(completion: AnalysisCompletion, lease: JobLease) {
    await this.persister.persist(completion, lease);
  }
}
