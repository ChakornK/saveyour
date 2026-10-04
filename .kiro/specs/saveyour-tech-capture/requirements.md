# Requirements Document

## Introduction

This specification defines the capture foundation for saveyour.tech. The feature lets an authenticated person submit a supported social-media URL, preserve the source post as an owner-scoped record, retrieve eligible media safely, and expose stable status to the client while downstream analysis runs asynchronously. The feature covers authentication boundaries, URL normalization, capture idempotency, Saved_Post persistence, media storage, provider retrieval, and protected API operations. It does not implement AI analysis; it publishes the contracts that analysis consumes.

## Glossary

- **Account**: An authenticated saveyour.tech identity linked to a verified Google subject.
- **Canonical_Post_URL**: The normalized URL used to identify a source post within an Owner_Scope.
- **Capture_Request**: A request containing a social-media URL and optional idempotency key.
- **Capture_Service**: The service that validates, normalizes, persists, and acknowledges Capture_Requests.
- **Media_Asset**: An owner-scoped image, video, audio object, or derived file associated with a Saved_Post.
- **MediaStore**: The storage boundary that validates and stores Media_Assets in SeaweedFS.
- **Owner_Scope**: The authenticated account identity applied to every protected operation.
- **Saved_Post**: An owner-scoped record containing a source URL, source metadata, capture state, analysis state, and Media_Asset references.
- **Source_Adapter**: An allowlisted provider-specific boundary for classifying and resolving supported social-media URLs.
- **Session**: A revocable credential representing an authenticated Account.
- **Supported_Platform**: Instagram, Reddit, TikTok, Facebook, or X URL forms accepted by the Capture_Service.

## Requirements

### Requirement 1: Authenticate owners

**User Story:** As a user, I want secure Google sign-in, so that captured posts remain private across devices.

#### Acceptance Criteria

1. WHEN Google authorization succeeds, THE Authentication_Service SHALL verify the issuer, audience, nonce, subject, email, and expiry before creating a Session.
2. WHEN a verified authorization is received, THE Authentication_Service SHALL upsert one Account by Google subject and issue a Session associated with that Account.
3. WHEN a Session expires or is revoked, THE API SHALL return a machine-readable authentication error for every protected request using that Session.
4. IF Google authorization fails or is cancelled, THEN THE Authentication_Service SHALL return a safe recoverable error and create no Session.
5. THE API SHALL enforce Owner_Scope on every protected Saved_Post, Media_Asset, album, analysis, and profile request.
6. WHEN a user signs out, THE Authentication_Service SHALL revoke the Session and reject later protected requests using that Session.

### Requirement 2: Normalize and validate capture URLs

**User Story:** As a user browsing social platforms, I want to submit a link once, so that saveyour.tech preserves the intended post without accidental duplicates.

#### Acceptance Criteria

1. WHEN a Capture_Request contains a valid URL, THE Capture_Service SHALL normalize the URL into one Canonical_Post_URL.
2. THE Capture_Service SHALL classify approved URL forms for Instagram, Reddit, TikTok, Facebook, and X as Supported_Platform values.
3. IF a Capture_Request contains a malformed URL, THEN THE Capture_Service SHALL return field-level validation details and create no Saved_Post.
4. IF a Capture_Request targets an unsupported platform, THEN THE Capture_Service SHALL return a supported-platform explanation and create no Saved_Post.
5. IF a Capture_Request targets a local, private, loopback, link-local, or otherwise disallowed network destination, THEN THE Capture_Service SHALL reject the request with a safe validation error.
6. FOR ALL successfully normalized URLs, normalizing the resulting Canonical_Post_URL SHALL produce the same Canonical_Post_URL.

### Requirement 3: Capture posts idempotently

**User Story:** As a user, I want retries from a share sheet or web form to be safe, so that one post does not become multiple saved records.

#### Acceptance Criteria

1. WHEN a Capture_Request is accepted, THE Capture_Service SHALL persist one Saved_Post containing Owner_Scope, Canonical_Post_URL, platform, capture time, source status, and analysis status.
2. WHEN the same Owner_Scope submits the same Canonical_Post_URL repeatedly, THE Capture_Service SHALL return one active Saved_Post and identify the request as a duplicate.
3. WHEN a Capture_Request includes an idempotency key, THE Capture_Service SHALL return the original result for repeated requests with the same Owner_Scope and key.
4. WHEN capture succeeds, THE API SHALL return the post identifier, source status, and analysis status within the configured acknowledgement budget without waiting for full analysis.
5. IF source retrieval is blocked or unavailable, THEN the Capture_Service SHALL preserve the Canonical_Post_URL and available metadata while marking the source and media limitations.
6. WHEN a capture is accepted, THE Capture_Service SHALL publish a versioned analysis-work item after the Saved_Post is durable.

