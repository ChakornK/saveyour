# Implementation Plan: Polished Adaptive App

## Overview

Implement the design system and adaptive shell first, then harden repository/API behavior, then complete each required surface and verify with automated tests.

## Tasks

- [ ] 1. Establish design-system primitives and responsive shell
  - Update theme tokens, typography, focus, buttons, surfaces, status chips, and state panels.
  - Remove duplicate expanded navigation and fix route ownership.
  - _Requirements: 1.1–1.4, 7.3_

- [ ] 2. Harden repository and session integration
  - Add request timeouts, response envelope normalization, safe error parsing, and remove debug logging.
  - Verify capture, search, albums, profile, membership, delete, and auth routes against backend.
  - _Requirements: 2.2–2.4, 6.1–6.4_

- [ ] 3. Polish archive and capture flows
  - Implement responsive gallery, debounced search, branded loading/empty/error states, and robust capture sheet.
  - Add provenance and analysis state presentation to cards/detail.
  - _Requirements: 2.1–2.4, 3.1–3.4_

- [ ] 4. Complete albums and profile flows
  - Add album loading/retry/empty states, create/add/remove refresh behavior, clean detail routing, and profile session states.
  - _Requirements: 4.1–4.4, 5.1–5.3_

- [ ] 5. Add regression coverage
  - Extend repository and widget tests for responsive navigation, capture validation, timeout/errors, album mutations, and profile logout.
  - _Requirements: 6.1–6.4, 7.1–7.2_

- [ ] 6. Final checkpoint
  - Run formatting, analyzer, Flutter tests, backend tests, and build checks; repair all failures and document environmental blockers.
  - _Requirements: 7.1–7.3_

## Notes

Cortex media analysis is intentionally excluded. API-provided analysis status remains visible and honest.
