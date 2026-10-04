# Requirements Document

## Introduction

SaveYour currently has a Flutter client with mock repositories and a Bun/Elysia backend with capture, analysis, search, media, and session-authentication endpoints. This feature replaces the mock client data path with a production-ready Flutter data layer that consumes the backend, preserves the existing archive UX, and supports the Google OAuth layer that is currently being implemented. The integration must work on mobile and Flutter web, support offline and transient failure states, and keep authentication and account data scoped to the signed-in user.

The backend remains the source of truth for captured posts, derived analysis, search results, media assets, and future album/profile resources. The Flutter app owns presentation state, secure token persistence, request cancellation/retry behavior, and local caching. Google OAuth is intentionally represented as an authentication-provider boundary so the client can adopt the final provider contract without coupling the rest of the app to an incomplete implementation.

## Glossary

- **Flutter_Client**: The Flutter application in `app/` that renders SaveYour screens and coordinates client-side state.
- **Backend_API**: The Bun/Elysia HTTP service in `backend/`, including capture, search, analysis, media, and auth routes.
- **ApiClient**: The authenticated HTTP transport adapter used by Flutter repositories.
- **Session**: A backend-issued bearer token and its associated account metadata.
- **AuthProvider**: A client abstraction that obtains identity credentials, currently with a Google OAuth implementation under development.
- **OAuth_Exchange**: The backend request that validates Google identity claims and creates a SaveYour Session.
- **Repository**: A Flutter domain-facing interface for posts, albums, profile, search, or media operations.
- **Post**: A user-owned captured social-media item and its source/analysis metadata.
- **Analysis_State**: The lifecycle state of backend processing, such as pending, complete, partial, or failed.
- **Cursor**: An opaque pagination token returned by the Backend_API.
- **Owner_Scope**: The account identity enforced by the Backend_API for every user-owned operation.
- **Mock_Repository**: The current in-memory Flutter implementation used by the prototype and tests.

## Requirements

### Requirement 1: Backend transport and configuration

**User Story:** As a Flutter developer, I want a configurable backend transport, so that the app can connect to local, staging, and production API environments without source changes.

#### Acceptance Criteria

1. THE Flutter_Client SHALL obtain the Backend_API base URL from build/runtime configuration and SHALL provide a safe development default for local execution.
2. WHEN the ApiClient sends a request, THE ApiClient SHALL set the `Accept` header and SHALL set `Content-Type: application/json` for JSON request bodies.
3. WHEN the Backend_API returns a response, THE ApiClient SHALL decode JSON success bodies and SHALL preserve HTTP status, backend error code, message, request ID, and field information in a typed client error.
4. IF the Backend_API is unreachable or a request exceeds the configured timeout, THEN THE Flutter_Client SHALL expose a recoverable network error state and SHALL preserve previously loaded data.
5. THE ApiClient SHALL support cancellation or stale-response protection so an older search response cannot overwrite a newer query result.

### Requirement 2: Google OAuth and session lifecycle

**User Story:** As a user, I want to sign in with Google, so that my saved posts are private and available across devices.

#### Acceptance Criteria

1. WHEN a user starts sign-in, THE AuthProvider SHALL request a Google credential using the platform-appropriate OAuth flow without exposing client secrets in the Flutter bundle.
2. WHEN the Google OAuth layer provides an identity result, THE Flutter_Client SHALL pass the provider result through an OAuth_Exchange adapter that can map the final provider payload to the Backend_API `/auth/google` contract.
3. WHEN the Backend_API accepts an OAuth_Exchange, THE Flutter_Client SHALL securely persist the returned Session token and account identifier, then transition the app to the authenticated state.
4. IF Google authorization is cancelled, denied, malformed, expired, or rejected by the Backend_API, THEN THE Flutter_Client SHALL show a user-actionable authentication error and SHALL preserve the signed-out state.
5. WHEN a user signs out, THE Flutter_Client SHALL call `/auth/sign-out` when a Session exists, remove the persisted token, clear user-scoped caches, and return to the signed-out state.
6. WHILE the OAuth implementation is incomplete or unavailable on a target platform, THE Flutter_Client SHALL use an injectable AuthProvider boundary and SHALL support a deterministic fake provider for development and tests.
7. WHEN a stored Session is expired or rejected with `AUTH_EXPIRED` or `AUTH_REQUIRED`, THE Flutter_Client SHALL clear invalid credentials and require sign-in before retrying protected operations.

### Requirement 3: Authenticated request ownership and privacy

**User Story:** As a user, I want every saved item and search result to be scoped to my account, so that another account cannot access my data.

#### Acceptance Criteria

1. WHEN the Session is available, THE ApiClient SHALL send it as an `Authorization: Bearer <token>` header for every protected Backend_API request.
2. THE Flutter_Client SHALL not accept an arbitrary `ownerId` from presentation state as a substitute for the authenticated Session.
3. IF a protected request returns an authorization error, THEN THE Flutter_Client SHALL route the response through the session-expiry policy and SHALL not display the response as valid user data.
4. WHEN the authenticated account changes, THE Flutter_Client SHALL invalidate all cached posts, albums, search results, profile data, and pending-operation views before loading the new account.

### Requirement 4: Capture and analysis workflow

**User Story:** As a user, I want to paste or share a social post link, so that the backend captures and analyzes it for my archive.

#### Acceptance Criteria