### Requirement 4: Persist and manage Saved_Post records

**User Story:** As a user, I want captured posts available in my private library, so that I can inspect and organize them later.

#### Acceptance Criteria

1. THE API SHALL persist Owner_Scope, Canonical_Post_URL, platform, source metadata, capture time, analysis status, media references, and deletion state for every Saved_Post.
2. WHEN an authenticated owner lists posts, THE API SHALL return only authorized active Saved_Post records using cursor pagination ordered by capture time and stable post identifier.
3. WHEN an authenticated owner requests a post, THE API SHALL return an authorized detail projection containing source and analysis state.
4. WHEN an authenticated owner deletes a post, THE API SHALL mark the Saved_Post as deleted and exclude the record from ordinary list, detail, and search projections.
5. WHEN deletion is repeated for the same Saved_Post, THE API SHALL return an idempotent result without changing unrelated records.
6. THE persistence layer SHALL provide indexes supporting owner and canonical URL uniqueness, owner and capture ordering, analysis status, platform, and deletion state.

### Requirement 5: Store and authorize media

**User Story:** As a user, I want permitted media preserved in the cloud, so that the context of a saved post remains useful.

#### Acceptance Criteria

1. WHEN an eligible Media_Asset is received, THE MediaStore SHALL validate the MIME type, byte size, checksum, and Owner_Scope metadata before storage.
2. WHEN a Media_Asset passes validation, THE MediaStore SHALL store the object in SeaweedFS and return an opaque asset reference.
3. WHEN an authorized client requests a Media_Asset, THE API SHALL return a short-lived authorized URL or authenticated stream for the owning Account.
4. THE API SHALL protect object-store credentials and unrestricted object keys from client responses.
5. WHERE owner-scoped content deduplication is enabled, THE MediaStore SHALL avoid storing identical content more than once for the same Owner_Scope.
6. IF a Media_Asset exceeds configured limits or has a disallowed type, THEN THE MediaStore SHALL mark the asset unavailable with a machine-readable reason.
7. IF source media retrieval fails, THEN the API SHALL preserve the source URL and continue independent eligible capture processing.
8. WHEN a Saved_Post or Account is deleted, THE MediaStore SHALL enqueue asynchronous cleanup for associated Media_Assets.

### Requirement 6: Provide safe source retrieval

**User Story:** As an operator, I want provider retrieval bounded and allowlisted, so that capturing public links does not become an SSRF or resource-exhaustion vector.

#### Acceptance Criteria

1. THE Source_Adapter registry SHALL allow outbound retrieval only for approved Supported_Platform hosts and URL forms.
2. WHEN a Source_Adapter follows a redirect, THE Source_Adapter SHALL validate every redirect target against the approved host and network policy.
3. THE Source_Adapter SHALL enforce configured connection, response, redirect-count, byte-size, and decompression limits for every retrieval.
4. IF a retrieval violates a host, redirect, timeout, size, or content policy, THEN THE Capture_Service SHALL record a bounded failure reason without exposing private response data.
5. WHEN a retrieval returns usable source metadata but no eligible media, THE Capture_Service SHALL preserve the metadata and mark media availability accordingly.

### Requirement 7: Expose predictable protected APIs

**User Story:** As an operator, I want stable and diagnosable APIs, so that the self-hosted service can be operated safely.

#### Acceptance Criteria

1. THE API SHALL publish OpenAPI contracts for authentication, capture, Saved_Post listing and detail, media authorization, deletion, health, and metrics.
2. THE API SHALL return a request identifier and stable problem details for every failed request.
3. THE API SHALL apply configurable rate limits to authentication, capture, media authorization, and deletion operations.
4. THE API SHALL emit structured logs containing safe operational fields without Sessions, credentials, signed media URLs, or private source data.
5. THE API SHALL provide repeatable MongoDB index initialization and health reporting for required dependencies.
6. WHEN a transient provider or storage dependency fails, THE API SHALL expose a retryable state without losing the durable Saved_Post identity.

### Requirement 8: Publish cross-workstream contracts

**User Story:** As a client or analysis-workstream developer, I want versioned capture contracts and representative fixtures, so that integrations remain compatible.

#### Acceptance Criteria

1. THE Capture_Service SHALL publish versioned DTOs for Account, Session state, Saved_Post, Media_Asset, problem details, and analysis-work items.
2. THE Capture_Service SHALL publish representative fixtures for successful capture, duplicate capture, blocked retrieval, unavailable media, authorization failure, and deletion.
3. WHEN a contract changes incompatibly, THE Capture_Service SHALL publish a new contract version and preserve the prior version for the configured compatibility period.
4. THE API SHALL provide contract tests that verify documented request, response, error, and authorization behavior.
