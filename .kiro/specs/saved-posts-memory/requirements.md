# Requirements Document

## Introduction

Saved Posts Memory is an adaptive application for capturing, preserving, analyzing, searching, organizing, and sharing social-media posts. Users can share links from supported social platforms to the mobile app, submit links on the web, or use an authenticated web capture flow. The system stores source metadata and downloaded media, processes images, video frames, text, and audio into searchable representations, and presents the results in a unified neobrutalist emerald interface across iOS, Android, and responsive web.

The first release prioritizes reliable capture, transparent processing, fast retrieval, album organization, and source-preserving sharing. AI suggestions assist users but do not silently remove content, change source links, or publish albums.

## Glossary

- **Saved_Post**: A user-owned record representing a captured social-media URL, its source metadata, extracted content, analysis state, and media references.
- **Capture_Request**: A request to create or refresh a Saved_Post from a shared or submitted URL.
- **Source_Platform**: Instagram, Reddit, TikTok, Facebook, X, or another explicitly supported provider.
- **Media_Asset**: An image, downloaded video, extracted video frame, audio file, thumbnail, or derivative associated with a Saved_Post.
- **Analysis_Job**: An asynchronous job that extracts text, captions, tags, embeddings, transcripts, and media metadata.
- **Analysis_Status**: queued, processing, partially_completed, completed, failed, or unsupported.
- **Semantic_Search**: Search that compares a query embedding with indexed Saved_Post content and metadata.
- **Tag**: A normalized user- or AI-generated label associated with a Saved_Post.
- **Album**: A user-owned ordered collection of Saved_Post references with a name, optional description, visibility, and sharing settings.
- **Public_Album_Link**: A revocable, unguessable URL that exposes a read-only Album projection.
- **Relationship_Map**: A spatial visualization of posts, tags, albums, and semantic connections.
- **Auto_Organization**: An opt-in rule set that suggests or assigns newly captured posts to matching Albums.
- **Canonical_Post_URL**: The normalized URL used to identify and open the original source post.
- **Capture_Service**: The backend service that validates URLs, resolves source metadata, and creates Saved_Post records.
- **Analysis_Service**: The asynchronous processing system that downloads permitted media and creates searchable derived data.
- **Search_Service**: The full-text and vector indexing layer accessed through an application adapter.
- **Owner**: The authenticated user who owns a Saved_Post or Album.
- **Client**: The Flutter adaptive application running on iOS, Android, or web.
- **Accessible_Alternative**: A non-gesture or non-visual control providing the same outcome as a gesture, map interaction, or animation.

## Requirements

### Requirement 1: Authentication and account security

**User Story:** As a user, I want to sign in securely, so that my saved posts and albums are private and available across devices.

#### Acceptance Criteria

1. WHEN a user selects Google sign-in, THE Client SHALL begin an OAuth authorization flow using the configured Google client identifier for the current platform.
2. WHEN Google authorization succeeds, THE Authentication_Service SHALL create or retrieve one account identified by the verified provider subject and SHALL issue a session accepted by the Client.
3. WHEN a session expires, THE Client SHALL preserve unsent capture input locally and SHALL request re-authentication before sending protected requests.
4. IF Google authorization fails or is cancelled, THEN THE Client SHALL display a recoverable error and SHALL retain the signed-out state.
5. IF a protected API request lacks a valid session, THEN THE API SHALL return a machine-readable authentication error without exposing post or album data.
6. THE API SHALL enforce Owner authorization on every Saved_Post, Album, analysis-result, and private relationship-map operation.
7. THE Client SHALL provide account sign-out and SHALL clear access tokens and protected in-memory state after sign-out.

### Requirement 2: Capture social-media links

**User Story:** As a user browsing social media, I want to share a post link into the app, so that I can save it without copying metadata manually.

#### Acceptance Criteria

