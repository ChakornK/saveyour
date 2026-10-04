# Implementation Plan: Frontend-Backend Integration

## Overview

Implement the end-to-end MVP by first inventorying and formalizing the existing backend routes, then refactoring the Flutter integration boundary around typed models, session management, and flow controllers. Finish by wiring screens, adding contract and end-to-end coverage, and documenting repeatable verification commands.

## Tasks

- [ ] 1. Establish the current integration baseline
  - [ ] 1.1 Inventory all Client API calls in `app/lib/services`, screens, and widgets and map each call to an existing backend route.
    - Record mismatched paths, methods, headers, payloads, response fields, and status codes.
    - _Requirements: 2.1, 3.2, 7.1_
  - [ ] 1.2 Run existing backend and Flutter test suites and classify failures as contract, environment, implementation, or test gaps.
    - _Requirements: 8.1, 8.3_
  - [ ] 1.3 Define the MVP contract fixture set for session, posts, capture, status, media, and error envelopes.
    - _Requirements: 7.1, 7.2_

- [ ] 2. Formalize shared API and domain contracts
  - [ ] 2.1 Extend or refactor Dart domain models for `Session`, `PostDto`, `CaptureDto`, `MediaReferenceDto`, and `ApiError` with tolerant optional-field decoding.
    - _Requirements: 2.2, 3.3, 4.2, 5.1, 7.4_
  - [ ] 2.2 Align backend route serializers with stable response fields, status values, content types, and error envelopes.
    - _Requirements: 3.2, 3.3, 4.2, 4.4, 7.3_
  - [ ]* 2.3 Add property tests for session serialization, error mapping, status terminality, and Post decoding.
    - **Property 1: Session round trip preserves usable credentials**
    - **Property 5: Error envelopes map without leaking diagnostics**
    - **Property 6: Post decoding tolerates unknown optional fields**
    - **Validates: Requirements 1.2, 1.4, 6.3, 6.4, 2.2, 7.4**

- [ ] 3. Refactor the Client transport and session boundary
  - [ ] 3.1 Implement one typed `ApiClient` transport for base URL configuration, JSON encoding/decoding, timeouts, and typed errors.
    - _Requirements: 6.3, 6.4, 7.1, 7.3_
  - [ ] 3.2 Integrate `SessionManager` with the existing auth and session-store services, including restore, save, expiry, and clear behavior.
    - _Requirements: 1.2, 1.4, 1.5_
  - [ ] 3.3 Attach session credentials to protected requests and ensure authentication failures invalidate the session exactly once.
    - **Property 2: Protected requests carry the current session**
    - _Requirements: 1.3, 1.5, 7.1_
  - [ ]* 3.4 Add unit tests for request construction, session restore, auth failure, malformed responses, timeout, and retryability mapping.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 6.1, 6.3, 6.4_

- [ ] 4. Implement feed, detail, and media flows
  - [ ] 4.1 Replace placeholder or locally fabricated feed data with typed `ApiClient.listPosts` calls.
    - _Requirements: 2.1, 2.2_
  - [ ] 4.2 Add feed refresh, empty, loading, retry, and stale-data-preserving error states.
    - _Requirements: 2.3, 2.4, 2.5, 6.1, 6.2_
  - [ ] 4.3 Wire post detail loading and canonical source actions.
    - _Requirements: 5.1, 5.4_
  - [ ] 4.4 Load media independently and render metadata when media is unavailable.
    - _Requirements: 5.2, 5.3_
  - [ ]* 4.5 Add Flutter widget tests for feed and detail success, empty, error/retry, refresh, and media fallback states.
    - _Requirements: 2.2, 2.4, 2.5, 5.1, 5.3_

- [ ] 5. Implement the complete capture lifecycle
  - [ ] 5.1 Add source URL validation in the Client and connect the capture form to `ApiClient.createCapture`.
    - _Requirements: 3.1, 3.5_
  - [ ] 5.2 Align backend capture validation, owner scope, stable identifier generation, and initial status response.
    - _Requirements: 3.2, 3.3, 8.2_
  - [ ] 5.3 Implement `CaptureController` with duplicate-submit protection, bounded polling, cancellation, terminal completion, and terminal failure states.
    - **Property 3: Valid captures produce one tracked lifecycle**
    - **Property 4: Terminal statuses stop polling**
    - _Requirements: 3.4, 4.1, 4.3, 4.5_
  - [ ] 5.4 Navigate to or render the completed Post and expose retry/dismiss behavior for failed captures.
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [ ]* 5.5 Add unit, widget, and backend integration tests for valid URL, invalid URL, duplicate submission, queued/processing/completed/failed statuses, cancellation, and owner isolation.
    - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.2, 4.4, 8.2_

- [ ] 6. Harden backend integration boundaries
  - [ ] 6.1 Verify authentication middleware and owner scope on all protected post, capture, status, and media endpoints.
    - _Requirements: 1.5, 3.2, 5.2, 8.2_
  - [ ] 6.2 Verify URL policy, rate limiting, safe public errors, and secret-safe logging for Client-triggered routes.
    - _Requirements: 3.2, 6.3, 6.4_
  - [ ] 6.3 Verify worker-to-repository transitions produce retrievable completed Posts and terminal failed Captures.
    - _Requirements: 4.2, 4.4, 8.2_
  - [ ]* 6.4 Add route-level contract tests for status codes, headers, response schemas, error envelopes, and authorization boundaries.
    - _Requirements: 7.1, 7.2, 7.3, 8.2_

- [ ] 7. Add full integration verification
  - [ ] 7.1 Build a deterministic end-to-end test harness with fake AI, media, queue, and persistence dependencies.
    - _Requirements: 8.1, 8.3_
  - [ ] 7.2 Test the complete MVP Flow from session establishment through feed, capture, processing, post detail, and media fallback.
    - _Requirements: 8.2, 8.3_
  - [ ] 7.3 Test representative failure journeys: invalid session, rejected URL, backend timeout, worker failure, malformed response, and retry.
    - _Requirements: 1.5, 3.5, 4.4, 5.3, 6.2, 6.4_
  - [ ] 7.4 Document backend, Flutter, and complete integration test commands plus required environment variables.
    - _Requirements: 8.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Run backend tests with the repository's non-watch test command.
  - Run Flutter unit/widget tests.
  - Run the deterministic integration suite.
  - Fix remaining contract, lifecycle, and environment issues before completion.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, although contract and end-to-end tests are strongly recommended before release.
- Each task references specific requirements for traceability.
- Property tests apply to pure transformations and lifecycle invariants; external services and UI presentation use example-based or integration tests.
- Do not start long-running development servers from the implementation workflow; run them manually when interactive verification is required.
