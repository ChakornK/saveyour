# Implementation Plan: Saved Posts Memory

## Overview

The implementation is divided into four balanced, independently executable workstreams. Each person owns a vertical slice with its own package boundaries, fixtures, tests, and local mocks. The only shared prerequisites are the contract package and repository conventions. After contracts are frozen, all four workstreams can proceed in parallel without editing the same feature directories.

### Team allocation

| Owner | Workstream | Primary ownership | Independent completion artifact |
|---|---|---|---|
| Person 1 | Adaptive Client and Design System | Flutter app shell, visual system, Home, Post Detail, capture UX, accessibility | Runnable Flutter client using mock repositories |
| Person 2 | Capture, Posts, Media Storage | API capture/posts modules, source adapters, MongoDB posts, SeaweedFS media | Capture-to-post API with storage integration and contract tests |
| Person 3 | Analysis and Search | Worker pipeline, Gemini adapter, frame/audio processing, search adapter, semantic query API | Fake-provider pipeline and searchable indexed posts |
| Person 4 | Albums, Sharing, Map, Operations | Albums, organization, public links, relationship map, profile/export, Coolify | Album/share/map API and deployment stack smoke test |

No owner modifies another owner's feature directory. Cross-workstream changes happen through `packages/contracts`, generated clients, migration files owned by the affected backend owner, or explicit review PRs.

## Shared foundation contract

- [ ] 1. Freeze repository structure and contracts before feature work
  - Create top-level directories:
    - `client/` for Flutter adaptive application.
    - `server/api/` for HTTP API and application modules.
    - `server/worker/` for asynchronous processing.
    - `packages/contracts/` for OpenAPI, JSON schemas, shared identifiers, error codes, event envelopes, and generated fixtures.
    - `infra/` for Docker Compose, Coolify manifests, backup notes, and environment templates.
    - `docs/` for architecture, local development, API ownership, and operational runbooks.
  - Define versioning conventions for OpenAPI paths, event types, DTOs, pagination cursors, and analysis stages.
  - Define shared identifiers: `AccountId`, `SessionId`, `PostId`, `AssetId`, `AlbumId`, `JobId`, `PublicLinkId`, and `RequestId`.
  - Define common API problem shape: `code`, `message`, `fieldErrors`, `requestId`, `retryable`.
  - Define cursor encoding rules and idempotency-header behavior.
  - Define fixture factories for accounts, posts, assets, albums, memberships, jobs, search hits, graphs, and public projections.
  - Define ownership matrix with primary and review owner for each contract and module.
  - _Requirements: 14.1, 14.8_
  - **Acceptance gate:** Every owner can generate a client/server fixture and run contract validation without importing another feature package.

- [ ] 2. Establish repository quality gates
  - Add formatting, linting, static analysis, unit-test, contract-test, and schema-validation commands.
  - Add CI jobs that run changed-package tests plus the shared contract suite.
  - Add conventional commit or equivalent commit validation if used by the team.
  - Add environment validation that fails with names of missing non-secret configuration keys.
  - Add dependency/license review and lockfile policy.
  - _Requirements: 12.2, 14.2, 14.8_
  - **Acceptance gate:** A clean checkout reports deterministic pass/fail results without requiring production secrets.

---

## Person 1 — Adaptive Flutter client and design system

### 1A. Flutter application foundation

- [ ] 3. Initialize the Flutter adaptive client
  - Create `client/pubspec.yaml` with pinned Flutter SDK range and selected state-management, routing, HTTP, serialization, SVG, secure-storage, share-intent, image, video, and testing dependencies.
  - Create environment configuration for API origin, OAuth client IDs, build flavor, feature flags, and public-link origin.
  - Create `client/lib/main.dart`, platform bootstrap files, app router, error boundary, and test bootstrap.
  - Configure web URL strategy and deep-link handling for `/auth`, `/post/:id`, `/album/:id`, `/share/:token`, `/search`, and `/map`.
  - Configure mobile share-intent registration for iOS and Android and route incoming URLs to a capture draft.
  - Configure app-level semantics, keyboard shortcuts, focus traversal, and reduced-motion preference access.
  - _Requirements: 1.1, 2.1, 8.2, 10.1, 10.2, 10.9_

