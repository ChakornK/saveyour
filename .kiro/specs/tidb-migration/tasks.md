# Implementation Plan: TiDB Application and Search Migration

## Overview

Implement TiDB as the live transactional database and hybrid vector/keyword search system. Preserve domain repository contracts, create schema migrations, replace MongoDB repositories, replace Meilisearch search, build migration tooling, and stage cutover with validation and rollback.

## Tasks

- [ ] 1. Confirm TiDB capabilities and freeze schema decisions
  - Select exact TiDB version/deployment.
  - Verify vector columns, vector indexes, distance functions, JSON, text search, transactions, locks, and pagination capabilities.
  - Publish embedding dimension/model and search-ranking configuration.
  - _Requirements: 1.1-1.5, 4.1-4.8_

- [ ] 2. Create TiDB migrations
  - Create migrations for all required tables.
  - Add keys, relationships, owner indexes, status/time indexes, tag indexes, outbox indexes, and vector indexes.
  - Add migration-version and compatibility records.
  - Add embedding model/version/active metadata.
  - Add lease and stale-worker columns.
  - _Requirements: 1.1-1.5, 3.1-3.5, 4.3, 6.1_

- [ ] 3. Implement TiDB database adapter
  - Implement pooling, connection, close, health check, transaction helper, timeouts, parameter binding, and transient transaction retry.
  - Implement migration runner and compatibility validation.
  - Add adapter tests for commit, rollback, duplicate key, deadlock, timeout, and connection loss.
  - _Requirements: 2.2-2.4, 6.1-6.4, 7.2-7.4_

- [ ] 4. Replace MongoDB repositories
  - Implement analysis repository.
  - Implement capture repository with owner and canonical URL deduplication.
  - Implement derived-post and tag suggestion store.
  - Implement source repository.
  - Implement media asset repository.
  - Implement outbox repository.
  - Add repository contract tests.
  - _Requirements: 2.1-2.5, 3.4-3.5, 7.1, 7.4_

- [ ] 5. Implement job leases and outbox persistence
  - Implement atomic lease acquisition, renewal/expiry, reclaim, and stale-worker rejection.
  - Implement outbox insert in caller transactions.
  - Implement outbox claim, retry, idempotent publication, and dead-letter status.
  - Add concurrency tests.
  - _Requirements: 3.1-3.5, 6.4, 7.4_

- [ ] 6. Implement TiDB hybrid search
  - Implement `TiDBSearchIndex` behind the existing `SearchIndex` contract.
  - Implement owner and structured filters.
  - Implement keyword matching.
  - Implement vector similarity and model/dimension validation.
  - Implement configurable score combination and tie-breaking.
  - Implement pagination, delete, rebuild, and health.
  - Add owner-isolation and rebuild-convergence tests.
  - _Requirements: 4.1-4.8, 6.2, 7.3_

- [ ] 7. Build MongoDB-to-TiDB migration tooling
  - Export collections with source metadata.
  - Transform nested documents into relational rows.
  - Apply deterministic ID mappings and dependency-order imports.
  - Add quarantine records for malformed/unmappable records.
  - Add dry-run, resume, idempotent rerun, and validation reports.
  - Rebuild active search documents and embeddings through the integration boundary.
  - _Requirements: 5.1-5.7_

- [ ] 8. Replace Meilisearch and MongoDB wiring
  - Add TiDB configuration and environment validation.
  - Wire API, worker, downloader, and runtime to TiDB adapters.
  - Wire TiDB search and remove Meilisearch initialization.
  - Update Docker Compose and environment examples.
  - Retain in-memory implementations for tests/development.
  - _Requirements: 2.1, 4.1, 6.1-6.5_

- [ ] 9. Add shadow validation and cutover controls
  - Compare source/target counts, owners, relationships, statuses, and representative payloads.
  - Compare Meilisearch and TiDB result sets/rankings for a fixed corpus.
  - Support read-only validation before promotion.
  - Add feature flags for TiDB persistence and TiDB search.
  - Document rollback and retention period.
  - _Requirements: 5.4-5.7, 6.4_

- [ ] 10. Verify integration boundary
  - Accept normalized analysis result envelopes without parsing Cortex-specific responses.
  - Persist transcripts, tags, captions, embeddings, search documents, stage completion, and outbox event atomically.
  - Verify duplicate result persistence is idempotent.
  - Test with a fake Cortex provider.
  - _Requirements: 2.3-2.5, 3.4-3.5, 4.3, 7.5_

- [ ] 11. Checkpoint — TiDB release readiness
  - Run migrations from empty and upgrade paths.
  - Run repository, lease, outbox, vector, keyword, filter, and migration tests.
  - Verify no production MongoDB or Meilisearch imports remain after cutover gate.
  - Verify rollback procedure in staging.
  - _Requirements: 5.1-5.7, 6.1-6.5, 7.1-7.5_
