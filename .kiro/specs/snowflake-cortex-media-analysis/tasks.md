# Implementation Plan: Snowflake Cortex Media Analysis

## Overview

Implement the Cortex-only provider independently from application persistence and the integration coordinator. Deliver the client boundary, capability checks, image/frame analysis, `AI_TRANSCRIBE`, embeddings, response normalization, error classification, security controls, and provider tests.

## Tasks

- [ ] 1. Freeze the Cortex provider contract
  - Define `CortexClient`, `CortexAnalysisProvider`, input types, result types, capability types, and error categories.
  - Define schema versions and prompt-version identifiers.
  - Publish the provider contract for the integration workstream.
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.7, 4.1-4.5_

- [ ] 2. Implement Cortex configuration and client
  - Add Snowflake account/session/API configuration and secret loading.
  - Implement parameterized function execution, timeouts, cancellation, and graceful close.
  - Implement redacted error diagnostics and capability caching.
  - Implement a deterministic fake client.
  - _Requirements: 1.1-1.5, 5.2-5.5, 6.4-6.5_

- [ ] 3. Implement image and frame analysis
  - Add input validators and size/frame-count limits.
  - Add structured prompt templates and immutable prompt versions.
  - Implement image and frame calls.
  - Implement response schemas and normalization.
  - Preserve timestamps and aggregate descriptions.
  - _Requirements: 2.1-2.5, 5.1-5.4_

- [ ] 4. Implement Cortex `AI_TRANSCRIBE`
  - Confirm target Snowflake account input and output behavior from the documented function.
  - Implement audio validation and normalized artifact requirements.
  - Invoke `AI_TRANSCRIBE` with bound parameters.
  - Normalize timestamped and untimestamped output.
  - Preserve bounded redacted raw output.
  - Classify capability, permission, input, response, transient, and permanent errors.
  - Do not add a fallback transcription provider.
  - _Requirements: 3.1-3.7_

- [ ] 5. Implement Cortex embeddings
  - Select supported text and optional multimodal embedding functions/models.
  - Implement caption, transcript, tag, and media-description embedding generation.
  - Validate finite values, dimensions, model metadata, and empty input.
  - Add model/version metadata for re-embedding.
  - _Requirements: 4.1-4.5_

- [ ] 6. Implement retry and capability behavior
  - Add bounded exponential backoff with jitter for transient errors.
  - Ensure non-retryable errors are not retried.
  - Add startup/health capability checks, including `AI_TRANSCRIBE`.
  - Add operation latency, attempts, and outcome metrics.
  - _Requirements: 1.3-1.5, 3.5-3.6, 4.5, 6.5_

- [ ] 7. Add provider tests
  - Add unit tests for request construction, binding, validation, normalization, redaction, retries, and capabilities.
  - Add fixtures for valid/malformed image, frame, transcription, and embedding responses.
  - Add tests for timestamps, no timestamps, empty transcripts, multilingual output, and unsupported audio.
  - Add one approved live short-audio `AI_TRANSCRIBE` test.
  - _Requirements: 6.1-6.5_

- [ ] 8. Checkpoint — provider release readiness
  - Run typecheck and provider unit/fixture tests.
  - Verify no provider test requires TiDB or Redis.
  - Verify secrets and signed URLs never appear in logs.
  - Verify capability failure is explicit when `AI_TRANSCRIBE` is unavailable.
  - _Requirements: 1.1-1.5, 3.1-3.7, 5.1-5.5, 6.1-6.5_

## Notes

- This spec does not create TiDB tables or modify repositories.
- This spec does not own queue processing or job leases.
- Results must be returned through the published versioned types so the integration spec can persist them without provider-specific parsing.
- Production transcription is Cortex-only through `AI_TRANSCRIBE`.
