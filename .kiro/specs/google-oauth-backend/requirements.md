# Requirements Document

## Introduction

This feature adds production-ready Google OAuth authentication to the backend and defines a stable contract that a Flutter client can use to sign users in, establish backend sessions, access the current account, and sign out. The backend will validate Google identity tokens rather than trusting claims supplied by the client, associate accounts with stable Google subject identifiers, and issue revocable backend session credentials.

## Glossary

- **Auth_API**: The backend HTTP endpoints that exchange Google credentials for a backend session and manage that session.
- **Flutter_Client**: The mobile application that obtains a Google identity token through the Google Sign-In SDK and calls the Auth_API.
- **Google_ID_Token**: A signed OpenID Connect JWT issued by Google for the configured backend client audience.
- **Google_Subject**: The stable Google OpenID Connect `sub` identifier for an account.
- **Backend_Session**: A backend-issued bearer credential representing an authenticated account.
- **Account**: The backend record linked to one Google_Subject and containing the normalized email and timestamps.
- **Session_Store**: The persistence layer for account and Backend_Session records.
- **Nonce**: A server-generated, single-use value that binds an OAuth login attempt to the resulting Google_ID_Token.
- **Flutter_Auth_Contract**: The documented request, response, error, and bearer-token contract consumed by the Flutter_Client.

## Requirements

### Requirement 1

**User Story:** As a Flutter user, I want to authenticate with my Google account, so that I can use authenticated backend features without creating a separate password.

#### Acceptance Criteria

1. WHEN the Flutter_Client submits a valid Google_ID_Token to the Auth_API, THE Auth_API SHALL validate the token signature and claims against the configured Google issuer, client audience, expiration, and required subject and email claims.
2. WHEN Google_ID_Token validation succeeds, THE Auth_API SHALL create or retrieve exactly one Account using Google_Subject as the provider identity key.
3. WHEN Google_ID_Token validation succeeds, THE Auth_API SHALL issue a Backend_Session with an expiration configured by the server.
4. WHEN the Auth_API creates an Account, THE Auth_API SHALL return the Account identifier, normalized email, provider identifier, creation timestamp, and Backend_Session credential in the Flutter_Auth_Contract.
5. THE Auth_API SHALL expose the Flutter_Auth_Contract through OpenAPI documentation, including successful responses and authentication error responses.

### Requirement 2

**User Story:** As a backend operator, I want Google tokens verified by the backend, so that clients cannot forge authenticated identities.

#### Acceptance Criteria

1. THE Auth_API SHALL obtain Google signing keys through a Google-supported key-discovery mechanism and SHALL cache keys according to the provider's cache metadata.
2. IF a Google_ID_Token has an invalid signature, THEN THE Auth_API SHALL reject the request with a stable authentication error code and SHALL not create or update an Account or Backend_Session.
3. IF a Google_ID_Token has an issuer, audience, nonce, subject, email, or expiration claim that fails configured validation, THEN THE Auth_API SHALL reject the request with a stable authentication error code and SHALL not create or update an Account or Backend_Session.
4. IF Google key discovery or token verification is unavailable, THEN THE Auth_API SHALL return a service-unavailable authentication error without accepting the Google_ID_Token.
5. THE Auth_API SHALL avoid returning Google_ID_Token values, signing keys, or other token-verification secrets in response bodies or application logs.

### Requirement 3

**User Story:** As a Flutter user, I want to reuse a backend session for API calls, so that the Flutter_Client can access protected features after login.

#### Acceptance Criteria

1. WHEN the Flutter_Client sends a valid Backend_Session in an HTTP Bearer authorization header, THE Auth_API SHALL authenticate the associated Account.
2. WHEN a protected backend endpoint receives an authenticated request, THE backend SHALL expose the authenticated Account owner identifier to authorization-aware services.
3. IF a Backend_Session is missing, expired, revoked, malformed, or unknown, THEN THE backend SHALL reject the protected request with HTTP 401 and a stable authentication error code.
4. THE backend SHALL store only a non-reversible representation of each Backend_Session credential in the Session_Store.
5. WHEN a Backend_Session expires, THE backend SHALL prevent that Backend_Session from authenticating further requests.

### Requirement 4

**User Story:** As a Flutter user, I want to sign out, so that my current backend session can no longer be used.

#### Acceptance Criteria

1. WHEN the Flutter_Client submits a valid Backend_Session to the sign-out endpoint, THE Auth_API SHALL revoke that Backend_Session.
2. WHEN a revoked Backend_Session is submitted to a protected endpoint, THE backend SHALL reject the request with HTTP 401.
3. WHEN the Flutter_Client submits an absent or already revoked Backend_Session to the sign-out endpoint, THE Auth_API SHALL return an idempotent success response.
4. WHEN the Flutter_Client signs in again with the same Google_Subject, THE Auth_API SHALL reuse the existing Account rather than create a duplicate Account.

### Requirement 5

**User Story:** As a Flutter developer, I want a predictable authentication contract, so that the mobile client can implement login, loading, failure, and logout states consistently.

#### Acceptance Criteria

1. THE Flutter_Auth_Contract SHALL define the Google sign-in exchange endpoint, HTTP method, request JSON field, success JSON fields, bearer-token format, sign-out endpoint, and error response schema.
2. WHEN the Flutter_Client submits malformed JSON or omits the required Google_ID_Token, THE Auth_API SHALL return HTTP 400 with a machine-readable validation error.
3. WHEN the Flutter_Client submits a rejected Google_ID_Token, THE Auth_API SHALL return HTTP 401 with a machine-readable authentication error.
4. WHEN the Flutter_Client submits a valid Google_ID_Token more than once, THE Auth_API SHALL return a usable Backend_Session for the same Account on each successful exchange.
5. THE backend SHALL allow the Flutter_Client origin only when that origin is configured in the backend CORS policy.

### Requirement 6

**User Story:** As a system administrator, I want OAuth behavior controlled by deployment configuration, so that development, staging, and production can use different Google clients and security policies.

#### Acceptance Criteria

1. THE Auth_API SHALL require a configured Google client identifier before enabling Google token exchange in a deployment environment that uses Google OAuth.
2. THE Auth_API SHALL obtain session lifetime, Google issuer, accepted audience, and key-discovery configuration from server-side configuration rather than request data.
3. IF required Google OAuth configuration is missing in production, THEN THE backend SHALL fail startup with a descriptive configuration error.
4. THE backend SHALL provide an environment template documenting the Google OAuth and Flutter integration configuration values without containing live credentials.
5. WHERE development mode is enabled, THE backend SHALL provide a testable authentication configuration that does not weaken production token validation rules.