- [ ] 4. Implement client data and repository boundaries
  - Generate the API client from `packages/contracts/openapi.yaml`.
  - Define repository interfaces matching `design.md`; provide `MockAppRepository` and `HttpAppRepository` implementations.
  - Implement sealed loading/success/partial/error/not-found/offline states.
  - Implement cursor pagination controller that prevents duplicate requests and preserves ordering.
  - Implement local capture outbox with durable storage, idempotency keys, retry status, and validation failures.
  - Write unit tests for repository mapping, problem-details mapping, cursor handling, and outbox reconciliation.
  - _Requirements: 5.5, 5.6, 5.7, 11.1, 11.2, 11.3, 14.4_

### 1B. Impeccable neobrutalist design system

- [ ] 5. Implement theme tokens and primitives
  - Create `client/lib/design_system/tokens.dart` mirroring the supplied emerald palette exactly.
  - Implement light theme surfaces, typography roles, borders, hard shadows, focus rings, spacing, breakpoints, and chart color roles.
  - Implement primitives: `NeoButton`, `NeoIconButton`, `NeoCard`, `NeoTextField`, `NeoChip`, `NeoBadge`, `NeoBottomSheet`, `NeoDialog`, `NeoSkeleton`, `NeoEmptyState`, `NeoErrorState`, `NeoLoadingStatus`, `NeoSelectionBar`, and `NeoExternalLink`.
  - Implement pressed, disabled, loading, focus, hover-web, selected, and destructive states.
  - Enforce semantic labels and 44px minimum interactive targets.
  - Implement reduced-motion transitions and test that reduced-motion disables bounce.
  - Add golden tests for tokens, borders, shadows, typography, focus, and state variants.
  - _Requirements: 10.5, 10.6, 10.7, 10.8, 10.9, 10.12, 14.6, 14.7_

- [ ] 6. Implement adaptive navigation shell
  - Implement mobile top bar and bottom navigation with Home, Albums, Profile.
  - Implement wide-web navigation rail with equivalent destination semantics.
  - Implement responsive content scaffold with 320, 390, 480, 768, 1024, and 1440 test widths.
  - Implement safe-area handling, keyboard avoidance, focus restoration, and deep-link route transitions.
  - Implement route-level loading and auth initialization geometry so the app does not flash blank content.
  - _Requirements: 1.3, 10.1, 10.2, 10.3, 10.4, 10.10_

### 1C. Home, capture, and post detail UX

- [ ] 7. Implement Home gallery
  - Create `client/lib/features/home/` with gallery controller, staggered layout, post card, text-only card, unavailable-media card, and loading geometry.
  - Render latest captured posts with cursor loading and retry for failed pages.
  - Implement source badges, analysis state labels, album indicators, and semantic card descriptions.
  - Implement long-press selection and keyboard/button selection alternative.
  - Implement fixed multi-select action bar with Add to album, Delete, and Cancel.
  - Implement deletion confirmation, optimistic removal only after safe response, and undo where API supports it.
  - Write widget/integration tests for empty, loading, partial, failure, pagination, selection, deletion, and accessibility semantics.
  - _Requirements: 5.1–5.12, 10.12, 14.6, 14.7_

- [ ] 8. Implement capture link flow
  - Create add-link action in Home top bar and mobile share-intent entry.
  - Validate and preview submitted URL before sending.
  - Display supported-platform guidance, duplicate response, pending analysis, blocked retrieval, and offline outbox states.
  - Preserve draft on auth expiration and network failure.
  - Add source-link success confirmation that does not interrupt browsing.
  - _Requirements: 2.1–2.8, 11.1–11.4_