1. WHEN the Client receives a share intent containing a URL, THE Capture_Client SHALL display the URL and a save action without requiring the user to retype the URL.
2. WHEN a user submits a URL through the web or mobile capture form, THE Capture_Service SHALL normalize the URL into a Canonical_Post_URL before creating a Saved_Post.
3. WHEN a Capture_Request targets a supported Source_Platform, THE Capture_Service SHALL create exactly one active Saved_Post for the same Owner and Canonical_Post_URL, or SHALL return the existing Saved_Post with a duplicate indicator.
4. IF a submitted URL is malformed, THEN THE Capture_Service SHALL return a validation error identifying the URL field and SHALL create no Saved_Post.
5. IF a submitted URL targets an unsupported Source_Platform, THEN THE Capture_Service SHALL create no Saved_Post and SHALL return a supported-platform explanation.
6. WHEN a Capture_Request is accepted, THE Capture_Service SHALL return the Saved_Post identifier, source metadata status, and Analysis_Status within 2 seconds under normal service conditions.
7. WHEN capture begins, THE Client SHALL show the Saved_Post in a pending-analysis state and SHALL allow the user to continue browsing saved content.
8. WHEN the source platform requires unavailable authorization or blocks retrieval, THE Capture_Service SHALL preserve the Canonical_Post_URL and source metadata it can legally obtain, mark the analysis state accordingly, and SHALL provide a source-link action.

### Requirement 3: Cloud media preservation

**User Story:** As a user, I want saved media preserved in the cloud, so that I can retrieve useful context even when the source feed changes.

#### Acceptance Criteria

1. WHEN an accepted Capture_Request has downloadable media, THE Analysis_Service SHALL store each permitted Media_Asset in SeaweedFS with an Owner-scoped reference.
2. WHEN media storage succeeds, THE API SHALL expose a time-limited authorized media URL or authenticated media stream rather than a public object-store credential.
3. WHEN a video is available, THE Analysis_Service SHALL extract a configurable set of representative frames and SHALL retain frame timestamps with each extracted Media_Asset.
4. WHEN media is unavailable or retrieval is denied, THE Analysis_Service SHALL retain the Canonical_Post_URL and SHALL mark the relevant asset as unavailable with a human-readable reason.
5. IF a downloaded asset exceeds configured size, duration, or type limits, THEN THE Analysis_Service SHALL reject that asset, record the limit reason, and SHALL continue processing other eligible assets.
6. THE Analysis_Service SHALL compute a content checksum for each stored asset and SHALL avoid duplicate object storage for identical content owned by the same Owner.
7. THE API SHALL prevent one Owner from retrieving another Owner's private Media_Asset through identifiers, URLs, or search results.

### Requirement 4: Media and text analysis

**User Story:** As a user, I want saved posts automatically understood, so that I can search by meaning instead of remembering exact words.

#### Acceptance Criteria

1. WHEN a Saved_Post is accepted, THE Analysis_Service SHALL enqueue an Analysis_Job with an idempotency key derived from the Saved_Post version.
2. WHEN an Analysis_Job processes an image or extracted video frame, THE Analysis_Service SHALL produce available visual descriptions, normalized Tags, and an embedding or SHALL record a provider failure.
3. WHEN an Analysis_Job processes post text or extracted text, THE Analysis_Service SHALL preserve the original text and SHALL produce searchable normalized text.
4. WHEN an Analysis_Job processes audio, THE Analysis_Service SHALL produce a timestamped transcript when the configured transcription provider succeeds.
5. WHEN a provider returns partial results, THE Analysis_Service SHALL persist successful derived fields, mark Analysis_Status as partially_completed, and SHALL identify the failed stage.
6. WHEN all configured stages complete, THE Analysis_Service SHALL mark Analysis_Status as completed and SHALL publish an index-update event.
7. IF an analysis stage fails transiently, THEN THE Analysis_Service SHALL retry according to bounded exponential backoff and SHALL expose the next retry state.
8. IF an analysis stage fails permanently, THEN THE Analysis_Service SHALL mark the stage failed, preserve source and successfully derived content, and SHALL provide a manual retry action.
9. THE Analysis_Service SHALL record model/provider name, model version, processing timestamps, and confidence or provenance metadata for AI-generated fields.
10. THE system SHALL never replace user-authored text, tags, album membership, or Canonical_Post_URL with AI-generated values without an explicit user action.

