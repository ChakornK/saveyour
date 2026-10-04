import type { AnalysisJob, AnalysisStage, StageState } from "./contracts";

export interface AnalysisRepository {
  save(job: AnalysisJob): Promise<AnalysisJob>;
  get(id: string): Promise<AnalysisJob | undefined>;
  findByKey(key: string): Promise<AnalysisJob | undefined>;
  updateStage(
    id: string,
    stage: AnalysisStage,
    state: StageState,
  ): Promise<AnalysisJob>;
  listLeased?(): Promise<AnalysisJob[]>;
  listRetryable?(): Promise<AnalysisJob[]>;
}

export class InMemoryAnalysisRepository implements AnalysisRepository {
  private readonly jobs = new Map<string, AnalysisJob>();
  private readonly keys = new Map<string, string>();

  async save(job: AnalysisJob) {
    const existingId = this.keys.get(job.idempotencyKey);
    if (existingId && existingId !== job.id)
      return structuredClone(this.jobs.get(existingId) as AnalysisJob);
    this.keys.set(job.idempotencyKey, job.id);
    this.jobs.set(job.id, structuredClone(job));
    return structuredClone(job);
  }

  async get(id: string) {
    const job = this.jobs.get(id);
    return job ? structuredClone(job) : undefined;
  }

  async findByKey(key: string) {
    const id = this.keys.get(key);
    return id ? this.get(id) : undefined;
  }

  async listRetryable() {
    return [...this.jobs.values()]
      .filter((job) => job.status === "processing")
      .map((job) => structuredClone(job));
  }

  async updateStage(id: string, stage: AnalysisStage, state: StageState) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Analysis job not found");
    job.stages[stage] = structuredClone(state);
    job.updatedAt = new Date().toISOString();
    this.jobs.set(id, job);
    return structuredClone(job);
  }
}
