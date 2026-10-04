export const cortexPromptVersion = 'cortex-media-v1'
export const cortexSchemaVersion = 'cortex-result-v1'

export type CortexErrorCategory = 'configuration' | 'capability' | 'transient' | 'input' | 'response' | 'content' | 'authentication' | 'authorization' | 'validation' | 'permanent'

export class CortexError extends Error {
  constructor(public readonly category: CortexErrorCategory, message: string, public readonly remediation?: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'CortexError'
  }
}

export interface CortexClient {
  executeFunction(functionName: string, args: unknown[], signal?: AbortSignal): Promise<unknown>
  health(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>
  capability?(functionName: string, ttlMs?: number): Promise<boolean>
  close(): Promise<void>
}

export interface CortexCapabilities {
  status: 'available' | 'unavailable'
  functions: Record<string, boolean>
  checkedAt: string
  error?: CortexErrorCategory
}

export interface CortexMediaInput {
  artifactUri: string
  contentType: string
  sizeBytes: number
  ownerId: string
  postId: string
  promptVersion?: string
}

export interface CortexFrameInput {
  artifactUri: string
  timestampMs: number
  contentType: string
  sizeBytes: number
}

export interface CortexImageResult {
  caption: string | null
  tags: string[]
  observations: string[]
  warnings: string[]
  provider: 'snowflake-cortex'
  model: string
  modelVersion?: string
  schemaVersion: string
  promptVersion: string
}

export interface CortexFrameResult { timestampMs: number; caption: string | null; tags: string[]; observations: string[] }
export interface CortexFramesResult { frames: CortexFrameResult[]; aggregateDescription: string | null; warnings: string[]; provider: 'snowflake-cortex'; model: string; schemaVersion: string; promptVersion: string }

export interface CortexAudioInput extends CortexMediaInput { durationMs?: number; languageHint?: string }
export interface CortexTranscriptSegment { sequence: number; startMs: number; endMs: number; text: string; confidence?: number }
export interface CortexTranscriptResult { language: string | null; text: string; segments: CortexTranscriptSegment[]; provider: 'snowflake-cortex'; model: string; rawProviderResult: unknown; schemaVersion: string }

export interface CortexEmbeddingResult { entityType: string; entityId: string; model: string; modelVersion?: string; dimensions: number; vector: number[] }