### Requirement 5: Unified saved-post browsing

**User Story:** As a user, I want one home library across platforms, so that I can browse everything I saved without remembering where I found it.

#### Acceptance Criteria

1. WHEN an authenticated user opens Home, THE Client SHALL request the Owner's Saved_Post collection ordered by latest capture time descending.
2. WHEN Home receives posts, THE Client SHALL render a scrollable staggered gallery that supports mixed image, video-frame, text, and unavailable-media cards.
3. WHEN a Saved_Post has no usable media but has source text, THE Client SHALL render a concise text preview with source attribution and a source-link action.
4. WHEN a Saved_Post has media and text, THE Client SHALL render media as the primary preview and SHALL provide a text indication without obscuring source identity.
5. WHEN a user reaches the end of the loaded collection, THE API SHALL support cursor-based pagination and THE Client SHALL request the next page without duplicating or reordering prior posts.
6. WHILE a page is loading, THE Client SHALL display a skeleton or loading state that preserves gallery geometry.
7. IF a page request fails, THEN THE Client SHALL preserve already-rendered posts and SHALL offer retry for the failed page.
8. IF the Owner has no Saved_Post records, THEN Home SHALL show an explanation, a capture action, and supported sharing instructions.
9. WHEN a user activates a Saved_Post card, THE Client SHALL open a detail surface with higher-quality media, source information, AI description, tags, analysis status, and an action to open the Canonical_Post_URL.
10. WHEN a user long-presses or invokes the selection alternative on a Saved_Post, THE Client SHALL enter multi-select mode with clear selected-state feedback.
11. WHILE multi-select mode is active, THE Client SHALL provide add-to-album and delete actions and SHALL provide an accessible cancel action.
12. IF deletion is confirmed, THEN THE API SHALL soft-delete the selected Saved_Post records, remove them from ordinary library results, and retain an auditable deletion timestamp.

### Requirement 6: Albums and organization

**User Story:** As a user, I want to group saved posts into albums, so that a topic such as a trip or recipe collection becomes easy to revisit.

#### Acceptance Criteria

1. WHEN a user creates an Album with a valid name, THE API SHALL create an Owner-owned Album with a stable identifier, creation timestamp, and private visibility by default.
2. IF an Album name is empty, exceeds the configured length, or contains unsupported control characters, THEN THE API SHALL return a field-level validation error and SHALL create no Album.
3. WHEN a user opens Albums, THE Client SHALL render the Owner's Albums in a grid with name, post count, cover preview, visibility, and updated timestamp.
4. WHEN a user opens an Album, THE Client SHALL render the Album's posts using the same gallery, detail, selection, deletion, and source-link behavior as Home.
5. WHEN a user adds a Saved_Post to an Album, THE API SHALL create one membership and SHALL make repeated add requests idempotent.
6. WHEN a user removes a Saved_Post from an Album, THE API SHALL remove only the membership and SHALL preserve the Saved_Post unless the user separately deletes it.
7. WHEN an Album is renamed, THE API SHALL preserve its identifier, memberships, sharing configuration, and history metadata.
8. WHEN an Album is deleted, THE API SHALL remove its memberships and revoke its Public_Album_Link while preserving Saved_Post records.
9. WHEN an Album is created or renamed, THE Organization_Service SHALL return ranked post suggestions with explanation tags and confidence values.
10. WHEN a user reviews organization suggestions, THE Client SHALL allow accepting, rejecting, or accepting selected suggestions without silently changing existing memberships.
11. WHEN a user chooses to add all current search results to an Album, THE Client SHALL show the result count, exclusions, and confirmation before applying membership changes.
12. WHERE Auto_Organization is enabled for an Album, THE Organization_Service SHALL evaluate newly captured posts against the rule and SHALL either suggest or add membership according to the Owner's explicit mode.
13. THE Organization_Service SHALL provide an audit record for each automated membership change containing the rule identifier and reason.

