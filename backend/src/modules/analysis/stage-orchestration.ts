import type {
  AnalysisResultEnvelope,
  IntegrationStage,
  JobContext,
} from "./integration-contract";

export interface CortexStageProvider {
  analyzeImage(context: JobContext): Promise<AnalysisResultEnvelope>;
  analyzeFrames(context: JobContext): Promise<AnalysisResultEnvelope>;
  transcribeAudio(context: JobContext): Promise<AnalysisResultEnvelope>;
  generateTextEmbedding(context: JobContext): Promise<AnalysisResultEnvelope>;
  generateMultimodalEmbedding(context: JobContext): Promise<AnalysisResultEnvelope>;
}

export class AnalysisStageOrchestrator {
  constructor(private readonly provider: CortexStageProvider) {}

  run(stage: IntegrationStage, context: JobContext): Promise<AnalysisResultEnvelope> {
    switch (stage) {
      case "image": return this.provider.analyzeImage(context);
      case "frames": return this.provider.analyzeFrames(context);
      case "transcription": return this.provider.transcribeAudio(context);
      case "text-embedding": return this.provider.generateTextEmbedding(context);
      case "multimodal-embedding": return this.provider.generateMultimodalEmbedding(context);
    }
  }
}
