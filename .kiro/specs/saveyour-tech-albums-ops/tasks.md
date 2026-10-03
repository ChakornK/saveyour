# Implementation Plan: Albums, Sharing, Relationship Map, and Operations

## Overview

Person 4 owns albums, organization, public sharing, relationship maps, profile lifecycle operations, and deployment artifacts. The workstream consumes post/search/media ports and owns its API modules, MongoDB collections, public projection, and Coolify deployment documentation. Coolify already exists and is not provisioned by these tasks.

## Tasks

- [ ] 1. Implement album persistence
  - Create album, membership, rule, suggestion, and audit collections and indexes.
  - Implement create, update, rename, delete, list, detail, visibility, cover, and optimistic version behavior.
  - Validate names and descriptions.
  - _Requirements: 1.1–1.9_

- [ ] 2. Implement membership operations
  - Add unique `(albumId, postId)` membership.
  - Implement idempotent add/remove, batch add, search-result add, ordering, exclusions, and concurrency conflicts.
  - Preserve posts when memberships/albums are removed.
  - Add property tests for idempotence/isolation/order.
  - _Requirements: 1.4–1.9_

- [ ] 3. Implement organization suggestions
  - Consume search summaries through a port.
  - Generate ranked suggestions with confidence and explanations.
  - Implement accept, reject, accept-selected, and stale-suggestion handling.
  - Ensure suggestion generation never silently mutates membership.
  - _Requirements: 2.1–2.3, 2.7_

- [ ] 4. Implement Auto_Organization
  - Define suggest-only and automatic-add modes.
  - Evaluate newly captured posts through a stable search port.
  - Record rule ID and reason for every automatic membership change.
  - Add enable/disable/update and audit tests.
  - _Requirements: 2.4–2.7_

- [ ] 5. Implement public link lifecycle
  - Generate high-entropy tokens and store hashes only.
  - Implement enable, revoke, regenerate, privacy-change revocation, and album-delete revocation.
  - Add rate limiting, cache invalidation, and generic public not-found behavior.
  - _Requirements: 3.1, 3.4–3.7_

- [ ] 6. Implement public album projection
  - Define allowlisted public DTO and read-only route.
  - Omit Owner identity, private tags, internal IDs/object keys, provider credentials, and unrelated posts.
  - Add redaction property tests and signed-out integration tests.
  - _Requirements: 3.2–3.6_

- [ ] 7. Implement relationship map service
  - Build authorized post/tag/album/platform nodes and typed weighted edges.
  - Implement deterministic caps, clustering/sampling, cursor pagination, truncation indicator, and accessible list projection.
  - Add referential-integrity and Owner-scope tests.
  - _Requirements: 4.1–4.5_

- [ ] 8. Implement profile export and deletion
  - Build export job for documented authorized metadata, memberships, tags, provenance, and links.
  - Build deletion workflow revoking sessions/links, removing or anonymizing metadata, and scheduling media cleanup.
  - Expose status, retry, retention, and audit behavior.
  - _Requirements: 5.1–5.5_

- [ ] 9. Create existing-Coolify deployment definitions
  - Add container definitions and service configuration for web, API, worker, scheduler, MongoDB, SeaweedFS, Redis, and SearchIndex as applicable.
  - Parameterize domains, URLs, OAuth, storage, model credentials, limits, and feature flags through environment variables/secrets.
  - Do not install/provision Coolify; document connection to the existing instance.
  - _Requirements: 6.1–6.2, 6.5, 6.7_

- [ ] 10. Add operations and backup runbooks
  - Add readiness/liveness checks, metrics, structured logs, graceful shutdown, migration/index initialization, and timeout configuration.
  - Document persistent volumes, MongoDB backup/restore, SeaweedFS backup/restore, and consistency assumptions.
  - _Requirements: 6.3–6.6_

- [ ] 11. Publish albums/ops contracts
  - Add OpenAPI for albums, memberships, suggestions, public links, graph/list, export, deletion, and health.
  - Publish public projection separately from private album schema.
  - _Requirements: 1.1–6.7_

- [ ] 12. Verify albums and operations
  - Run unit/property, MongoDB, public redaction, graph, export/deletion, backup, and deployment smoke tests.
  - Verify fresh stack readiness and dependency failure behavior on the existing Coolify deployment model.
  - _Requirements: 1.1–6.7_

- [ ] 13. Checkpoint - hand off operations artifact
  - Publish service definitions, environment variable catalog, backup/restore instructions, health URLs, public-link policy, and known limitations.
