import type { AppConfig } from "../../config/env";

export interface AnalysisFeatureFlags {
  cortexAnalysis: boolean;
  cortexTranscription: boolean;
}

export const analysisFeatureFlags = (config: AppConfig): AnalysisFeatureFlags => ({
  cortexAnalysis: config.integrationFlags?.cortexAnalysis ?? true,
  cortexTranscription: config.integrationFlags?.cortexTranscription ?? true,
});

export const assertStageEnabled = (flags: AnalysisFeatureFlags, stage: "transcription" | "analysis") => {
  if (stage === "transcription" && !flags.cortexTranscription) throw new Error("Cortex transcription is disabled");
  if (stage === "analysis" && !flags.cortexAnalysis) throw new Error("Cortex analysis is disabled");
};