- [ ] 9. Implement Post Detail surface
  - Create responsive detail sheet/modal with drag handle plus labeled close action.
  - Render high-quality authorized media, video frame context, source metadata, external source action, AI description, tags, transcript summary, and analysis provenance.
  - Render partial/failed/blocked analysis states without replacing available source content.
  - Add tag display and future tag-edit affordance only if supported by contract.
  - Add keyboard focus trap for modal web behavior and focus restoration on close.
  - _Requirements: 5.9, 4.5, 4.8, 10.11, 14.6_

### 1D. Search, profile, and client release quality

- [ ] 10. Implement semantic search UX
  - Create `client/lib/features/search/` with query field, suggestion listbox, filters, result list/gallery, relevance explanations, pagination, no-results state, degraded-search state, and create-album action.
  - Support keyboard suggestion navigation and screen-reader announcements for result counts.
  - Preserve query/filter state through Back and deep links.
  - _Requirements: 7.1–7.11_

- [ ] 11. Implement Profile, account, and privacy screens
  - Render account identity, sign out, export request, account deletion confirmation, privacy/provider processing status, and app settings.
  - Handle pending export/deletion jobs and errors without claiming immediate completion.
  - _Requirements: 1.7, 13.3, 13.4, 13.5_

- [ ] 12. Execute client verification
  - Run unit, widget, golden, semantics, keyboard, reduced-motion, and responsive tests.
  - Verify device matrix: iOS compact, Android compact, mobile web, tablet, desktop web.
  - Verify no Material/Cupertino default visual leakage in production surfaces.
  - Produce screenshots at all required widths and attach accessibility test output.
  - _Requirements: 10.5–10.12, 14.6, 14.7, 14.8_

---

## Person 2 — Capture, posts, media storage, and authentication API

### 2A. API and persistence foundation

- [ ] 13. Initialize API service and MongoDB persistence
  - Create `server/api/` runtime, configuration loader, HTTP bootstrap, request ID middleware, structured logger, error middleware, metrics middleware, and health routes.
  - Create MongoDB connection lifecycle, repository interfaces, transaction/session helper, index initializer, and test database fixture.
  - Implement common owner scope extraction and authorization guard.
  - Implement RFC 9457-style problem response mapper.
  - _Requirements: 1.5, 1.6, 12.3, 12.4, 14.1_

- [ ] 14. Implement Google OAuth and sessions
  - Define Google OAuth configuration and platform redirect handling.
  - Validate issuer, audience, nonce, subject, email, and token expiry.
  - Implement account upsert by provider subject without account takeover through email-only matching.
  - Implement secure session issuance, refresh/expiry, revocation, sign-out, and token hashing.
  - Add rate limits and safe failure responses.
  - Write tests for success, cancellation, invalid issuer, expired token, duplicate account, revoked session, and unauthorized access.
  - _Requirements: 1.1–1.7, 13.7_

### 2B. URL capture and source adapters

- [ ] 15. Implement URL normalization package
  - Support canonicalization for Instagram, Reddit, TikTok, Facebook, and X URL patterns approved by the product.
  - Strip tracking parameters only where safe and preserve meaningful post identifiers.
  - Reject malformed URLs, unsupported schemes, dangerous local addresses, and invalid hosts.
  - Make normalization idempotent and expose platform classification.
  - Add property tests for normalization idempotence and example tests for every provider pattern.
  - _Requirements: 2.2, 2.4, 2.5, 14.5_

- [ ] 16. Implement Capture_Service application module
  - Define capture command, result DTO, duplicate indicator, source metadata status, and analysis enqueue event.
  - Add idempotency-key repository and owner/canonical URL uniqueness strategy.
  - Implement duplicate response that returns existing active post without duplicate analysis job.
  - Implement provider adapter registry and safe metadata resolution boundary.
  - Preserve source-only posts when retrieval is blocked or unavailable.
  - Add OpenAPI routes, authorization, validation, and integration tests.
  - _Requirements: 2.1–2.8, 14.3, 14.4, 14.5_

