import type { Collection } from "mongodb";
import type {
  AnalysisJob,
  AnalysisStage,
  StageState,
} from "../../modules/analysis/contracts";
import type { AnalysisRepository } from "../../modules/analysis/repository";
import type { MongoDatabase } from "./client";

export class MongoAnalysisRepository implements AnalysisRepository {
  private collection?: Collection<AnalysisJob>;
  constructor(private readonly mongo: MongoDatabase) {}

  private get jobs() {
    return (this.collection ??= this.mongo
      .db()
      .collection<AnalysisJob>("analysis_jobs"));
  }

  async ensureIndexes() {
    await this.jobs.createIndex({ idempotencyKey: 1 }, { unique: true });
    await this.jobs.createIndex({ status: 1, updatedAt: 1 });
  }
  async save(job: AnalysisJob) {
    const { _id, ...document } = job as AnalysisJob & { _id?: unknown };
    await this.jobs.updateOne(
      { idempotencyKey: job.idempotencyKey },
      { $set: document },
      { upsert: true },
    );
    return structuredClone(job);
  }
  private withoutMongoId(job: AnalysisJob & { _id?: unknown }) {
    const { _id, ...document } = job;
    return document as AnalysisJob;
  }

  async get(id: string) {
    const job = await this.jobs.findOne({ id });
    return job ? structuredClone(this.withoutMongoId(job)) : undefined;
  }
  async findByKey(key: string) {
    const job = await this.jobs.findOne({ idempotencyKey: key });
    return job ? structuredClone(this.withoutMongoId(job)) : undefined;
  }
  async listRetryable() {
    return (await this.jobs.find({ status: "processing" }).toArray()).map(
      (job) => structuredClone(this.withoutMongoId(job)),
    );
  }
  async updateStage(id: string, stage: AnalysisStage, state: StageState) {
    const result = await this.jobs.findOneAndUpdate(
      { id: id },
      {
        $set: {
          [`stages.${stage}`]: state,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("Analysis job not found");
    return structuredClone(this.withoutMongoId(result));
  }
}
