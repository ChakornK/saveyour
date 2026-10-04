import type { JobContext, AnalysisResultEnvelope, IntegrationStage } from "./integration-contract";
import type { AiProvider } from "./provider";

export interface CortexAnalysisProvider {
  run(stage: IntegrationStage, context: JobContext): Promise<AnalysisResultEnvelope>;
}

export class AiBackedCortexProvider implements CortexAnalysisProvider {
  constructor(private readonly provider: AiProvider) {}

  async run(stage: IntegrationStage, context: JobContext): Promise<AnalysisResultEnvelope> {
    const now = new Date().toISOString();
    const result: AnalysisResultEnvelope = {
      schemaVersion: context.schemaVersion,
      jobId: context.jobId,
      postId: context.postId,
      provider: "cortex",
      providerModel: "configured",
      status: "completed",
      tags: [],
      frameResults: [],
      warnings: [],
      startedAt: now,
      idempotencyKey: `${context.idempotencyKey}:${stage}`,
      correlationId: context.correlationId,
    };
    const input = { content: context.media.map((media) => media.uri).join(" ") };
    if (stage === "image" || stage === "frames") {
      const description = await this.provider.describeImage(input);
      result.caption = description.text;
      result.tags = description.tags.map((value) => ({ value, confidence: description.provenance.confidence }));
      result.providerModel = description.provenance.model ?? "configured";
    } else if (stage === "transcription") {
      const transcript = await this.provider.transcribe(input);
      result.transcript = { text: transcript.segments.map((segment) => segment.text).join(" "), segments: transcript.segments, provider: "cortex", model: transcript.provenance.model ?? "configured" };
    } else {
      const embedding = await this.provider.embed(input);
      result.textEmbedding = { modality: "text", vector: embedding, model: "configured" };
    }
    result.completedAt = new Date().toISOString();
    return result;
  }
}