### 2C. Saved posts and media storage

- [ ] 17. Implement Saved_Post repository and APIs
  - Create MongoDB schemas/collections for posts, source metadata, generated data shell, deletion state, and media references.
  - Implement cursor-based list sorted by capture time and ID.
  - Implement post detail projection with authorized media references and analysis state.
  - Implement soft deletion with idempotent repeated delete and deletion event.
  - Exclude deleted posts from ordinary list/detail/search projection queries.
  - Add indexes for owner/canonical URL, owner/capture time, analysis status, platform, and deletion state.
  - _Requirements: 5.1, 5.5, 5.9, 5.12, 7.11, 13.2_

- [ ] 18. Implement SeaweedFS MediaStore adapter
  - Configure S3-compatible SeaweedFS client and bucket/prefix policy.
  - Implement put with MIME/size/checksum validation and owner-scoped metadata.
  - Implement checksum deduplication for identical assets owned by the same account.
  - Implement authorized short-lived read URLs or authenticated streaming endpoint.
  - Implement deletion marking and asynchronous physical cleanup.
  - Add SSRF/download guard helpers, redirect limits, timeouts, content-length checks, and type validation.
  - Add disposable-storage integration tests.
  - _Requirements: 3.1–3.7, 13.5, 13.7_

- [ ] 19. Implement media retrieval boundary
  - Create source-media retrieval interface consuming only allowlisted provider adapters.
  - Preserve unavailable/blocked asset reasons and continue processing eligible assets.
  - Store video metadata and delegate frame extraction to Person 3 through the shared job contract.
  - Create capture-to-media test fixtures for image, video, blocked, oversized, and malformed responses.
  - _Requirements: 3.1–3.5, 4.1, 14.3_

### 2D. Person 2 verification and handoff

- [ ] 20. Generate API client contracts and fixtures
  - Update OpenAPI for auth, capture, posts, media authorization, deletion, and health routes.
  - Publish stable fixtures consumed by Person 1 and Person 3.
  - Add contract tests that reject undocumented response changes.
  - _Requirements: 14.1, 14.2_

- [ ] 21. Execute API verification
  - Run unit tests, MongoDB integration tests, SeaweedFS tests, authorization tests, idempotency properties, and API contract tests.
  - Verify no secret, token, signed media URL, or private source data appears in logs.
  - Verify fresh database initialization and repeatable indexes.
  - _Requirements: 12.3–12.8, 13.1–13.7, 14.3–14.5_

---

## Person 3 — Analysis pipeline, media intelligence, and search

### 3A. Worker and queue foundation

- [ ] 22. Initialize worker runtime and durable job model
  - Create `server/worker/` runtime, configuration, logger, metrics, health route, and queue adapter.
  - Implement MongoDB-backed job records with optional Redis leases/queue transport.
  - Implement stage state machine, idempotency keys, lease expiry, bounded retries, backoff, and dead-letter status.
  - Implement job metrics: depth, age, success, retries, permanent failure, latency.
  - Implement replay command for a post version and stage.
  - _Requirements: 4.1, 4.7, 12.4, 12.5, 14.3_

- [ ] 23. Implement analysis domain contracts
  - Define AnalysisStage, Analysis_Status, stage result envelopes, safe errors, provenance, provider metadata, and index-update events.
  - Ensure partial results commit independently and completed stages are not re-run unnecessarily.
  - Add property tests for stage convergence and replay idempotence.
  - _Requirements: 4.5, 4.6, 4.7, 14.5_

### 3B. Media extraction and AI adapters

