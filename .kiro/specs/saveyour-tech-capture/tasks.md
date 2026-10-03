# Implementation Plan: Capture, Posts, Media Storage, and Authentication

## Overview

Person 2 owns `server/api` authentication, capture, posts, media, and health modules. The workstream publishes OpenAPI and fixtures for the client and analysis worker. It does not edit Flutter features or worker implementations.

## Tasks

- [x] 1. Bootstrap API service
  - Create runtime, configuration validation, HTTP bootstrap, request IDs, structured logs, metrics, health, graceful shutdown, and error middleware.
  - Add MongoDB connection lifecycle, repository interfaces, transaction helper, test database fixture, and repeatable index initialization.
  - _Requirements: 5.1, 5.2, 5.6_

- [ ] 2. Implement Google OAuth and sessions
  - Validate issuer, audience, nonce, subject, email, expiry, and redirect configuration.
  - Upsert Account by provider subject without unsafe email-only account merging.
  - Hash sessions, implement expiry, revocation, sign-out, and Owner_Scope construction.
  - Add rate limits and safe errors.
  - Test successful login, cancellation, invalid issuer, expired token, duplicate account, revoked session, and cross-owner access.
  - _Requirements: 1.1–1.6, 5.3_

- [ ] 3. Implement URL normalization
  - Support approved Instagram, Reddit, TikTok, Facebook, and X URL forms.
  - Strip safe tracking parameters and preserve meaningful identifiers.
  - Reject malformed, unsupported, local-network, unsafe, or disallowed URLs.
  - Add idempotence property tests and provider examples.
  - _Requirements: 2.1–2.5_

- [ ] 4. Implement Capture_Service
  - Define command/result DTOs, duplicate indicator, source status, analysis event, idempotency repository, and provider adapter registry.
  - Enforce Owner/canonical URL uniqueness and retry-safe idempotency.
  - Preserve source-only posts when resolution is blocked.
  - Add OpenAPI route, validation, authorization, and integration tests.
  - _Requirements: 2.6–2.8, 5.1–5.2_

- [ ] 5. Implement Saved_Post repository and APIs
  - Create collections, indexes, active/deleted projections, cursor encoding, list/detail routes, and soft-delete route.
  - Preserve post identity and exclude deleted records from ordinary projections.
  - Add property tests for cursor stability, scope, deletion exclusion, and repeated deletion.
  - _Requirements: 3.1–3.6_

- [ ] 6. Implement SeaweedFS MediaStore
  - Configure S3-compatible client and owner-scoped metadata.
  - Implement MIME/size/checksum validation, deduplication, put, authorized read, deletion marking, and cleanup.
  - Add short-lived signed read or authenticated stream route.
  - Add SSRF, redirect, content-length, timeout, and type checks to download boundary.
  - _Requirements: 4.1–4.8, 5.4_

- [ ] 7. Implement source retrieval boundary
  - Define allowlisted provider adapter retrieval interface.
  - Preserve blocked/unavailable reasons and continue independent eligible assets.
  - Publish media references and analysis job contract without implementing analysis.
  - _Requirements: 2.7, 4.6–4.7_

- [ ] 8. Publish API contracts and fixtures
  - Add OpenAPI for auth, capture, posts, media, deletion, health, and metrics.
  - Publish account, post, asset, error, and event fixtures.
  - Add contract compatibility tests and generated-client check.
  - _Requirements: 5.1, 5.2_

- [ ] 9. Verify API workstream
  - Run unit, property, MongoDB, SeaweedFS, OAuth, adapter, authorization, log-redaction, and contract tests.
  - Verify fresh database initialization, health failures, timeouts, and no secret leakage.
  - _Requirements: 1.1–5.6_

- [ ] 10. Checkpoint - hand off capture contracts
  - Publish schema version, fixture version, event envelope version, environment variables, media limits, and known provider limitations.
