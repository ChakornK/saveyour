# Requirements Document

## Introduction

This specification covers authentication, social-link capture, Saved_Post persistence, source adapters, media retrieval, SeaweedFS storage, and the protected API boundary for saveyour.tech. The workstream owns `server/api` capture/posts/auth modules and media-storage ports. It publishes stable contracts and fixtures for the client and analysis workstreams.

## Glossary

- **Capture_Request**: A request to save a social-media URL.
- **Canonical_Post_URL**: Normalized URL used as the post identity within an Owner scope.
- **Saved_Post**: Owner-owned source post record.
- **Source_Adapter**: Provider-specific URL resolution boundary.
- **Media_Asset**: Stored image, video, frame, audio, or derivative.
- **Owner_Scope**: Authenticated account scope applied to every protected operation.
- **MediaStore**: SeaweedFS-backed storage abstraction.

## Requirements

### Requirement 1: Authentication

**User Story:** As a user, I want secure Google sign-in, so that my posts remain private across devices.

#### Acceptance Criteria

1. WHEN Google authorization succeeds, THE Authentication_Service SHALL verify issuer, audience, nonce, subject, email, and expiry.
2. WHEN a verified authorization is received, THE Authentication_Service SHALL upsert one Account by provider subject and issue a session.
3. WHEN a session expires or is revoked, THE API SHALL return a machine-readable authentication error.
4. IF authorization fails or is cancelled, THEN THE API SHALL return a safe recoverable error without creating a session.
5. THE API SHALL enforce Owner_Scope on every protected post, media, album, analysis, and profile request.
6. WHEN a user signs out, THE Authentication_Service SHALL revoke the session and prevent further protected requests with it.

### Requirement 2: URL normalization and capture

**User Story:** As a user browsing social platforms, I want to submit a link once, so that saveyour.tech preserves it without duplicates.

#### Acceptance Criteria

1. WHEN a URL is submitted, THE Capture_Service SHALL normalize it into a Canonical_Post_URL.
2. THE Capture_Service SHALL classify approved Instagram, Reddit, TikTok, Facebook, and X URL forms.
3. WHEN the same Owner submits the same Canonical_Post_URL repeatedly, THE Capture_Service SHALL return one active Saved_Post and a duplicate indicator.
4. IF the URL is malformed, THEN THE Capture_Service SHALL return field-level validation and create no Saved_Post.
5. IF the URL targets an unsupported provider, THEN THE Capture_Service SHALL return a supported-platform explanation and create no Saved_Post.
6. WHEN capture succeeds, THE API SHALL return post ID, source status, and analysis status within the configured acknowledgement budget.
7. IF retrieval is blocked, THEN THE Capture_Service SHALL preserve the Canonical_Post_URL and available metadata while marking media/source limitations.
8. THE Capture_Service SHALL support idempotency keys for retry-safe requests.

### Requirement 3: Saved_Post persistence

**User Story:** As a user, I want my captured posts available in my private library, so that later processing and retrieval have an authoritative source.

#### Acceptance Criteria

1. THE API SHALL persist Owner, canonical URL, platform, source metadata, capture time, analysis status, media references, and deletion state.
2. WHEN posts are listed, THE API SHALL return Owner-authorized active posts using cursor pagination ordered by capture time and stable ID.
3. WHEN a post is requested, THE API SHALL return an authorized detail projection with source and analysis state.
4. WHEN a post is deleted, THE API SHALL soft-delete it and exclude it from ordinary list/detail/search projections.
5. WHEN deletion is repeated, THE API SHALL return an idempotent result without changing unrelated posts or memberships.
6. THE API SHALL provide indexes for Owner/canonical URL, Owner/capture time, analysis status, platform, and deletion state.

### Requirement 4: Media storage and retrieval

**User Story:** As a user, I want permitted media preserved in the cloud, so that saved context remains useful.

#### Acceptance Criteria

1. WHEN an eligible asset is retrieved, THE MediaStore SHALL validate type, size, checksum, and Owner metadata before storage.
2. THE MediaStore SHALL store assets in SeaweedFS and return an opaque asset reference.
3. WHEN an authorized client requests an asset, THE API SHALL return a short-lived authorized URL or authenticated stream.
4. THE API SHALL never expose object-store credentials or unrestricted object keys.
5. WHEN identical content is stored for the same Owner, THE MediaStore SHALL avoid duplicate physical storage where configured.
6. IF media exceeds configured limits or has an invalid type, THEN THE MediaStore SHALL mark it unavailable with a reason.
7. IF source retrieval fails, THEN the API SHALL preserve source URL and continue other eligible processing.
8. THE MediaStore SHALL support asynchronous cleanup after post/account deletion.

### Requirement 5: API safety and operations

**User Story:** As an operator, I want predictable protected APIs, so that the self-hosted service is diagnosable and safe.

#### Acceptance Criteria

1. THE API SHALL expose OpenAPI contracts for authentication, capture, posts, media authorization, deletion, health, and metrics.
2. THE API SHALL return request IDs and stable problem details.
3. THE API SHALL rate-limit authentication, capture, media retrieval, and deletion operations.
4. THE API SHALL reject SSRF targets, unsafe redirects, invalid hosts, excessive downloads, and unbounded timeouts.
5. THE API SHALL log structured safe fields without tokens, private media URLs, or private source data.
6. THE API SHALL provide repeatable MongoDB indexes and initialization procedures.