### Requirement 7: Search and discovery

**User Story:** As a user, I want to search by meaning, tags, source, and date, so that I can find a post even when I remember only the idea.

#### Acceptance Criteria

1. WHEN a user submits a non-empty search query, THE Search_Service SHALL search Owner-authorized Saved_Post content using semantic similarity and indexed text and SHALL return ranked results.
2. WHEN a user searches by an exact or normalized Tag, THE Search_Service SHALL return posts associated with that Tag and SHALL preserve relevance ordering within the filtered set.
3. WHEN a user applies Source_Platform, Album, date, analysis-status, or media-type filters, THE Search_Service SHALL apply all selected filters before returning results.
4. WHEN a search request is submitted, THE Search_Agent SHALL receive the query, authorized candidate scope, and available filters and SHALL return structured search intent without receiving data outside the Owner scope.
5. IF the Search_Agent is unavailable, THEN THE Search_Service SHALL perform deterministic lexical and vector retrieval without blocking the user from viewing results.
6. WHEN search results are returned, THE Client SHALL display result count or an explicit partial-result state, source platform, matched tags, and the reason or field contributing to relevance where available.
7. WHEN a user focuses the search field, THE Client SHALL suggest recently used Tags and available matching Tags without requiring a submitted query.
8. IF no results match, THEN THE Client SHALL offer revised query suggestions, related Tags, filter clearing, and a create-album-from-query action.
9. WHEN a user creates an Album from a search, THE Client SHALL prefill the Album name from the query, show the exact candidate count, and require confirmation before membership creation.
10. THE Search_Service SHALL support cursor pagination, stable ranking for a request, and a query identifier for observability.
11. THE Search_Service SHALL exclude soft-deleted posts, unauthorized posts, and unavailable memberships from results.

### Requirement 8: Public album sharing

**User Story:** As a user, I want to share an album publicly, so that other people can browse a curated collection without accessing my private account.

#### Acceptance Criteria

1. WHEN an Owner enables sharing for an Album, THE API SHALL create a revocable Public_Album_Link with an unguessable token and configurable read-only visibility.
2. WHEN a visitor opens a valid Public_Album_Link, THE public API SHALL render only the album name, description, cover, ordered post projections, source links, permitted media, and published timestamps.
3. THE public API SHALL not expose Owner email, OAuth identifiers, private tags, private albums, internal object keys, analysis-provider credentials, or unrelated Saved_Post data.
4. WHEN an Owner revokes a Public_Album_Link, THE public API SHALL reject subsequent requests using that token within the configured cache invalidation bound.
5. WHEN an Owner regenerates a Public_Album_Link, THE API SHALL invalidate the previous token and issue a distinct token.
6. WHEN an Album is deleted or made private, THE API SHALL revoke every active Public_Album_Link for that Album.
7. IF a visitor requests a missing, revoked, or private link, THEN the public API SHALL return a non-disclosing not-found response.
8. THE Client SHALL provide copy-link, share-link, revoke, regenerate, and visibility status actions to the Owner.

### Requirement 9: Relationship map

**User Story:** As a user, I want to see how my saved posts connect, so that I can discover themes in my own library.

#### Acceptance Criteria

