# Implementation Plan: Capture, Posts, Media Storage, and Authentication

## Overview

Implement the capture workstream as a protected TypeScript API with owner-scoped persistence, safe provider retrieval, SeaweedFS media storage, and versioned contracts for the Flutter client and analysis worker. Build the pure policy and identity logic first, then wire external dependencies and HTTP routes.

## Tasks

- [ ] 1. Establish API runtime and operational boundaries
  - Add configuration schema, HTTP bootstrap, request IDs, structured logging, metrics, graceful shutdown, and stable problem-details middleware.
  - Add dependency health checks and repeatable MongoDB index initialization.
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 2. Implement Google authentication and sessions
  - [ ] 2.1 Add Google authorization verification for issuer, audience, nonce, subject, email, and expiry.
    - _Requirements: 1.1, 1.4_
  - [ ] 2.2 Add Account upsert by Google subject and prevent email-only account merges.
    - _Requirements: 1.2_
  - [ ] 2.3 Add hashed sessions, expiry, revocation, sign-out, and Owner_Scope middleware.
    - _Requirements: 1.2, 1.3, 1.5, 1.6_
  - [ ]* 2.4 Add unit and integration tests for valid, cancelled, invalid, expired, revoked, and cross-owner authentication flows.
    - _Requirements: 1.1–1.6_

- [ ] 3. Implement URL policy and provider classification
  - [ ] 3.1 Define provider URL grammars and Canonical_Post_URL normalization.
    - Preserve meaningful identifiers and remove only approved tracking parameters.
    - _Requirements: 2.1, 2.2_
  - [ ] 3.2 Reject malformed, unsupported, credential-bearing, private-network, loopback, unsafe-port, and disallowed-host URLs.
    - _Requirements: 2.3–2.5, 6.1_
  - [ ]* 3.3 Add fast-check properties for normalization idempotence and provider classification fixtures.
    - **Property 1: URL normalization idempotence**
    - **Validates: Requirements 2.1, 2.6**

- [ ] 4. Implement capture identity and idempotency
  - [ ] 4.1 Define CaptureCommand, CaptureResult, source status, analysis status, and stable capture errors.
    - _Requirements: 3.1, 3.4, 7.2_
  - [ ] 4.2 Add owner/canonical URL uniqueness and idempotency-key reservation with replay behavior.
    - _Requirements: 3.2, 3.3_
  - [ ] 4.3 Add durable Saved_Post creation before outbox publication.
    - _Requirements: 3.1, 3.6_
  - [ ]* 4.4 Add state-machine/property tests proving duplicate and idempotency replay behavior.
    - **Property 2: Owner-scoped capture identity**
    - **Property 3: Idempotency replay**
    - **Validates: Requirements 3.1–3.3**

- [ ] 5. Implement Saved_Post persistence and protected APIs
  - [ ] 5.1 Create Account, Session, Saved_Post, Media_Asset, outbox, and idempotency schemas.
    - _Requirements: 1.2, 3.1, 5.1, 8.1_
  - [ ] 5.2 Add active/deleted projections, cursor encoding, owner-scoped list/detail routes, and soft deletion.
    - _Requirements: 4.1–4.5_
  - [ ]* 5.3 Add cursor round-trip, pagination-order, scope, and deletion tests.
    - **Property 4: Cursor round trip and ordering**
    - **Property 5: Owner-scope projection**
    - **Property 6: Deletion idempotence**
    - **Validates: Requirements 4.2–4.5**

- [ ] 6. Implement bounded Source_Adapter retrieval
  - [ ] 6.1 Add allowlisted adapter registry for Instagram, Reddit, TikTok, Facebook, and X.
    - _Requirements: 2.2, 6.1_
  - [ ] 6.2 Add constrained HTTP client with redirect validation, private-network rejection, timeouts, response and decompression limits.
    - _Requirements: 2.5, 6.2–6.4_
  - [ ] 6.3 Preserve metadata and bounded source/media failure reasons when retrieval is blocked or partial.
    - _Requirements: 3.5, 5.7, 6.5_
  - [ ]* 6.4 Add mocked provider integration tests for success, timeout, unsafe redirect, oversized response, and metadata-only results.
    - _Requirements: 3.5, 6.1–6.5_

- [ ] 7. Implement SeaweedFS MediaStore
  - [ ] 7.1 Add MIME, byte-size, checksum, owner metadata, and content validation.
    - _Requirements: 5.1, 5.6_
  - [ ] 7.2 Add opaque storage references, SeaweedFS put, optional owner-scoped deduplication, and media availability state.
    - _Requirements: 5.2, 5.5, 5.6_
  - [ ] 7.3 Add owner-authorized short-lived signed reads or authenticated proxy streams.
    - _Requirements: 5.3, 5.4_
  - [ ] 7.4 Add asynchronous cleanup enqueueing for post and account deletion.
    - _Requirements: 5.8_
  - [ ]* 7.5 Add SeaweedFS integration tests for put, checksum, authorized read, cross-owner denial, limit rejection, and cleanup.
    - _Requirements: 5.1–5.8_

- [ ] 8. Publish HTTP, OpenAPI, and cross-workstream contracts
  - [ ] 8.1 Add authentication, capture, refresh, posts, media, deletion, health, and metrics routes.
    - _Requirements: 1.3–1.6, 3.4, 4.1–4.5, 5.3, 7.1_
  - [ ] 8.2 Publish versioned DTOs and AnalysisWorkItemV1 with safe fixtures.
    - _Requirements: 3.6, 8.1, 8.2_
  - [ ] 8.3 Generate OpenAPI and add contract tests for success, validation, authorization, duplicate, unavailable, and deletion responses.
    - _Requirements: 7.1, 7.2, 8.3, 8.4_
  - [ ]* 8.4 Add serialization round-trip tests for every published DTO version.
    - **Property 8: Contract serialization round trip**
    - **Validates: Requirement 8.1**

- [ ] 9. Harden operations and security
  - [ ] 9.1 Apply rate limits to authentication, capture, media authorization, and deletion.
    - _Requirements: 7.3_
  - [ ] 9.2 Add log-redaction tests covering sessions, credentials, signed URLs, source payloads, and request identifiers.
    - _Requirements: 7.4_
  - [ ] 9.3 Add health tests for MongoDB, SeaweedFS, queue, and provider dependency failures.
    - _Requirements: 7.5, 7.6_
  - [ ] 9.4 Add SSRF, redirect, decompression, timeout, content-length, and unsafe-host regression tests.
    - _Requirements: 2.5, 6.1–6.4_

- [ ] 10. Checkpoint - verify capture workstream
  - Run unit, property, HTTP contract, MongoDB, SeaweedFS, authentication, provider, authorization, redaction, and health tests.
  - Verify fresh database initialization is repeatable and capture acknowledgement does not wait for analysis.
  - _Requirements: 1.1–8.4_

- [ ] 11. Checkpoint - publish integration handoff
  - Publish schema version, fixture version, event envelope version, environment variables, media limits, cursor format, retry semantics, and known provider limitations.
  - _Requirements: 3.6, 7.1, 8.1–8.4_

## Notes

- Tasks marked with `*` are optional only for an early MVP; security, authorization, persistence, and contract verification are required before production use.
- Every implementation task references one or more requirements for traceability.
- Property tests cover pure normalization, cursor, identity, and serialization logic; integration tests cover external services.
- The API must preserve durable post identity when provider, media, or analysis dependencies are unavailable.
