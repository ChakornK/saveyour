# Implementation Plan: Analysis Integration Contract

## Overview

Implement the shared contract and orchestration layer that connects the independent Snowflake Cortex and TiDB workstreams. This includes versioned job/result types, capture transaction sequencing, outbox publication, worker leases, media preparation, stage orchestration, atomic result persistence, retry classification, feature flags, and end-to-end validation.

## Tasks

- [x] 1. Freeze shared versioned contracts
  - Define job request, job context, stage state, result envelope, transcript, embedding, completion, failure, lease, and search-document types.
  - Define schema-version compatibility behavior.
  - Define stable idempotency/completion keys.
  - Publish interfaces consumed by Cortex and TiDB specs.
  - _Requirements: 1.1-1.5_

- [x] 2. Implement capture transaction orchestration
  - Validate owner scope and canonical URL.
  - Create post, media metadata, analysis job, and initial outbox event through TiDB transaction port.
  - Return existing job for replayed capture idempotency key.
  - Acknowledge only after commit.
  - _Requirements: 2.1-2.5, 7.1-7.2_

- [x] 3. Implement outbox-to-queue publication
  - Claim durable outbox records.
  - Publish job references to Redis after TiDB commit.
  - Implement retry and dead-letter behavior.
  - Preserve correlation and idempotency identifiers.
  - _Requirements: 2.3-2.4, 5.5, 6.5_

- [x] 4. Implement job leases
  - Acquire leases atomically.
  - Add lease version/owner checks to processing.
  - Implement expiry, reclaim, and optional renewal.
  - Reject stale-worker updates.
  - _Requirements: 3.1-3.5_

- [x] 5. Implement media preparation orchestration
  - Load job context from TiDB.
  - Resolve owner-authorized media references.
  - Invoke FFmpeg for audio and representative frames.
  - Validate and store derived artifacts through SeaweedFS.
  - Return normalized provider inputs.
  - _Requirements: 4.1, 7.2-7.4_

- [x] 6. Implement analysis stage orchestration
  - Invoke Cortex image analysis for images.
  - Invoke Cortex frame analysis for video frames.
  - Invoke Cortex `AI_TRANSCRIBE` for audio.
  - Invoke Cortex embeddings for configured text/media descriptions.
  - Preserve independent success and failure state.
  - Assemble versioned result envelopes.
  - _Requirements: 4.2-4.6, 6.1-6.4_

- [x] 7. Implement atomic result persistence
  - Validate schema version and result identity.
  - Persist analysis results, tags, captions, transcripts, segments, embeddings, search document, stage states, and completion outbox event in one TiDB transaction.
  - Guard transaction with current lease version.
  - Return existing state on duplicate completion.
  - _Requirements: 1.2-1.5, 5.1-5.5_

- [x] 8. Implement failure classification and retries
  - Define retry policy by error category.
  - Add bounded exponential backoff and jitter.
  - Persist retry attempts and terminal failures.
  - Ensure capability/configuration errors do not retry indefinitely.
  - Ensure queue acknowledgement occurs only after durable outcome.
  - _Requirements: 6.1-6.5_

- [x] 9. Add feature flags and health wiring
  - Add independent flags for TiDB persistence, TiDB search, Cortex analysis, and Cortex transcription.
  - Add dependency readiness checks.
  - Add correlation IDs and stage latency metrics.
  - Add dashboards/alerts for retry exhaustion, lease conflicts, and outbox backlog.
  - _Requirements: 6.5, 7.1-7.5_

- [x] 10. Add unit and contract tests
  - Test schema compatibility and envelope identity.
  - Test capture transaction sequencing.
  - Test outbox publication failures.
  - Test lease expiry and stale-worker rejection.
  - Test partial-stage success and failure.
  - Test duplicate completion and idempotent replay.
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.6, 5.1-5.5, 6.1-6.5_

- [x] 11. Add end-to-end tests
  - Run capture through queue, lease, media preparation, fake Cortex, TiDB persistence, and search.
  - Run with real TiDB and fake Cortex.
  - Run with approved real Cortex and fake TiDB.
  - Test duplicate queue delivery, crash before commit, crash after commit, retry exhaustion, owner mismatch, and owner isolation.
  - _Requirements: 7.1-7.5, 8.1-8.7_

- [x] 12. Checkpoint — integration release readiness
  - Verify all three specs compile against the same interfaces.
  - Verify successful capture-to-analysis-to-search flow.
  - Verify no duplicate rows after replay.
  - Verify no stale worker can overwrite newer state.
  - Verify Cortex `AI_TRANSCRIBE` results persist into TiDB transcript/search records.
  - Run full typecheck and test suite.
  - _Requirements: 1.1-1.5, 5.1-5.5, 8.1-8.7_

## Notes

- This workstream does not implement Cortex SQL/API calls.
- This workstream does not implement TiDB SQL/repositories.
- The coordinator is the only component allowed to translate provider-normalized results into TiDB persistence operations.
- Production transcription remains Cortex-only through `AI_TRANSCRIBE`.