- [ ] 24. Implement video and audio processing
  - Add FFmpeg adapter for metadata and representative-frame extraction with configurable count, interval, duration, and byte limits.
  - Persist frame timestamps and derivative asset references through Person 2's MediaStore interface.
  - Add audio extraction path and timestamped transcript model.
  - Handle malformed media, codec failures, oversized inputs, and unavailable binaries as explicit stage errors.
  - Add fixture-based integration tests for short video, long video limit, malformed file, and audio transcript.
  - _Requirements: 3.3, 3.5, 4.2, 4.4, 4.7_

- [ ] 25. Implement Gemini provider adapter
  - Define provider interface for image descriptions, tag proposals, transcription fallback if configured, query intent extraction, and embeddings if Gemini model supports the configured operation.
  - Version prompts and model names in persisted provenance.
  - Add timeout, retry, token budget, response schema validation, safety/error mapping, and redaction before logs.
  - Provide deterministic fake provider for tests and local development.
  - _Requirements: 4.2–4.9, 7.4, 13.6_

- [ ] 26. Implement analysis orchestration
  - Fetch source text/media references from API-owned repositories through ports.
  - Run stages in explicit order: source normalization, media analysis, frame analysis, text normalization, audio transcription, tag normalization, embedding, persistence, index update.
  - Persist original user/source text separately from generated fields.
  - Mark partial/completed/failed state and expose retry endpoint contract.
  - Publish search-index update only after generated data transaction commits.
  - _Requirements: 4.1–4.10, 3.3, 3.4_

### 3C. Search indexing and semantic retrieval

- [ ] 27. Implement SearchIndex adapter contract
  - Define engine-neutral document mapping, upsert/delete, scoped query, lexical query, vector query, filter query, and health operations.
  - Select and document one self-hosted engine after a short spike evaluating vector support, filters, deployment complexity, and backup behavior.
  - Implement index versioning and rebuild command from MongoDB.
  - Implement delete handling for soft-deleted posts.
  - Add engine contract tests using representative documents.
  - _Requirements: 7.1–7.11, 12.3, 12.7, 14.2_

- [ ] 28. Implement Search_Service application module
  - Parse query, invoke Search_Agent through a bounded adapter, and create fallback SearchIntent when AI is unavailable.
  - Apply owner scope, filters, status exclusions, platform, album, date, and media-type filters.
  - Combine lexical/vector hits with deterministic ranking and stable tie-breakers.
  - Return matched fields, tags, explanation, count/partial status, cursor, and query ID.
  - Implement tag suggestions from authorized normalized tags and recent user usage.
  - Add property tests for filter composition, authorization non-expansion, cursor stability, and deleted-post exclusion.
  - _Requirements: 7.1–7.11, 14.5_

### 3D. Person 3 verification and handoff

- [ ] 29. Publish analysis/search API and event contracts
  - Add OpenAPI routes for analysis status, retry, search, suggestions, and search health.
  - Add event schemas for `post.analysis.requested`, `post.analysis.updated`, `search.document.upsert`, and `search.document.delete`.
  - Publish fake provider fixtures for Person 1 and Person 4.
  - _Requirements: 4.8, 7.10, 14.1, 14.2_

- [ ] 30. Execute worker and search verification
  - Run unit/property tests, fake-provider orchestration tests, FFmpeg fixtures, search engine contract tests, authorization tests, and end-to-end capture-to-search integration.
  - Verify retry exhaustion, partial completion, provider outage fallback, index rebuild, and deletion cleanup.
  - _Requirements: 4.5–4.9, 7.5, 12.5, 14.3–14.5_

---

## Person 4 — Albums, organization, public sharing, map, profile, and operations

### 4A. Albums and organization

- [ ] 31. Implement Album and membership persistence
  - Create MongoDB schemas and indexes for albums, memberships, organization rules, suggestion results, and audit events.
  - Implement album create/update/rename/delete with validation and optimistic version checks.
  - Implement membership add/remove/batch-add with unique `(albumId, postId)` enforcement and idempotency.
  - Preserve Saved_Post records when memberships are removed or albums are deleted.
  - Implement ordered positions with deterministic tie-breakers.
  - _Requirements: 6.1–6.8, 14.4, 14.5_

