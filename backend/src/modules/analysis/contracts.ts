export const analysisStages = [
  "fetch",
  "extract",
  "describe",
  "transcribe",
  "normalize",
  "embed",
  "persist",
  "index",
] as const;
export type AnalysisStage = (typeof analysisStages)[number];

export const stageStatuses = [
  "queued",
  "processing",
  "retryable",
  "completed",
  "failed",
] as const;
export type StageStatus = (typeof stageStatuses)[number];

export type AnalysisReason = "accepted" | "manual-retry" | "replay";
export type AnalysisStatus =
  "queued" | "processing" | "partial" | "completed" | "failed";

export interface Provenance {
  provider: string;
  model?: string;
  promptVersion?: string;
  generatedAt: string;
  confidence?: number;
}

export interface SafeError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface StageState {
  stage: AnalysisStage;
  status: StageStatus;
  attempts: number;
  updatedAt: string;
  nextAttemptAt?: string;
  error?: SafeError;
}

export interface AnalysisJob {
  id: string;
  postId: string;
  ownerId: string;
  postVersion: number;
  reason: AnalysisReason;
  status: AnalysisStatus;
  stages: Record<AnalysisStage, StageState>;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDescription {
  text: string;
  tags: string[];
  provenance: Provenance;
}

export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
}

export interface Transcript {
  segments: TranscriptSegment[];
  provenance: Provenance;
}

export interface SearchDocument {
  documentId: string;
  ownerId: string;
  postId: string;
  text: string;
  tags: string[];
  platform?: string;
  albumIds: string[];
  capturedAt?: string;
  mediaKinds: string[];
  analysisStatus: AnalysisStatus;
  embedding?: number[];
  indexVersion: number;
}

export const stageKey = (
  postId: string,
  version: number,
  stage: AnalysisStage,
) => `${postId}:${version}:${stage}`;

export const createStageStates = (
  now: string,
): Record<AnalysisStage, StageState> =>
  Object.fromEntries(
    analysisStages.map((stage) => [
      stage,
      { stage, status: "queued", attempts: 0, updatedAt: now },
    ]),
  ) as Record<AnalysisStage, StageState>;
