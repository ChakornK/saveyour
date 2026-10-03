# Requirements Document

## Introduction

This specification covers asynchronous media analysis, AI provider integration, video frame extraction, audio transcription, embeddings, search indexing, semantic retrieval, tag suggestions, and analysis observability for saveyour.tech. The workstream consumes capture/post ports and publishes analysis/search contracts without depending on Flutter implementation.

## Glossary

- **Analysis_Job**: Durable asynchronous work item for one post version and stage.
- **Analysis_Stage**: Fetch, store, extract, describe, transcribe, normalize, embed, persist, or index operation.
- **Partial_Result**: A post with some successful derived fields and one or more failed stages.
- **Search_Document**: Derived index document owned by an Owner and linked to a Saved_Post.
- **Search_Agent**: Bounded AI adapter that extracts intent or expands a query.
- **SearchIndex**: Engine-neutral full-text/vector adapter.
- **Provenance**: Provider, model, prompt/version, timestamp, and confidence metadata for generated data.

## Requirements

### Requirement 1: Durable analysis pipeline

**User Story:** As a user, I want saved posts analyzed automatically, so that I can search by meaning and content.

#### Acceptance Criteria

1. WHEN a Saved_Post is accepted, THE Analysis_Service SHALL enqueue an Analysis_Job keyed by post ID and post version.
2. THE Analysis_Service SHALL represent each stage with queued, processing, retryable, completed, or failed state.
3. WHEN a stage succeeds, THE Analysis_Service SHALL persist its result before proceeding to dependent stages.
4. WHEN some stages succeed and another fails, THE Analysis_Service SHALL preserve successful results and mark the post partially completed.
5. WHEN all configured stages succeed, THE Analysis_Service SHALL mark the post completed and publish an index-update event.
6. IF a transient failure occurs, THEN THE Analysis_Service SHALL retry with bounded exponential backoff.
7. IF retry attempts are exhausted, THEN THE Analysis_Service SHALL mark the stage permanently failed and expose manual retry.
8. THE Analysis_Service SHALL record provider, model, prompt version, timestamp, and confidence/provenance metadata.
9. Replaying the same post version and stage SHALL not duplicate derived results or index documents.

### Requirement 2: Media intelligence

**User Story:** As a user, I want images and videos understood, so that visual content contributes to search.

#### Acceptance Criteria

1. WHEN an image or extracted frame is processed, THE Analysis_Service SHALL produce a description and normalized tag candidates through the configured provider or record a provider failure.
2. WHEN a video is processed, THE Analysis_Service SHALL extract representative frames with timestamps under configured limits.
3. WHEN audio is available, THE Analysis_Service SHALL produce a timestamped transcript when the configured provider succeeds.
4. IF media is malformed, oversized, unsupported, or unavailable, THEN THE Analysis_Service SHALL record a stage-specific reason and continue independent stages.
5. THE Analysis_Service SHALL preserve original source text separately from generated text.

### Requirement 3: AI provider safety

**User Story:** As an operator, I want AI processing bounded and attributable, so that failures and inaccurate output are controllable.

#### Acceptance Criteria

1. THE AiProvider adapter SHALL validate structured responses before persistence.
2. THE AiProvider adapter SHALL enforce request timeout, token budget, retry, and provider rate limits.
3. WHEN a provider is unavailable, THE Analysis_Service SHALL use bounded retries and expose a retryable or failed state.
4. THE Analysis_Service SHALL never overwrite user-authored content or canonical source URLs with generated values.
5. THE Analysis_Service SHALL redact secrets and private URLs from logs.

### Requirement 4: Search indexing

**User Story:** As a user, I want analyzed posts indexed, so that search results remain current and permission-safe.

#### Acceptance Criteria

1. WHEN generated post data commits, THE SearchIndex SHALL upsert a versioned Search_Document.
2. WHEN a post is deleted, THE SearchIndex SHALL remove or hide its Search_Document.
3. THE SearchIndex SHALL support lexical search, vector search, structured filters, upsert, delete, health, and rebuild operations.
4. THE SearchIndex SHALL preserve Owner scope in every document and query.
5. THE SearchIndex SHALL support deterministic rebuild from authoritative MongoDB state.

### Requirement 5: Semantic search and suggestions

**User Story:** As a user, I want to search by ideas, tags, and filters, so that I can retrieve posts without exact wording.

#### Acceptance Criteria

1. WHEN a query is submitted, THE Search_Service SHALL combine semantic similarity, lexical matching, and structured filters within Owner scope.
2. THE Search_Service SHALL support tag, platform, album, date, analysis-status, and media-type filters.
3. WHEN Search_Agent is available, THE Search_Service SHALL use bounded structured intent extraction or query expansion.
4. IF Search_Agent is unavailable, THEN THE Search_Service SHALL use deterministic lexical/vector retrieval.
5. THE Search_Service SHALL return stable ranking, cursor pagination, result state, matched fields, and relevance explanations where available.
6. WHEN a tag suggestion query is received, THE Search_Service SHALL return only authorized normalized tags and recent user tags.
7. THE Search_Service SHALL exclude deleted, unauthorized, and unavailable records.
8. THE Search_Service SHALL provide query identifiers and latency metadata for observability.

### Requirement 6: Verification and observability

**User Story:** As an operator, I want to monitor and replay analysis, so that the system remains recoverable.

#### Acceptance Criteria

1. THE Analysis_Service SHALL expose queue depth, job age, success, retry, permanent failure, and processing latency metrics.
2. THE Analysis_Service SHALL expose health for queue, provider adapters, storage ports, and SearchIndex.
3. THE system SHALL provide a replay command for a post version and stage.
4. THE system SHALL provide contract tests for SearchIndex implementations and provider fakes.
5. THE system SHALL provide end-to-end tests from accepted post through analysis and search.
