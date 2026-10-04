# Requirements Document

## Introduction

The Complete Platform Rewrite shall replace fragmented identity handling and incomplete integration with one authenticated owner-scoped contract. The rewrite covers backend and Flutter workflows for sessions, capture, archive, search, suggestions, profile, albums, membership, post deletion, media access, persistence, development seed data, and explicit failure recovery. Cortex ingestion and analysis execution are deferred; capture and honest analysis-status persistence remain required.

## Glossary

- **Platform**: Backend API, persistence adapters, and Flutter client.
- **Authenticated Session**: A non-expired, non-revoked bearer session issued by the Platform.
- **Owner Context**: The account identity derived by the backend from an Authenticated Session.
- **Saved Post**: An active or deleted owner-scoped captured social-media record.
- **Album**: An owner-scoped named collection of Saved Posts.
- **Seed Dataset**: Deterministic development records used for local and integration verification.
- **Analysis Boundary**: The status interface representing analysis without requiring Cortex execution.

## Requirements

### Requirement 1: Unified authentication and owner scope

**User Story:** As a signed-in user, I want every feature to use my authenticated account automatically, so that I never encounter owner-identity errors or cross-account data.

#### Acceptance Criteria

1. WHEN a protected request includes a valid Authenticated Session, THE Platform SHALL derive one Owner Context from that session before invoking a protected operation.
2. IF a protected request has no valid, unexpired, non-revoked Authenticated Session, THEN THE Platform SHALL return an authentication error and SHALL not execute the requested operation.
3. THE Platform SHALL apply the Owner Context to every Saved Post, Album, Profile, Search, Suggestion, and Media read or mutation and SHALL omit internal owner identifiers from public response bodies.
4. IF a request contains a client-provided owner identity, THEN THE Platform SHALL ignore that identity for authorization and use the Owner Context.
5. WHEN a session restoration call receives an authentication error, THE Flutter Client SHALL clear secure local session data and show the sign-in surface.
6. WHEN sign-out is requested, THE Platform SHALL revoke the session if present and THE Flutter Client SHALL clear local session data even if revocation fails.

### Requirement 2: Capture and archive

**User Story:** As a signed-in user, I want to save and browse links, so that my archive works without Cortex availability.

#### Acceptance Criteria

1. WHEN a valid absolute HTTP or HTTPS link of at most 2048 characters is submitted, THE Platform SHALL create or return an owner-scoped Saved Post and capture receipt within 20 seconds.
2. WHEN the same owner submits the same canonical link again, THE Platform SHALL return the existing active Saved Post without creating a second active record.
3. WHILE source retrieval or analysis is pending, THE Platform SHALL preserve the Saved Post and expose an Analysis Boundary status of `pending`, `partial`, `complete`, or `failed`.
4. IF source retrieval fails, THEN THE Platform SHALL preserve the capture record with a failure status and THE Flutter Client SHALL preserve the URL and expose retry.
5. WHEN the archive is requested with a page limit from 1 through 100, THE Platform SHALL return only active Saved Posts belonging to the Owner Context and a continuation cursor when more records exist.
6. IF an active Saved Post is deleted, THEN THE Platform SHALL make it absent from subsequent archive and album results for that owner and return a successful deletion result.
7. IF a capture request is invalid, THEN THE Platform SHALL return a validation error without creating a record and THE Flutter Client SHALL preserve the submitted URL.

### Requirement 3: Search and suggestions

**User Story:** As a signed-in user, I want to search my saved posts, so that I can retrieve information without browsing everything.

#### Acceptance Criteria

1. WHEN a search query and optional filters are submitted, THE Platform SHALL return only matching Saved Posts belonging to the Owner Context.
2. WHEN a search request includes a page limit from 1 through 100, THE Platform SHALL return a bounded result envelope and continuation cursor behavior consistent with archive listing.
3. WHEN search has no matches, THE Flutter Client SHALL show a no-results state with clear query or filter recovery actions.
4. IF the search service is unavailable, THEN THE Platform SHALL return a bounded service error and THE Flutter Client SHALL preserve the query and offer retry.
5. WHEN a tag suggestion query from 0 through 100 characters is submitted, THE Platform SHALL return at most 50 owner-scoped suggestions.

### Requirement 4: Albums and membership

**User Story:** As a signed-in user, I want to create and manage albums, so that I can organize saved posts reliably.

