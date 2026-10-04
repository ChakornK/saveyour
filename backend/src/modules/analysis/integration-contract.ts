export const integrationSchemaVersion = 1 as const;
export type IntegrationSchemaVersion = typeof integrationSchemaVersion;

export const integrationStages = [
  "image",
  "frames",
  "transcription",
  "text-embedding",
  "multimodal-embedding",
] as const;
export type IntegrationStage = (typeof integrationStages)[number];

export type ResultStatus = "completed" | "partial" | "failed";
export type FailureCategory =
  | "transient"
  | "capability"
  | "configuration"
  | "input"
  | "media"
  | "persistence"
  | "stale-lease"
  | "permanent-content";

export interface AnalysisJobRequest {
  schemaVersion: IntegrationSchemaVersion;
  jobId: string;
  ownerId: string;
  postId: string;
  mediaAssetIds: string[];
  requestedStages: IntegrationStage[];
  idempotencyKey: string;
  correlationId: string;
}

export interface JobContext extends AnalysisJobRequest {
  createdAt: string;
  postVersion: number;
  media: MediaReference[];
}

export interface MediaReference {
  id: string;
  ownerId: string;
  postId: string;
  uri: string;
  mimeType: string;
  durationMs?: number;
}

export interface IntegrationStageState {
  stage: IntegrationStage;
  status: "queued" | "processing" | "retryable" | "completed" | "failed";
  attempts: number;
  updatedAt: string;
  nextAttemptAt?: string;
  error?: ClassifiedFailure;
}

export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
}

export interface TranscriptResult {
  language?: string;
  text: string;
  segments: TranscriptSegment[];
  provider: "cortex";
  model: string;
}

export interface EmbeddingResult {
  modality: "text" | "multimodal";
  vector: number[];
  model: string;
}

export interface TagResult {
  value: string;
  confidence?: number;
}

export interface FrameResult {
  timestampMs: number;
  caption?: string;
  tags: TagResult[];
}

export interface AnalysisResultEnvelope {
  schemaVersion: IntegrationSchemaVersion;
  jobId: string;
  postId: string;
  mediaAssetId?: string;
  provider: "cortex";
  providerModel: string;
  providerModelVersion?: string;
  status: ResultStatus;
  caption?: string;
  tags: TagResult[];
  frameResults: FrameResult[];
  transcript?: TranscriptResult;
  textEmbedding?: EmbeddingResult;
  multimodalEmbedding?: EmbeddingResult;
  warnings: string[];
  startedAt: string;
  completedAt?: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface SearchDocument {
  documentId: string;
  ownerId: string;
  postId: string;
  text: string;
  tags: string[];
  mediaKinds: string[];
  analysisStatus: ResultStatus;
  embedding?: number[];
}

export interface ClassifiedFailure {
  category: FailureCategory;
  code: string;
  message: string;
  retryable: boolean;
  attempt: number;
  correlationId: string;
}

export interface JobLease {
  jobId: string;
  owner: string;
  version: number;
  acquiredAt: string;
  expiresAt: string;
}

export interface AnalysisCompletion {
  schemaVersion: IntegrationSchemaVersion;
  jobId: string;
  postId: string;
  leaseVersion: number;
  results: AnalysisResultEnvelope[];
  completedStages: IntegrationStageState[];
  failedStages: ClassifiedFailure[];
  searchDocument?: SearchDocument;
  completionIdempotencyKey: string;
  correlationId: string;
}

export interface JobReceipt {
  jobId: string;
  idempotencyKey: string;
  correlationId: string;
  replayed: boolean;
}

export interface CaptureInput {
  ownerId: string;
  canonicalUrl: string;
  media: MediaReference[];
  analysis: Omit<AnalysisJobRequest, "jobId" | "ownerId" | "postId" | "mediaAssetIds"> & {
    schemaVersion: IntegrationSchemaVersion;
  };
}

export interface TiDBIntegrationPort {
  createCaptureTransaction(input: CaptureInput): Promise<JobReceipt>;
  renewLease?(lease: JobLease, expiresAt: string): Promise<JobLease>;
  reclaimExpiredLeases?(now: string): Promise<number>;
  claimLease(jobId: string, workerId: string): Promise<JobLease>;
  loadJobContext(jobId: string): Promise<JobContext>;
  persistCompletion(completion: AnalysisCompletion, lease: JobLease): Promise<void>;
  markFailure(failure: ClassifiedFailure, lease: JobLease): Promise<void>;
}

export interface AnalysisCoordinator {
  enqueue(input: CaptureInput): Promise<JobReceipt>;
  process(jobId: string, workerId: string): Promise<AnalysisCompletion>;
  persistResults(completion: AnalysisCompletion, lease: JobLease): Promise<void>;
}

export class SchemaCompatibilityError extends Error {
  constructor(public readonly receivedVersion: number) {
    super(`Unsupported integration schema version: ${receivedVersion}`);
    this.name = "SchemaCompatibilityError";
  }
}

export function assertSupportedSchema(version: number): asserts version is IntegrationSchemaVersion {
  if (version !== integrationSchemaVersion) throw new SchemaCompatibilityError(version);
}

export const completionKey = (jobId: string, leaseVersion: number) =>
  `${integrationSchemaVersion}:${jobId}:${leaseVersion}`;

export const captureIdempotencyKey = (ownerId: string, key: string) =>
  `${ownerId}:${key}`;