- [ ] 32. Implement organization suggestion service
  - Consume search/index summaries through a port rather than querying Person 3's storage directly.
  - Generate ranked suggestions with match explanations and confidence.
  - Implement accept, reject, accept-selected, and add-all-search-results commands.
  - Implement Auto_Organization rules with explicit suggest-only and auto-add modes.
  - Record rule ID and reason for every automatic membership change.
  - Add tests for no silent membership mutation, duplicate suggestions, rule disablement, and stale suggestion handling.
  - _Requirements: 6.9–6.13, 7.9_

### 4B. Public album sharing

- [ ] 33. Implement public-link lifecycle
  - Generate high-entropy tokens and store only hashes.
  - Implement enable, revoke, regenerate, privacy-change revocation, and album-delete revocation.
  - Implement rate-limited token lookup with generic not-found behavior.
  - Add cache invalidation on link state change.
  - _Requirements: 8.1, 8.4–8.8, 13.7_

- [ ] 34. Implement public album projection
  - Define allowlist DTO containing album title/description, permitted cover/media, ordered posts, source links, and published timestamps.
  - Explicitly omit owner identity, private tags, internal IDs/object keys, analysis provider data, and unrelated memberships.
  - Add redaction property tests and public/private integration tests.
  - _Requirements: 8.2, 8.3, 8.7, 14.5_

### 4C. Relationship map and profile operations

- [ ] 35. Implement relationship graph service
  - Build authorized nodes for posts, tags, albums, and platforms.
  - Build typed edges from shared tags, semantic similarity, membership, and source.
  - Implement deterministic graph cap, clustering/sampling, cursors, and truncated indicator.
  - Implement accessible list projection with relationship explanations.
  - Add tests for referential integrity, authorization, graph cap, deterministic ordering, and empty graph.
  - _Requirements: 9.1–9.8, 14.5_

- [ ] 36. Implement profile export and deletion orchestration
  - Implement export job that packages metadata, memberships, tags, provenance, and source links without exposing secrets.
  - Implement account deletion workflow: revoke sessions, revoke public links, anonymize/delete metadata, enqueue media cleanup, and report status.
  - Implement retention cleanup worker command and audit records.
  - _Requirements: 1.7, 8.6, 13.2–13.4_

### 4D. Coolify infrastructure and operations

- [ ] 37. Create local and Coolify deployment definitions
  - Add `infra/docker-compose.dev.yml` for API, worker, MongoDB, SeaweedFS, Redis, and selected search engine.
  - Add production container build files with non-root users, health checks, graceful shutdown, and resource limits.
  - Add Coolify deployment documentation/environment templates for web, API, worker, scheduler, database, object storage, Redis, and search.
  - Define network boundaries and persistent volume requirements.
  - _Requirements: 12.1, 12.2, 12.3, 12.9_

- [ ] 38. Implement observability and backup runbooks
  - Add structured logs with request/job IDs and safe fields.
  - Add metrics endpoints and dashboards/queries for API latency, errors, job queues, media storage, search latency, and public-link access.
  - Add MongoDB backup/restore procedure and SeaweedFS volume/reference consistency procedure.
  - Add migration/index initialization command that is safe to rerun.
  - Add dependency timeout and readiness checks.
  - _Requirements: 12.3–12.8, 13.7_

### 4E. Person 4 verification and handoff

- [ ] 39. Publish album/share/map/profile contracts
  - Add OpenAPI routes and fixtures for albums, memberships, suggestions, public links, graph/list projections, export, deletion, and operations health.
  - Publish public projection schema separately from private album schema.
  - _Requirements: 6.1–6.13, 8.1–8.8, 9.1–9.8, 13.3, 14.1_