#### Acceptance Criteria

1. WHEN an album name from 1 through 120 characters after trimming is submitted, THE Platform SHALL create one private Album for the Owner Context.
2. IF an owner already has an album with the same case-insensitive name, THEN THE Platform SHALL reject the new album and preserve the existing album.
3. WHEN an album is renamed with a valid unique name, THE Platform SHALL update its timestamp and return the updated album summary.
4. WHEN an album is requested, THE Platform SHALL return its summary and only active Saved Posts belonging to the Owner Context.
5. WHEN a post is added to an album, THE Platform SHALL require both resources to belong to the Owner Context and SHALL make membership idempotent.
6. WHEN a post is removed from an album, THE Platform SHALL make membership absent and SHALL make repeated removal produce the same final state.
7. IF an album or post is not owned by the Owner Context, THEN THE Platform SHALL return a not-found response without revealing ownership.
8. WHEN album data is loading, empty, successful, or failed, THE Flutter Client SHALL show the corresponding state with a retry or next action.
9. WHEN an album mutation succeeds, THE Flutter Client SHALL update the affected album from returned server state before showing completion feedback.

### Requirement 5: Profile and account controls

**User Story:** As a signed-in user, I want my profile and session controls to reflect the backend, so that account state is trustworthy.

#### Acceptance Criteria

1. WHEN the profile is requested, THE Platform SHALL return identity and active Saved Post, Album, source, and tag counts scoped to the Owner Context.
2. WHEN the Flutter Client loads profile data, THE Flutter Client SHALL show loading, success, failure, and retry states.
3. WHEN sign-out is requested, THE Platform SHALL revoke the session and THE Flutter Client SHALL clear secure local session data.
4. THE Platform SHALL omit session tokens, token hashes, and private owner identifiers from profile, post, album, search, and error responses.

### Requirement 6: Persistence and seed data

**User Story:** As a developer or evaluator, I want predictable data and persistence, so that the complete app can be exercised immediately.

#### Acceptance Criteria

1. WHEN development seed mode is enabled, THE Platform SHALL create one deterministic account fixture, one usable development session fixture, at least five Saved Posts, and at least three Albums with memberships.
2. WHEN development seed mode is run repeatedly, THE Platform SHALL preserve one logical fixture set without duplicate fixture accounts, sessions, posts, or albums.
3. IF production mode is enabled, THEN THE Platform SHALL reject development seed execution before writing records.
4. WHEN MongoDB is configured, THE Platform SHALL persist owner-scoped accounts, sessions, posts, albums, and memberships across process restarts.
5. WHEN in-memory mode is configured, THE Platform SHALL expose the same seed data shape and API behavior used by integration tests.

### Requirement 7: Flutter/API contract

**User Story:** As a user, I want client actions to reflect server results, so that the UI never reports false success or loses my input.

#### Acceptance Criteria

1. THE Flutter API Client SHALL attach the Authenticated Session bearer token to every protected request and SHALL not select an owner through request data.
2. THE Flutter API Client SHALL enforce a 20-second timeout for every network operation and SHALL normalize list and object response envelopes.
3. IF an API call fails, THEN THE Flutter Client SHALL show an actionable error, preserve relevant input, and provide retry when retry is safe.
4. WHEN a mutation succeeds, THE Flutter Client SHALL refresh or replace the affected surface from returned server state.
5. THE Flutter Client SHALL represent Analysis Boundary statuses without claiming Cortex execution when Cortex is unavailable.
6. THE Flutter Client SHALL use Sora and the neobrutalist design system for every product surface, including navigation, dialogs, buttons, fields, chips, loading states, and errors.

### Requirement 8: Verification and release quality

**User Story:** As a maintainer, I want evidence that the rewrite works end to end, so that release confidence is based on executable proof.

#### Acceptance Criteria

1. THE Backend SHALL pass formatting checks, TypeScript typecheck, unit tests, and authenticated API integration tests.
2. THE Flutter Client SHALL pass formatting checks, analyzer, widget tests, and debug APK build.
3. THE end-to-end suite SHALL exercise authenticated capture, archive, search, suggestions, profile, album CRUD, membership, deletion, media access, and sign-out.
4. THE release report SHALL distinguish unavailable Cortex or external infrastructure from failures in completed functionality.
5. THE repository SHALL contain no uncommitted implementation changes at the release checkpoint.
