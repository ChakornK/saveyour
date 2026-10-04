# Requirements Document

## Introduction

This feature makes social-media analysis genuinely multimodal and performance-bound. The system will resolve a social URL to actual media bytes, use a vision-capable Gemini model for image description, benchmark and select a transcription provider, preserve Snowflake for embeddings or fallback operations, and verify the complete pipeline reaches a terminal result with correct visual content.

## Glossary

- **Analysis_Pipeline**: The workflow from social URL submission through media resolution, AI analysis, persistence, and indexing.
- **Media_Resolver**: The component that extracts, validates, downloads, and stores media associated with a social URL.
- **Vision_Provider**: The provider used to describe image content and return tags.
- **Transcription_Provider**: The provider used to convert audio into timestamped transcript segments.
- **Provider_Router**: The component that chooses a provider per operation based on configuration and capability.
- **Terminal_Status**: A job status of `completed`, `partial`, or `failed`.
- **Vision_Latency**: Elapsed time from the start of the vision request until validated vision output is available.

## Requirements

### Requirement 1: Resolve and Preserve Social Media

**User Story:** As an analysis user, I want a submitted social URL to produce the actual media bytes, so that AI analyzes the content rather than page text.

#### Acceptance Criteria

1. WHEN an Instagram URL is submitted, THE Media_Resolver SHALL extract at least one valid HTTPS media URL when the page exposes media.
2. WHEN a media URL is downloaded, THE Media_Resolver SHALL validate protocol, host, redirect count, content type, content length, and total byte count before persistence.
3. WHEN media download succeeds, THE Analysis_Pipeline SHALL preserve non-empty media bytes and the correct MIME type for every retry of the job.
4. IF media resolution or download fails, THEN THE Analysis_Pipeline SHALL record a retryable stage error containing the failure category and SHALL avoid sending the social URL as a substitute image input.
5. WHEN the stored media is read by the worker, THE Analysis_Pipeline SHALL verify ownership, availability, checksum, and byte length.

### Requirement 2: Multimodal Vision

**User Story:** As an analysis user, I want the image itself analyzed by a vision-capable model, so that a bunny playing Scrabble is described as a bunny playing Scrabble.

#### Acceptance Criteria

1. WHEN an image is available, THE Vision_Provider SHALL send image bytes or a provider-supported media reference as an image input part.
2. THE Vision_Provider SHALL return a non-empty description, a normalized tag list, provider provenance, and model provenance.
3. IF the configured Gemini vision model is unavailable, THEN THE Provider_Router SHALL return a capability error or use a configured vision fallback without sending URL-only input.
4. WHEN the visual fixture for `https://www.instagram.com/p/DeCt4wiMgDA/` is analyzed, THE Analysis_Pipeline SHALL produce output containing semantic references to a bunny and Scrabble or equivalent board-game play.
5. THE Analysis_Pipeline SHALL persist the validated vision result in the derived-post record and expose it to indexing.

### Requirement 3: Vision Performance

**User Story:** As an operator, I want visual analysis to be fast and bounded, so that users receive useful results within an interactive time budget.

#### Acceptance Criteria

1. WHEN media bytes are available, THE Vision_Provider SHALL complete successful visual recognition within 10 seconds for at least 95 percent of benchmark fixture runs.
2. THE Vision_Provider SHALL record media preparation time, provider request time, total request time, model, payload size, and outcome.
3. IF a vision request exceeds its hard deadline, THEN THE Vision_Provider SHALL cancel the request, release request resources, and return a retryable timeout error.
4. THE Analysis_Pipeline SHALL avoid repeated media downloads and repeated media encoding across retries.
5. THE Provider_Router SHALL prefer a direct multimodal HTTP provider over a Snowflake SQL LLM path when the direct provider satisfies capability and latency requirements.

### Requirement 4: Transcription Selection

**User Story:** As an operator, I want the fastest reliable transcription path, so that audio-enabled posts do not delay the analysis pipeline.

#### Acceptance Criteria

1. THE System SHALL benchmark Gemini native audio, Gemini Live API when supported, and Snowflake transcription using equivalent audio fixtures.
2. THE benchmark SHALL record time to first usable transcript, complete transcript latency, success rate, retry count, and output validity.
3. WHEN a transcription provider is selected, THE Provider_Router SHALL select the provider with the best measured latency and acceptable output validity for the configured workload.
4. WHEN a source contains no audio, THE Analysis_Pipeline SHALL complete transcription with an empty transcript without invoking an incompatible audio operation.
5. IF transcription fails after the configured retry policy, THEN THE Analysis_Pipeline SHALL record a retryable or terminal stage error according to attempt count and SHALL preserve completed stages.

### Requirement 5: Embeddings and Provider Separation

**User Story:** As an operator, I want embeddings to remain compatible with search, so that changing vision or transcription providers does not break indexing.

#### Acceptance Criteria

1. THE Provider_Router SHALL select an embedding provider independently of the Vision_Provider and Transcription_Provider.
2. THE embedding provider SHALL return finite numeric vectors with a configured and validated dimension.
3. IF the provider returns an unsupported embedding dimension, THEN THE Analysis_Pipeline SHALL record a response error and SHALL not index the invalid vector.
4. THE system SHALL preserve provider and model provenance for descriptions, transcripts, and embeddings.

### Requirement 6: Reliability and Persistence

**User Story:** As an operator, I want multimodal jobs to be safe to retry, so that transient provider failures do not corrupt data or leave jobs stuck.

#### Acceptance Criteria

1. WHEN a job stage succeeds, THE Analysis_Pipeline SHALL persist the stage result without changing MongoDB `_id`.
2. WHEN a job is retried, THE Analysis_Pipeline SHALL reuse persisted media and SHALL not replace or mutate MongoDB `_id`.
3. IF an external provider returns an error, THEN THE Analysis_Pipeline SHALL classify the error as configuration, capability, response, transient, or input and apply the corresponding retry policy.
4. THE Analysis_Pipeline SHALL reach a Terminal_Status after retries are exhausted or all stages complete.
5. WHEN the full Instagram fixture pipeline succeeds, THE system SHALL report all required stages completed and zero stage errors.

### Requirement 7: Observability and Security

**User Story:** As an operator, I want enough diagnostics to optimize providers without leaking private data, so that failures can be resolved safely.

#### Acceptance Criteria

1. THE System SHALL record correlation ID, provider, model, operation, latency, payload byte count, attempts, and outcome for every AI operation.
2. THE System SHALL redact API keys, passwords, tokens, signed URLs, and media contents from logs.
3. THE Media_Resolver SHALL block private network destinations and hosts outside the configured allowlist.
4. THE System SHALL scope media reads and derived results to the owning user.
5. WHEN a benchmark completes, THE System SHALL produce a comparable result record for each tested provider and fixture.
