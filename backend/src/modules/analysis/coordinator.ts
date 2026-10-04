import {
  assertSupportedSchema,
  completionKey,
  type AnalysisCompletion,
  type AnalysisCoordinator,
  type CaptureInput,
  type ClassifiedFailure,
  type IntegrationStage,
  type IntegrationStageState,
  type JobLease,
  type JobContext,
  type JobReceipt,
  type AnalysisPersistencePort,
} from "./integration-contract";

export interface NormalizedProviderResult {
  stage: IntegrationStage;
  result: AnalysisCompletion["results"][number];
}

export interface IntegrationProvider {
  run(
    stage: IntegrationStage,
    context: JobContext,
  ): Promise<NormalizedProviderResult>;
}

export class IntegrationCoordinatorImpl implements AnalysisCoordinator {
  constructor(
    private readonly persistence: AnalysisPersistencePort,
    private readonly provider: IntegrationProvider,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async enqueue(input: CaptureInput): Promise<JobReceipt> {
    assertSupportedSchema(input.analysis.schemaVersion);
    if (!input.ownerId || !input.canonicalUrl) {
      throw new Error("Owner scope and canonical URL are required");
    }
    return this.persistence.createCaptureTransaction(input);
  }

  async process(jobId: string, workerId: string): Promise<AnalysisCompletion> {
    const lease = await this.persistence.claimLease(jobId, workerId);
    const context = await this.persistence.loadJobContext(jobId);
    if (context.jobId !== jobId) throw new Error("Job context mismatch");
    if (
      context.ownerId !== context.media[0]?.ownerId &&
      context.media.length > 0
    ) {
      throw new Error("Job media ownership mismatch");
    }
    assertSupportedSchema(context.schemaVersion);

    const results: AnalysisCompletion["results"] = [];
    const completedStages: IntegrationStageState[] = [];
    const failedStages: ClassifiedFailure[] = [];

    for (const stage of context.requestedStages) {
      try {
        const normalized = await this.provider.run(stage, context);
        if (
          normalized.stage !== stage ||
          normalized.result.jobId !== context.jobId ||
          normalized.result.postId !== context.postId ||
          normalized.result.correlationId !== context.correlationId
        ) {
          throw new Error("Provider result identity mismatch");
        }
        results.push(normalized.result);
        completedStages.push({
          stage,
          status: "completed",
          attempts: 1,
          updatedAt: this.now(),
        });
      } catch (error) {
        const failure: ClassifiedFailure = {
          category: "transient",
          code: "PROVIDER_STAGE_FAILED",
          message:
            error instanceof Error ? error.message : "Provider stage failed",
          retryable: true,
          attempt: 1,
          correlationId: context.correlationId,
        };
        failedStages.push(failure);
        completedStages.push({
          stage,
          status: "retryable",
          attempts: 1,
          updatedAt: this.now(),
          error: failure,
        });
      }
    }

    return {
      schemaVersion: context.schemaVersion,
      jobId: context.jobId,
      postId: context.postId,
      leaseVersion: lease.version,
      results,
      completedStages,
      failedStages,
      completionIdempotencyKey: completionKey(context.jobId, lease.version),
      correlationId: context.correlationId,
    };
  }

  persistResults(
    completion: AnalysisCompletion,
    lease: JobLease,
  ): Promise<void> {
    assertSupportedSchema(completion.schemaVersion);
    if (
      completion.leaseVersion !== lease.version ||
      completion.jobId !== lease.jobId ||
      completion.completionIdempotencyKey !==
        completionKey(completion.jobId, lease.version)
    ) {
      const failure: ClassifiedFailure = {
        category: "stale-lease",
        code: "STALE_LEASE",
        message: "Completion lease does not match the active lease",
        retryable: false,
        attempt: 1,
        correlationId: completion.correlationId,
      };
      return this.persistence.markFailure(failure, lease);
    }
    return this.persistence.persistCompletion(completion, lease);
  }
}
