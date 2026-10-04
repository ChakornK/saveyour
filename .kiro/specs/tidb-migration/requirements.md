# Requirements Document

## Introduction

This specification migrates live application persistence from MongoDB to TiDB and search from Meilisearch to TiDB hybrid keyword/vector search. TiDB becomes authoritative for current product state, analysis state, normalized AI results, embeddings, search documents, transactions, leases, and outbox events.

## Glossary

- **TiDB_Store**: Relational database storing live application data.
- **TiDB_Search**: TiDB-backed keyword, structured-filter, and vector retrieval adapter.
- **Migration_Process**: Export, transform, load, validate, and cutover process from MongoDB/Meilisearch.
- **Active_Embedding**: Current model/version vector used by user-facing search.
- **Outbox_Event**: Transactionally stored event awaiting publication.
- **Job_Lease**: Time-bounded job ownership record.

## Requirements

### Requirement 1: Relational schema

**User Story:** As an operator, I want live data in TiDB, so that the application has transactional relational persistence.

#### Acceptance Criteria

1. THE TiDB_Store SHALL contain users, posts, albums, album relationships, media assets, analysis jobs, analysis stages, analysis results, transcripts, transcript segments, tags, post-tag relationships, embeddings, search documents, processing attempts, and outbox events.
2. THE TiDB_Store SHALL enforce unique analysis idempotency keys.
3. THE TiDB_Store SHALL preserve owner identifiers, statuses, timestamps, source attribution, and stable logical identifiers.
4. THE TiDB_Store SHALL enforce or explicitly validate relationships between posts, media assets, jobs, results, transcripts, tags, embeddings, and search documents.
5. THE TiDB_Store SHALL provide migration version tracking and compatibility checks.

### Requirement 2: Transactional repositories

**User Story:** As an application service, I want repository interfaces backed by TiDB, so that existing domain behavior survives the migration.

#### Acceptance Criteria

1. THE TiDB repositories SHALL implement existing analysis, capture, derived-post, source, media-asset, and outbox contracts.
2. THE TiDB repositories SHALL use parameterized SQL for every query.
3. THE TiDB repositories SHALL support atomic capture and result-persistence transactions.
4. WHEN a transaction fails, THE TiDB_Store SHALL roll back all writes in that transaction.
5. IF a duplicate idempotency key is received, THEN THE TiDB repository SHALL return the existing logical record without creating a duplicate.

### Requirement 3: Job leases and outbox

**User Story:** As an operator, I want reliable background processing, so that workers can retry without duplicate state.

#### Acceptance Criteria

1. THE TiDB_Store SHALL support atomic job lease acquisition based on status and expiry.
2. WHILE a lease is active, THE TiDB_Store SHALL reject stale-worker stage updates.
3. WHEN a lease expires, THE TiDB_Store SHALL allow a new worker to reclaim the job.
4. THE TiDB_Store SHALL insert required Outbox_Events in the same transaction as the state change they describe.
5. THE Outbox publisher SHALL support claim, retry, idempotent publication, and dead-letter state.

### Requirement 4: TiDB hybrid search

**User Story:** As a user, I want semantic and filtered search, so that saved posts can be found by meaning and metadata.

#### Acceptance Criteria

1. THE TiDB_Search SHALL implement upsert, delete, query, rebuild, and health operations.
2. THE TiDB_Search SHALL support owner, platform, analysis-status, media-type, tag, and date filters.
3. THE TiDB_Search SHALL support vector similarity with the configured embedding dimension.
4. THE TiDB_Search SHALL support keyword matching for searchable text and tags.
5. THE TiDB_Search SHALL combine vector and keyword scores with configurable weights and deterministic tie-breaking.
6. WHEN a query executes, THE TiDB_Search SHALL apply Owner_Scope filtering before returning candidates.
7. IF vector dimension or model compatibility fails, THEN THE TiDB_Search SHALL reject the write or query with a validation error.
8. WHEN a rebuild executes, THE TiDB_Search SHALL converge to the same active document set as incremental indexing.

### Requirement 5: Migration tooling

**User Story:** As an operator, I want controlled migration from MongoDB and Meilisearch, so that no user data is silently lost.

#### Acceptance Criteria

1. THE Migration_Process SHALL export required MongoDB collections with source identifiers, owner identifiers, and export timestamps.
2. THE Migration_Process SHALL transform nested records into relational rows with deterministic mappings.
3. THE Migration_Process SHALL preserve unmappable payloads in quarantine records with conversion reasons.
4. THE Migration_Process SHALL validate counts, ownership, relationships, statuses, timestamps, and representative payloads.
5. THE Migration_Process SHALL support dry-run, resume, and idempotent rerun behavior.
6. THE Migration_Process SHALL rebuild active search documents and embeddings after import.
7. IF validation detects data loss or owner mismatch, THEN THE Cutover_Process SHALL block promotion.

### Requirement 6: Security and operations

**User Story:** As an operator, I want secure and observable TiDB operation, so that failures can be diagnosed without exposing data.

#### Acceptance Criteria

1. THE TiDB_Store SHALL expose connection, schema-version, and vector-compatibility health status.
2. THE TiDB_Search SHALL enforce owner scope in SQL and result mapping.
3. THE TiDB_Store SHALL use least-privilege credentials and parameterized statements.
4. THE System SHALL record migration version, transaction failures, lease conflicts, outbox backlog, and search errors with correlation IDs.
5. THE System SHALL keep binary media outside TiDB and store only references and metadata.

### Requirement 7: Independent verification

**User Story:** As a developer, I want TiDB tested independently, so that the migration does not depend on Snowflake availability.

#### Acceptance Criteria

1. THE TiDB repositories SHALL have contract tests using representative records.
2. THE TiDB migrations SHALL apply to an empty database and upgrade from the previous version.
3. THE TiDB_Search SHALL have vector, keyword, filter, owner-isolation, deletion, pagination, and rebuild tests.
4. THE TiDB_Store SHALL have transaction, duplicate-key, deadlock, timeout, lease, and outbox tests.
5. THE TiDB test suite SHALL use a fake Cortex provider for normalized result inputs.