- [ ] 40. Execute album, sharing, map, and deployment verification
  - Run unit/property tests, MongoDB integration tests, public redaction tests, graph tests, export/deletion tests, and compose smoke test.
  - Verify a fresh Coolify-like stack reaches ready state and fails health checks clearly when dependencies are unavailable.
  - _Requirements: 8.2–8.7, 9.3–9.7, 12.1–12.8, 14.3–14.5_

---

## Cross-workstream integration and release

- [ ] 41. Integrate generated contracts without feature-directory conflicts
  - Regenerate Flutter client after each approved OpenAPI change.
  - Verify DTO compatibility for capture → post list/detail → analysis status → search → album membership → public projection.
  - Confirm every event consumer tolerates unknown fields and versioned envelopes.
  - _Requirements: 14.1, 14.2_

- [ ] 42. Run end-to-end acceptance scenarios
  - Google sign-in → share Instagram/Reddit/TikTok/Facebook/X link → pending post → media/text analysis → search by meaning/tag → open source link.
  - Create album → review AI suggestions → accept selected posts → rename → enable public link → open as signed-out visitor → revoke.
  - Select several Home posts by long press and keyboard alternative → add to album → delete one → verify remaining album memberships.
  - Search query → create album from all results → verify exact count and exclusions.
  - Open Relationship Map → filter/focus node → use accessible list view → navigate to post.
  - Disconnect network → queue capture → reconnect → verify one post after retries.
  - _Requirements: 1.1–14.9_

- [ ] 43. Run accessibility and responsive release review
  - Verify mobile and web navigation, 320–1440 widths, keyboard traversal, focus restoration, semantic labels, screen-reader announcements, reduced motion, and gesture alternatives.
  - Verify public album accessibility as a signed-out visitor.
  - Verify no horizontal overflow or clipped top-bar actions.
  - _Requirements: 10.1–10.12, 14.6, 14.7_

- [ ] 44. Run security and privacy release review
  - Verify owner isolation across every endpoint and search/map projection.
  - Verify public projection redaction, signed media URL expiry, token hashing, SSRF protections, rate limits, log redaction, deletion/export behavior, and OAuth validation.
  - _Requirements: 1.5, 1.6, 3.7, 8.2, 8.3, 13.1–13.7_

- [ ] 45. Run production-like Coolify release gate
  - Build all OCI images from a clean checkout.
  - Start the complete stack with production-like environment variables and disposable volumes.
  - Run migrations/index initialization, health checks, contract tests, integration tests, smoke scenarios, and backup verification.
  - Record image digests, configuration version, selected search engine version, and rollback steps.
  - _Requirements: 12.1–12.9, 14.8_

- [ ] 46. Final documentation and ownership handoff
  - Document local development, environment variables, OAuth setup, source provider policy, media limits, AI provider configuration, search engine operations, backups, incident response, and data deletion.
  - Document each package owner and review owner.
  - Document known limitations: blocked source retrieval, provider policy changes, AI inaccuracies, graph truncation, and offline conflict behavior.
  - Mark only verified tasks complete and attach test evidence to the release record.
  - _Requirements: 4.9, 12.7, 13.5, 13.6, 14.8, 14.9_

## Notes

- Tasks are intentionally grouped into isolated directories. A person may mock an interface until the corresponding contract is stable.
- No task should directly import another person's database collection, Flutter feature controller, or provider implementation.
- Shared contract changes require an owner plus reviewer and a regenerated fixture/client check.
- Any task involving external platform behavior uses representative integration tests, not property-based tests against the external service.
- Optional Redis may be omitted for the first local prototype only if queue leases, rate limits, and cache behavior have equivalent implementations; production deployment should use it unless a documented alternative is approved.
- Snowflake is not part of the baseline architecture because media analysis is worker-oriented and self-hosting on Coolify favors MongoDB, SeaweedFS, a dedicated search service, and provider adapters. A separate analytics warehouse can be added later without entering the request path.
