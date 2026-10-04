# Implementation Plan: Google OAuth Backend

## Overview

Implement server-verified Google OAuth for the Bun/Elysia backend, persist accounts and sessions through repository abstractions, preserve bearer authentication for protected APIs, and document a stable contract for the Flutter client.

## Tasks

- [ ] 1. Define OAuth configuration, contracts, and repository interfaces
  - Extend `AppConfig` with Google issuer, client ID, discovery/JWKS settings, and production validation.
  - Define verified Google identity, Account, SessionRecord, and auth response/error schemas.
  - Define `AccountRepository`, `SessionRepository`, and `GoogleTokenVerifier` interfaces.
  - _Requirements: 1.5, 5.1, 6.1, 6.2, 6.3_

- [ ] 2. Implement Google token verification
  - [ ] 2.1 Implement discovery/JWKS retrieval and cache handling
    - Use provider cache metadata and bounded request timeouts.
    - Map provider failures to `AUTH_PROVIDER_UNAVAILABLE`.
    - _Requirements: 2.1, 2.4_

  - [ ] 2.2 Implement signature and claim validation
    - Validate signature, issuer, audience, expiry, subject, email, and optional nonce.
    - Ensure request-provided claims cannot override server configuration.
    - _Requirements: 1.1, 2.2, 2.3_

  - [ ]* 2.3 Write verifier unit tests
    - Cover valid tokens, invalid signatures, wrong issuer/audience, expired tokens, missing claims, and provider outage.
    - _Requirements: 1.1, 2.2, 2.3, 2.4_

- [ ] 3. Implement account and session persistence
  - [ ] 3.1 Implement in-memory repositories for tests and development
    - Enforce one Account per Google subject.
    - Store only session token hashes.
    - _Requirements: 1.2, 3.4, 4.4_

  - [ ] 3.2 Implement MongoDB repositories and indexes
    - Add unique provider-subject account index.
    - Add session token-hash index and expiry support.
    - Wire index initialization into application startup.
    - _Requirements: 1.2, 3.4, 3.5, 6.2_

  - [ ]* 3.3 Write repository tests
    - Test account reuse, session lookup, expiry, revocation, uniqueness, and idempotent revocation.
    - _Requirements: 1.2, 3.5, 4.1, 4.2, 4.3_

- [ ] 4. Update AuthService
  - [ ] 4.1 Replace client-claims sign-in with verifier-backed sign-in
    - Create/retrieve accounts from verified Google identities.
    - Issue random backend tokens and store only hashes.
    - Return account and expiration metadata.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.5, 3.4, 4.4_

  - [ ] 4.2 Implement repository-backed authentication and revocation
    - Reject missing, unknown, expired, and revoked sessions.
    - Preserve owner-scope behavior used by protected routes.
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3_

  - [ ]* 4.3 Write AuthService tests
    - Include repeated sign-in account identity preservation and session lifecycle cases.
    - **Property 1: Repeated sign-in preserves account identity**
    - **Validates: Requirements 1.2, 4.4**
    - _Requirements: 1.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Implement and document HTTP auth routes
  - [ ] 5.1 Update `/auth/google` request and response schemas
    - Accept only `{ idToken }`.
    - Return documented account, backend token, and expiration fields.
    - Remove client-controlled issuer/audience/nonce/claims inputs.
    - _Requirements: 1.4, 1.5, 2.2, 5.1, 5.2, 5.3_

  - [ ] 5.2 Add `/auth/me` and make sign-out idempotent
    - Return the current account for a valid bearer token.
    - Revoke valid sessions and return success for absent/already revoked sessions.
    - _Requirements: 3.1, 4.1, 4.3_

  - [ ] 5.3 Standardize authentication errors and OpenAPI documentation
    - Use stable codes and status mapping for validation, authentication, and provider errors.
    - _Requirements: 1.5, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_

  - [ ]* 5.4 Write route integration tests
    - Exercise sign-in, current-account, protected endpoint, invalid token, provider outage, and sign-out flows.
    - _Requirements: 1.1, 1.3, 3.1, 3.3, 4.1, 4.2, 4.3, 5.2, 5.3_

- [ ] 6. Integrate authentication into application wiring
  - Replace static-token-only middleware behavior with AuthService-backed bearer authentication.
  - Pass configured repositories and verifier into `createApp`.
  - Preserve explicit development compatibility behavior without weakening production validation.
  - Initialize MongoDB account/session indexes.
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.3, 6.5_

- [ ] 7. Prepare Flutter integration documentation and configuration
  - Update `.env.example` with non-secret Google OAuth values and explain required production settings.
  - Document Flutter Google Sign-In flow, token exchange, secure token storage, bearer usage, expiry handling, and logout.
  - Configure exact allowed Flutter origins through CORS documentation.
  - _Requirements: 5.1, 5.5, 6.4_

- [ ] 8. Checkpoint - Run backend verification
  - Run typecheck and the complete backend test suite.
  - Verify OpenAPI generation and configuration validation.
  - Resolve all failures before proceeding.
  - _Requirements: 1.5, 2.2, 3.3, 5.1, 6.3_

- [ ] 9. Final checkpoint - Validate integration readiness
  - Confirm Flutter contract examples match route schemas.
  - Confirm no token or signing key values appear in logs or responses.
  - Confirm production configuration and database indexes are documented.
  - _Requirements: 2.5, 5.1, 5.5, 6.2, 6.4_

## Notes

- Tasks marked with `*` are optional test-focused subtasks and can be skipped for a faster MVP, although authentication tests are strongly recommended.
- Each task references specific requirements for traceability.
- Google token verification and MongoDB persistence should be injected behind interfaces so external dependencies can be mocked in unit tests.
- Property 1 is implemented as a deterministic repeated-sign-in test unless the project adopts a property-testing library.