1. WHEN a user opens the Relationship_Map, THE Map_Service SHALL return Owner-authorized post, Tag, Album, and relationship nodes with stable identifiers.
2. THE Map_Service SHALL calculate or retrieve relationship weights from shared Tags, semantic similarity, shared Albums, and source metadata and SHALL identify the relationship type.
3. WHEN the map is rendered, THE Client SHALL provide pan, zoom, focus, filtering, and node-detail actions on touch, pointer, and keyboard-capable controls.
4. WHEN a user activates a node, THE Client SHALL show the associated Saved_Post, Tag, or Album details and SHALL provide navigation to the relevant collection.
5. THE Client SHALL provide an Accessible_Alternative list view with the same node and relationship information.
6. IF map data is unavailable, THEN THE Client SHALL show a retryable error and SHALL preserve a link to Home, Albums, and Search.
7. WHILE the map is loading, THE Client SHALL render stable loading geometry and SHALL not claim that relationships are complete.
8. THE Map_Service SHALL cap graph size per request and SHALL provide a deterministic sampling or clustering strategy for larger libraries.

### Requirement 10: Adaptive navigation and neobrutalist UX

**User Story:** As a user, I want the same product concepts on mobile and web with controls suited to each device, so that the app feels unified without feeling cramped.

#### Acceptance Criteria

1. WHEN the Client runs in mobile layout, THE Client SHALL provide Home, Albums, and Profile as primary bottom navigation destinations.
2. WHEN the Client runs in wide web layout, THE Client SHALL provide equivalent destinations through a persistent or collapsible navigation region without removing access to the mobile destination model.
3. WHEN Home is active, THE Client SHALL provide a pending-analysis action on the left, the app name in the center, and an add-link action on the right at the top of the content surface.
4. WHEN an Album is active, THE Client SHALL display the album name in the top bar and SHALL provide an accessible rename action.
5. THE Client SHALL use the supplied emerald neobrutalist tokens, black borders, white secondary surfaces, bold typography, and 4px offset shadows as the base visual system.
6. THE Client SHALL use Mingcute filled icons where an icon is required and SHALL provide text or accessible labels for icon-only controls.
7. WHEN a user activates a primary control, THE Client SHALL provide a purposeful bouncy transition that completes within 250 milliseconds unless reduced motion is enabled.
8. WHEN reduced motion is enabled, THE Client SHALL replace bouncy transitions with opacity or instant state changes while preserving feedback and focus.
9. THE Client SHALL maintain a minimum 44 by 44 CSS-pixel or logical-pixel target for touch controls and SHALL provide keyboard focus indicators on web.
10. THE Client SHALL preserve content hierarchy and usable controls at widths from 320 pixels through large desktop widths without horizontal scrolling for ordinary flows.
11. IF an action requires long press, drag, hover, or map gestures, THEN THE Client SHALL provide an Accessible_Alternative with equivalent outcome.
12. THE Client SHALL support loading, empty, offline, partial-analysis, permission, error, and success states with explicit user-facing copy.

### Requirement 11: Offline and synchronization behavior

**User Story:** As a mobile user, I want capture and browsing to remain understandable during connectivity changes, so that I do not lose a save action or create duplicates.

#### Acceptance Criteria

1. WHEN a user submits a capture URL without network connectivity, THE Client SHALL store the Capture_Request in a local outbox with a visible pending state.
2. WHEN connectivity returns, THE Client SHALL retry queued Capture_Requests with an idempotency key and SHALL reconcile duplicate responses into one Saved_Post.
3. IF a queued Capture_Request fails validation, THEN THE Client SHALL mark it permanently failed with an editable URL and SHALL not retry it indefinitely.
4. WHEN offline browsing data exists locally, THE Client SHALL clearly identify stale data and SHALL prevent offline mutations from appearing completed before server acknowledgement.
5. WHEN synchronization conflicts occur, THE Client SHALL preserve server and local values according to field-specific conflict rules and SHALL expose unresolved conflicts that require user action.

### Requirement 12: Self-hosted operations and observability

**User Story:** As the operator of a self-hosted deployment, I want predictable deployment and diagnostics, so that the application can run reliably on Coolify.

#### Acceptance Criteria

