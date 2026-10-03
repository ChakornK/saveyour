# Implementation Plan: Analysis Pipeline, Media Intelligence, and Search

## Overview

Person 3 owns `server/worker` analysis and search modules. The workstream consumes capture/post/media ports and publishes analysis/search APIs and event schemas. All external AI and search behavior is tested through fakes and adapter contracts.

## Tasks

- [ ] 1. Bootstrap worker runtime
  - Create configuration, logger, metrics, health, graceful shutdown, queue adapter, and worker process.
  - Implement durable MongoDB job records, optional Redis leases, expiration recovery, backoff, retry, and dead-letter state.
  - _Requirements: 1.1–1.9, 6.1–6.3_

- [ ] 2. Define analysis contracts
  - Define stages, statuses, result envelopes, safe errors, provenance, provider metadata, and index events.
  - Implement idempotency key `(postId, version, stage)` and convergence logic.
  - Add property tests for replay and retry convergence.
  - _Requirements: 1.1–1.9_

- [ ] 3. Implement media extraction
  - Add FFmpeg adapter for metadata, representative frames, frame timestamps, audio extraction, and transcript input.
  - Enforce byte, duration, codec, frame-count, and timeout limits.
  - Persist derivative references through MediaStore interface.
  - Test valid, malformed, oversized, timeout, and unsupported media.
  - _Requirements: 2.1–2.5_

- [ ] 4. Implement Gemini adapter
  - Add description, tag, transcription, embedding, and query-intent interfaces.
  - Version prompts/models, validate structured responses, enforce budgets, timeouts, retries, and provider rate limits.
  - Add deterministic fake provider and provenance tests.
  - _Requirements: 3.1–3.5_

- [ ] 5. Implement analysis orchestration
  - Run fetch, media, frame, text, audio, tag, embedding, persistence, and index stages.
  - Persist each success independently, preserve source text, mark partial/completed/failed, and publish index events only after commit.
  - Add manual retry and post-version replay command.
  - _Requirements: 1.1–1.9, 2.1–2.5_

- [ ] 6. Evaluate and select search engine
  - Compare self-hosted candidates for vector search, lexical search, filters, deployment on existing Coolify, backups, and operational complexity.
  - Record the decision and retain engine-neutral adapter contracts.
  - _Requirements: 4.3, 6.4_

- [ ] 7. Implement SearchIndex adapter
  - Implement document mapping, versioned upsert, delete, lexical/vector/filter query, health, and rebuild from MongoDB.
  - Add engine contract tests and deleted-document cleanup tests.
  - _Requirements: 4.1–4.5_

- [ ] 8. Implement Search_Service
  - Build Owner-scoped query input, bounded Search_Agent intent extraction, deterministic fallback, filter composition, ranking, explanations, cursor pagination, and query IDs.
  - Add tag suggestions from authorized normalized tags and usage.
  - Add properties for scope, filter composition, cursor stability, deleted exclusion, and fallback behavior.
  - _Requirements: 5.1–5.8_

- [ ] 9. Publish analysis/search contracts
  - Add OpenAPI for analysis status/retry, search, suggestions, and search health.
  - Add event schemas for requested, updated, index upsert, and index delete.
  - Publish fake-provider and search fixtures for client and album workstreams.
  - _Requirements: 4.1, 5.1–5.8, 6.4_

- [ ] 10. Verify analysis and search
  - Run unit/property, FFmpeg, fake-provider, search contract, authorization, index rebuild, retry, partial-completion, provider outage, and end-to-end tests.
  - Verify metrics, health, replay, and safe logs.
  - _Requirements: 1.1–6.5_

- [ ] 11. Checkpoint - hand off analysis contracts
  - Publish worker configuration, queue semantics, selected search engine version, event version, index rebuild command, and known AI limitations.