1. WHEN a user submits a non-empty HTTP or HTTPS URL, THE Flutter_Client SHALL send `POST /capture` with the URL and an idempotency key for retries.
2. WHEN capture succeeds with status `201` or `200`, THE Flutter_Client SHALL represent the returned post identifier, duplicate/replayed state, source status, and analysis status in the capture result.
3. WHEN capture is accepted but analysis is pending, THE Flutter_Client SHALL show the post in a pending/refreshable state without treating incomplete metadata as final.
4. IF capture returns a validation, unsupported-platform, rate-limit, or backend error, THEN THE Flutter_Client SHALL display the backend message when safe and SHALL provide retry or correction guidance.
5. WHEN the device receives a shared URL, THE Flutter_Client SHALL route the URL through the same capture service used by the in-app save flow.
6. WHEN a capture request is retried with the same idempotency key, THE Flutter_Client SHALL reconcile the response as one logical capture operation.

### Requirement 5: Posts, media, and pagination

**User Story:** As a user, I want to browse, inspect, delete, and view media for my saved posts, so that the archive remains useful after capture.

#### Acceptance Criteria

1. WHEN the home screen loads, THE Flutter_Client SHALL request `GET /captured-posts` with a bounded page size and SHALL map the response into SavedPost domain models.
2. WHEN the user reaches the end of a page, THE Flutter_Client SHALL request the next page using the returned Cursor and SHALL avoid duplicate post identifiers.
3. WHEN a user opens a post, THE Flutter_Client SHALL request `GET /captured-posts/:postId` when the cached representation is incomplete and SHALL render source, metadata, analysis state, tags, and media references when available.
4. WHEN a user deletes a post, THE Flutter_Client SHALL call `DELETE /captured-posts/:postId`, remove the post from visible cached collections after success, and preserve it with an error state after failure.
5. WHEN a post references a protected media asset, THE Flutter_Client SHALL request the asset through an authenticated media loader rather than treating the asset URL as public.
6. IF media download or retrieval fails, THEN THE Flutter_Client SHALL show an explicit unavailable-media state and SHALL preserve textual post metadata.
7. WHEN the Backend_API returns an unsupported or unknown enum value, THE Flutter_Client SHALL map it to a safe fallback and SHALL retain the raw value for diagnostics where practical.

### Requirement 6: Search and suggestions

**User Story:** As a user, I want to search and filter my archive, so that I can find saved content by text, source, tag, album, or media type.

#### Acceptance Criteria

1. WHEN a user submits a search query or filter change, THE Flutter_Client SHALL call `GET /v1/search/` with the current query, filters, cursor, and bounded limit.
2. WHEN search results arrive, THE Flutter_Client SHALL display result items, total/result metadata supplied by the Backend_API, and the next Cursor when present.
3. WHEN a user requests suggestions, THE Flutter_Client SHALL call `GET /v1/search/suggestions` and SHALL display suggestions only for the active query.
4. IF search or suggestion requests fail, THEN THE Flutter_Client SHALL preserve the last successful result set and SHALL expose a retry action.
5. WHEN the active query or filters change, THE Flutter_Client SHALL reset pagination and SHALL discard stale in-flight results.
6. THE Flutter_Client SHALL encode query and filter values using URI-safe encoding and SHALL omit empty optional filters.

### Requirement 7: Albums and profile integration boundary

**User Story:** As a user, I want albums and profile actions to use the same backend-backed architecture, so that the existing Flutter surfaces can migrate incrementally as corresponding backend endpoints become available.

#### Acceptance Criteria

1. THE Flutter_Client SHALL keep AlbumRepository and ProfileRepository as domain interfaces independent of HTTP implementation details.
2. WHEN backend album or profile endpoints are unavailable, THE Flutter_Client SHALL show an explicit unavailable/coming-soon state or use the configured development adapter without silently presenting stale production data.
3. WHEN album/profile endpoints are added, THE ApiClient SHALL support authenticated repository implementations without changing screen widgets or domain interfaces.
4. WHEN a user logs out or the Session expires, THE Flutter_Client SHALL clear album and profile state together with post state.

### Requirement 8: Loading, offline, and recovery states

**User Story:** As a user, I want the app to remain understandable during slow, offline, or failed operations, so that I know whether my archive is safe and what to do next.

#### Acceptance Criteria

1. WHILE an initial request is pending, THE Flutter_Client SHALL show a loading state that does not present mock data as backend data.
2. WHILE a refresh request is pending and cached data exists, THE Flutter_Client SHALL preserve the cached data and SHALL indicate refreshing status.
3. IF a request fails while cached data exists, THEN THE Flutter_Client SHALL preserve cached data, identify the failed operation, and provide retry.
4. IF a request fails without cached data, THEN THE Flutter_Client SHALL show an empty/error state that distinguishes “no results” from “could not load.”
5. WHEN a queued capture or analysis operation later changes state, THE Flutter_Client SHALL refresh or reconcile the affected post without resetting unrelated navigation state.

### Requirement 9: Compatibility, observability, and maintainability

**User Story:** As a developer, I want a stable integration contract and diagnostics, so that backend and Flutter changes can be released independently.

#### Acceptance Criteria

1. THE Backend_API SHALL publish an OpenAPI description or equivalent machine-readable contract for the endpoints consumed by Flutter.
2. THE Flutter_Client SHALL centralize endpoint paths, JSON mapping, authentication headers, timeout policy, and error mapping in testable services.
3. WHEN a request fails, THE Flutter_Client SHALL include a redacted operation name, endpoint category, status, backend error code, and request ID in debug diagnostics without logging bearer tokens or OAuth credentials.
4. THE Flutter_Client SHALL retain Mock_Repository implementations for widget tests and SHALL provide fake transport/auth implementations for repository and session tests.
5. WHEN the Backend_API contract changes incompatibly, THE integration test suite SHALL identify the mismatch before release.
6. THE Flutter_Client SHALL use the existing neobrutalist loading, empty, offline, partial, failure, and retry visual conventions defined in `DESIGN.md`.
