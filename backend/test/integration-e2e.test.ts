import { expect, test } from "bun:test";
import type { AnalysisCompletion, JobContext, JobLease, JobReceipt, TiDBIntegrationPort } from "../src/modules/analysis/integration-contract";
import { IntegrationCoordinatorImpl, type IntegrationProvider } from "../src/modules/analysis/coordinator";

class FakeTiDB implements TiDBIntegrationPort {
  persisted: AnalysisCompletion[] = [];
  async createCaptureTransaction(): Promise<JobReceipt> {
    return { jobId: "job-1", idempotencyKey: "owner:key", correlationId: "corr-1", replayed: false };
  }
  async claimLease(jobId: string, workerId: string): Promise<JobLease> {
    return { jobId, owner: workerId, version: 1, acquiredAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() };
  }
  async loadJobContext(jobId: string): Promise<JobContext> {
    return { schemaVersion: 1, jobId, ownerId: "owner-1", postId: "post-1", mediaAssetIds: [], requestedStages: ["transcription"], idempotencyKey: "key", correlationId: "corr-1", createdAt: new Date().toISOString(), postVersion: 1, media: [] };
  }
  async persistCompletion(completion: AnalysisCompletion): Promise<void> { this.persisted.push(completion); }
  async markFailure(): Promise<void> { throw new Error("unexpected failure"); }
}

const provider: IntegrationProvider = {
  async run(stage, context) {
    return {
      stage,
      result: {
        schemaVersion: 1,
        jobId: context.jobId,
        postId: context.postId,
        provider: "cortex",
        providerModel: "fake",
        status: "completed",
        tags: [],
        frameResults: [],
        warnings: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        idempotencyKey: context.idempotencyKey,
        correlationId: context.correlationId,
      },
    };
  },
};

test("runs a job through lease, provider, and persistence", async () => {
  const tidb = new FakeTiDB();
  const coordinator = new IntegrationCoordinatorImpl(tidb, provider);
  const completion = await coordinator.process("job-1", "worker-1");
  await coordinator.persistResults(completion, { jobId: "job-1", owner: "worker-1", version: 1, acquiredAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() });
  expect(tidb.persisted).toHaveLength(1);
  expect(tidb.persisted[0]?.results[0]?.transcript).toBeUndefined();
});