1. THE system SHALL provide container images or reproducible container build definitions for the Client web target, API, worker, Search_Service adapter, and required supporting services.
2. THE system SHALL configure secrets, service URLs, OAuth credentials, storage credentials, model credentials, limits, and feature flags through environment variables or mounted secret files.
3. THE system SHALL provide health endpoints for API dependencies, MongoDB, SeaweedFS, Redis if enabled, the Search_Service, and AI providers where applicable.
4. THE system SHALL expose structured logs with request identifiers, user-safe error codes, job identifiers, provider stage names, and latency fields without logging OAuth tokens or private media URLs.
5. THE Analysis_Service SHALL expose queue depth, job age, success count, retry count, permanent failure count, and processing latency metrics.
6. THE API SHALL provide database indexes and migration or initialization procedures that can be run repeatably in a fresh Coolify deployment.
7. THE system SHALL provide backup and restore procedures for MongoDB metadata and SeaweedFS media references or volumes, including documented consistency assumptions.
8. WHEN a dependency is unavailable, THE API SHALL fail with bounded timeouts and actionable health status rather than hanging requests indefinitely.
9. THE deployment SHALL support separate development, staging, and production configuration without embedding environment-specific secrets in the repository.

### Requirement 13: Privacy, safety, and compliance boundaries

**User Story:** As a user, I want my saved content and AI processing handled responsibly, so that cloud convenience does not remove my control.

#### Acceptance Criteria

1. THE system SHALL display the source URL, capture time, analysis status, and media provenance for every Saved_Post.
2. WHEN a user deletes a Saved_Post, THE system SHALL remove ordinary access to its derived search records and SHALL enqueue associated media and embedding cleanup according to the retention policy.
3. THE system SHALL provide account-level data export containing Saved_Post metadata, Album metadata, memberships, tags, analysis provenance, and source links in a documented format.
4. THE system SHALL provide account deletion that revokes sessions, removes or anonymizes account-owned metadata, revokes public links, and schedules owned media deletion according to the retention policy.
5. THE system SHALL enforce configurable media download and AI-provider policies and SHALL make unsupported or policy-blocked retrieval visible to the Owner.
6. THE system SHALL treat AI-generated descriptions, tags, transcripts, and relationships as potentially incorrect and SHALL label them as generated or inferred.
7. THE system SHALL provide rate limits for authentication, capture, search, public-link access, and analysis retries.

### Requirement 14: Verification and release quality

**User Story:** As a development team, we want testable contracts and balanced ownership, so that four people can build the product in parallel without merging incompatible assumptions.

#### Acceptance Criteria

1. THE system SHALL publish versioned API schemas for authentication, capture, posts, albums, search, sharing, map data, analysis jobs, and profile operations before feature implementation begins.
2. THE system SHALL provide contract tests that verify each client adapter against the versioned API schemas.
3. THE system SHALL provide representative integration tests for OAuth, duplicate capture, media processing, semantic search, album sharing, and deletion authorization.
4. THE system SHALL provide unit tests for URL normalization, idempotency, cursor pagination, ranking/filter composition, album membership operations, public projection redaction, and responsive state transitions.
5. THE system SHALL provide property-based tests for serialization round trips, URL normalization idempotence, membership idempotence, authorization scope, cursor stability, and public/private projection separation where meaningful.
6. THE system SHALL provide accessibility checks for keyboard navigation, semantic labels, focus order, reduced motion, touch target size, and non-gesture alternatives.
7. THE system SHALL provide visual checks for the supplied palette, borders, shadows, typography roles, gallery states, album states, detail surfaces, search states, and responsive breakpoints.
8. THE system SHALL define release gates for static analysis, formatting, unit tests, contract tests, integration tests, accessibility checks, container health checks, and migration verification.
9. THE system SHALL maintain an ownership matrix showing one primary owner and one review owner for every API contract, shared type, screen, service, and test suite.
