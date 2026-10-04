# Requirements Document

## Introduction

This specification defines the integration contract connecting Snowflake Cortex media analysis to application persistence and search. It owns shared versioned types, job orchestration, queue sequencing, leases, retries, idempotency, atomic result persistence, search-document updates, and end-to-end behavior.

## Glossary

- **Integration_Coordinator**: Component that orchestrates media preparation, Cortex operations, and TiDB persistence.
- **Analysis_Job**: Durable TiDB request for one or more analysis stages.
- **Analysis_Result_Envelope**: Versioned normalized result consumed by TiDB.
- **Job_Lease**: Time-bounded worker ownership record.
- **Completion_Key**: Stable key preventing duplicate result persistence.
- **Stage**: Independently tracked analysis operation.
- **Outbox_Event**: Durable event published after a committed state change.

## Requirements

### Requirement 1: Shared contracts

**User Story:** As a developer, I want stable contracts between Cortex and TiDB, so that both workstreams can be implemented independently.

#### Acceptance Criteria

1. THE Integration_Coordinator SHALL define versioned analysis-job request and result-envelope schemas.
2. THE Analysis_Result_Envelope SHALL contain job, post, media, provider, model, status, tags, captions, frame results, transcript, embeddings, warnings, timestamps, and idempotency fields.
3. THE Integration_Coordinator SHALL consume normalized provider results without parsing Cortex-specific raw responses.
4. THE TiDB adapter SHALL consume result envelopes without requiring Cortex credentials or prompts.
5. IF a schema version is unsupported, THEN THE Integration_Coordinator SHALL reject the result with an explicit compatibility error.

### Requirement 2: Capture and enqueue

**User Story:** As a user, I want a successful capture to be reliably queued, so that analysis starts without losing the request.

#### Acceptance Criteria

1. WHEN a valid capture is received, THE Integration_Coordinator SHALL create the post, media metadata, analysis job, and initial Outbox_Event in one TiDB transaction.
2. THE Integration_Coordinator SHALL acknowledge capture success only after the TiDB transaction commits.
3. THE Outbox publisher SHALL publish the job reference to Redis after commit.
4. IF queue publication fails, THEN THE Outbox_Event SHALL remain durable and retryable.
5. WHEN the same capture idempotency key is replayed, THE Integration_Coordinator SHALL return the existing job without creating duplicates.

### Requirement 3: Lease and processing

**User Story:** As an operator, I want safe worker coordination, so that concurrent workers do not overwrite each other.

#### Acceptance Criteria

1. WHEN a worker receives a job, THE Integration_Coordinator SHALL acquire a Job_Lease atomically.
2. WHILE a Job_Lease is active, THE Integration_Coordinator SHALL require the lease owner/version for stage updates.
3. WHEN a Job_Lease expires, THE Integration_Coordinator SHALL allow a new worker to reclaim the job.
4. IF a stale worker submits results, THEN THE Integration_Coordinator SHALL reject the results without overwriting current state.
5. THE Integration_Coordinator SHALL load job context from TiDB rather than trusting owner or media identifiers from the queue message.

### Requirement 4: Media analysis orchestration

**User Story:** As a user, I want all valid media analysis stages to complete, so that posts become searchable.

#### Acceptance Criteria

1. WHEN a job is processed, THE Integration_Coordinator SHALL prepare valid media artifacts before invoking the Cortex_Provider.
2. THE Integration_Coordinator SHALL invoke image, frame, Cortex transcription, and embedding stages according to the requested stage set.
3. THE Integration_Coordinator SHALL assemble normalized Analysis_Result_Envelope records.
4. IF one stage fails permanently, THEN THE Integration_Coordinator SHALL preserve successful independent stage results and record the failed stage explicitly.
5. IF a stage fails transiently, THEN THE Integration_Coordinator SHALL leave the stage retryable according to configured limits.
6. THE Integration_Coordinator SHALL not substitute a non-Cortex transcription provider.

### Requirement 5: Atomic persistence

**User Story:** As an operator, I want analysis results and search state consistent, so that users never search an uncommitted result.

#### Acceptance Criteria

1. WHEN analysis results are complete, THE Integration_Coordinator SHALL persist normalized results, transcripts, segments, embeddings, search documents, stage state, and completion Outbox_Event in one TiDB transaction.
2. THE Integration_Coordinator SHALL execute all external Cortex and object-store calls before opening the persistence transaction.
3. IF persistence fails, THEN THE Integration_Coordinator SHALL roll back all completion writes and leave the job retryable.
4. WHEN the same Completion_Key is replayed, THE Integration_Coordinator SHALL return the existing completion without duplicate rows.
5. THE Integration_Coordinator SHALL mark queue acknowledgement only after persistence commit or durable terminal failure.

### Requirement 6: Error handling and retries

**User Story:** As an operator, I want classified failures, so that retries repair transient failures without looping on permanent failures.

#### Acceptance Criteria

1. THE Integration_Coordinator SHALL classify transient, capability/configuration, input, media, persistence, stale-lease, and permanent-content failures.
2. WHEN a transient failure occurs, THE Integration_Coordinator SHALL apply bounded exponential backoff with jitter.
3. IF the maximum retry count is reached, THEN THE Integration_Coordinator SHALL persist retry exhaustion and expose the job for operator action.
4. IF a capability or configuration failure occurs, THEN THE Integration_Coordinator SHALL avoid unbounded automatic retries.
5. THE Integration_Coordinator SHALL preserve correlation IDs across API, job, queue, provider, database, and outbox operations.

### Requirement 7: Security and ownership

**User Story:** As a user, I want analysis results isolated, so that another owner cannot access my content.

#### Acceptance Criteria

1. THE Integration_Coordinator SHALL verify authenticated Owner_Scope before creating jobs.
2. THE Integration_Coordinator SHALL resolve owner, post, and media relationships from TiDB before processing.
3. IF a queue message references a mismatched owner or post, THEN THE Integration_Coordinator SHALL reject the message and record a security event.
4. THE Integration_Coordinator SHALL pass only authorized media references to the Cortex_Provider.
5. THE Integration_Coordinator SHALL ensure generated search documents retain the source owner ID.

### Requirement 8: Verification

**User Story:** As a developer, I want end-to-end integration tests, so that the two infrastructure workstreams compose correctly.

#### Acceptance Criteria

1. THE Test_Suite SHALL test capture, outbox publication, queue delivery, lease acquisition, media preparation, Cortex result consumption, TiDB persistence, and search.
2. THE Test_Suite SHALL test duplicate queue messages and duplicate completion envelopes.
3. THE Test_Suite SHALL test worker failure before persistence and after persistence.
4. THE Test_Suite SHALL test expired leases and stale-worker rejection.
5. THE Test_Suite SHALL test partial stage failures and retry exhaustion.
6. THE Test_Suite SHALL test owner isolation from capture through search.
7. THE Test_Suite SHALL run with a fake Cortex provider and a real TiDB adapter, and with a real/approved Cortex provider and a fake TiDB adapter.
