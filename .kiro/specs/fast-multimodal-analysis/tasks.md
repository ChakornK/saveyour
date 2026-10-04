# Implementation Plan: Fast Multimodal Analysis

## Overview

Implement a provider-routed multimodal pipeline that preserves downloaded social media bytes, uses direct Gemini vision for image descriptions, benchmarks transcription providers, and verifies the complete URL-to-Cortex-compatible analysis flow. The implementation must retain Snowflake embeddings/fallback behavior, Mongo persistence safety, and measurable latency evidence.

## Tasks

- [ ] 1. Establish provider configuration and capability contracts
  - Add explicit vision and transcription provider configuration separate from embedding configuration.
  - Add supported model IDs and startup validation for configured Gemini models.
  - Define provider capability and benchmark result types.
  - _Requirements: 2.3, 4.1, 4.3, 5.1_

- [ ] 2. Complete media resolution and persistence
  - [ ] 2.1 Harden Instagram media URL extraction
    - Extract Open Graph and CDN image URLs with HTML entity and escaped URL normalization.
    - Deduplicate media candidates while preserving first-party HTTPS URLs.
    - _Requirements: 1.1, 1.2_
  - [ ] 2.2 Wire capture media workflow into production API
    - Resolve social media during capture.
    - Download once through the bounded downloader.
    - Persist media metadata and retrieve authorized bytes for the analysis source.
    - _Requirements: 1.2, 1.3, 1.5, 6.2_
  - [ ]* 2.3 Add media integrity tests
    - Test byte preservation, MIME preservation, checksum verification, redirect limits, and private-host blocking.
    - **Validates: Requirements 1.2, 1.3, 1.5**

- [ ] 3. Implement Gemini multimodal vision
  - [ ] 3.1 Extend Gemini request construction
    - Send image bytes through `inline_data` or a supported media reference.
    - Send a concise structured-output prompt requesting description, tags, and observations.
    - Parse JSON, fenced JSON, and bounded prose fallback safely.
    - _Requirements: 2.1, 2.2, 3.5_
  - [ ] 3.2 Add direct Gemini vision provider routing
    - Prefer Gemini for vision when configured and capable.
    - Use Snowflake only as an explicit fallback.
    - _Requirements: 2.3, 3.5, 5.1_
  - [ ]* 3.3 Add multimodal provider unit tests
    - Assert exact MIME type and byte payload are sent.
    - Assert URL-only input is rejected for a required visual operation.
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 4. Implement and benchmark transcription providers
  - [ ] 4.1 Add Gemini native audio requests
    - Send audio bytes with an audio MIME type.
    - Normalize transcript segments and timestamps.
    - _Requirements: 4.1, 4.4_
  - [ ] 4.2 Add Gemini Live API adapter when the configured account supports it
    - Measure time to first transcript and complete transcript.
    - Ensure bounded shutdown and cancellation.
    - _Requirements: 4.1, 4.2_
  - [ ] 4.3 Add provider benchmark harness
    - Run equivalent fixtures through Gemini native audio, Gemini Live API, and Snowflake.
    - Persist or print comparable latency, success, retry, and validity metrics.
    - _Requirements: 4.1, 4.2, 4.3, 7.5_

- [ ] 5. Preserve embeddings and persistence correctness
  - [ ] 5.1 Separate embedding routing from vision and transcription routing
    - Keep Snowflake `EMBED_TEXT_768` as the compatible default until benchmark evidence supports replacement.
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 5.2 Add Mongo regression coverage
    - Verify repeated saves and stage updates preserve Mongo `_id` and application `id`.
    - **Validates: Requirements 6.1, 6.2**
  - [ ] 5.3 Validate terminal job convergence
    - Ensure every exhausted or successful job reaches `completed`, `partial`, or `failed`.
    - _Requirements: 6.3, 6.4_

- [ ] 6. Add latency, observability, and security instrumentation
  - [ ] 6.1 Record operation timing breakdowns
    - Capture download, encoding, connection, provider, parse, persistence, and total durations.
    - _Requirements: 3.2, 7.1, 7.5_
  - [ ] 6.2 Enforce operation-specific deadlines
    - Use a sub-10-second vision target and explicit hard deadline behavior.
    - Avoid retries that exceed the job latency budget.
    - _Requirements: 3.1, 3.3_
  - [ ] 6.3 Audit redaction and media access boundaries
    - Verify secrets, signed URLs, and image/audio bytes never appear in logs.
    - _Requirements: 7.2, 7.3, 7.4_

- [ ] 7. Build end-to-end verification fixtures
  - [ ] 7.1 Add the Instagram bunny/Scrabble fixture
    - Assert non-empty JPEG media bytes are persisted.
    - Assert vision output contains bunny and Scrabble/board-game semantics.
    - Assert no URL-only description is accepted.
    - _Requirements: 1.3, 2.4, 2.5, 6.5_
  - [ ] 7.2 Add terminal-status and no-Mongo-ID-error assertions
    - Verify all required stages complete and no `_id` mutation error appears.
    - _Requirements: 6.1, 6.4, 6.5_
  - [ ] 7.3 Add latency acceptance test
    - Measure vision latency over representative runs and verify p95 below 10 seconds.
    - _Requirements: 3.1, 3.2_

- [ ] 8. Checkpoint - Run local validation
  - Run `/Users/galileokim/.bun/bin/bun run typecheck`.
  - Run `/Users/galileokim/.bun/bin/bun test`.
  - Rebuild and restart API, worker, downloader, and dependencies.
  - Resolve all failures before continuing.

- [ ] 9. Live provider verification
  - Submit the Instagram bunny/Scrabble URL through the public API.
  - Capture the complete stage trace and provider benchmark metrics.
  - Confirm correct visual output, terminal status, no media-loss regression, and p95 target.
  - _Requirements: 2.4, 3.1, 6.5, 7.5_

- [ ] 10. Final checkpoint - Ensure all tests and evidence pass
  - Re-run typecheck and the complete test suite.
  - Confirm Docker service health.
  - Confirm the final live job has terminal status and correct output.
  - Document measured latency and selected transcription provider.

## Notes

- Tasks marked with `*` are optional and can be skipped only if equivalent coverage already exists.
- Every task references the requirements it validates.
- The live Instagram fixture is required evidence, not a substitute for unit and integration tests.
- No task is complete while a job remains stuck in processing or produces URL-only visual analysis.
