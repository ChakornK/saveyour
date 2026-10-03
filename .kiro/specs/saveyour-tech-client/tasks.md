# Implementation Plan: Adaptive Flutter Client and Design System

## Overview

Person 1 owns the entire Flutter client and design system in `client/`. The client is developed against generated contracts and deterministic mock repositories. No task requires direct access to backend databases or worker code.

## Tasks

- [ ] 1. Initialize Flutter client foundation
  - Create `client/pubspec.yaml`, platform bootstrap, environment flavors, test bootstrap, and generated-client setup.
  - Configure API origin, OAuth IDs, public-link origin, feature flags, and build modes.
  - Register mobile share intents and web deep links.
  - Add typed routes for auth, Home, Albums, Album Detail, Search, Post Detail, Map, Profile, and Public Album.
  - _Requirements: 1.1–1.6_

- [ ] 2. Implement domain states and repositories
  - Create `LoadState`, typed failures, pagination state, capture draft, outbox entry, and repository interfaces.
  - Implement `MockAppRepository` with fixtures for every state.
  - Implement generated `HttpAppRepository` mapping and problem-details conversion.
  - Test cursor behavior, retry behavior, DTO mapping, and stale data retention.
  - _Requirements: 1.6, 4.7, 6.1, 7.1_

- [ ] 3. Implement neobrutalist tokens and primitives
  - Mirror emerald palette, typography, border, radius, hard shadow, spacing, focus, and chart tokens.
  - Implement all shared primitives and semantic variants.
  - Implement pressed, disabled, loading, selected, focus, hover-web, and destructive states.
  - Add 44px target enforcement and semantic labels.
  - _Requirements: 2.1–2.7_

- [ ] 4. Implement reduced-motion and accessibility foundation
  - Read platform motion preferences.
  - Replace bounce transitions with opacity/immediate transitions.
  - Implement focus traversal, announcements, labels, roles, and keyboard shortcuts.
  - Add tests for focus, semantics, reduced motion, and gesture alternatives.
  - _Requirements: 2.3–2.6, 7.4–7.5_

- [ ] 5. Implement adaptive navigation shell
  - Build mobile top bar, bottom navigation, safe areas, and keyboard avoidance.
  - Build wide web navigation rail and equivalent routes.
  - Implement responsive surface scaffold and geometry-preserving auth/loading states.
  - Verify all required viewport widths and deep-link focus restoration.
  - _Requirements: 3.1–3.6_

- [ ] 6. Implement Home gallery
  - Build staggered gallery, text-only cards, media cards, unavailable cards, skeleton cards, source badges, and status labels.
  - Add cursor pagination, retry, empty state, selection state, and selection action bar.
  - Add long-press and labeled Accessible_Alternative selection.
  - Add deletion confirmation and safe optimistic/undo behavior.
  - _Requirements: 4.1–4.10_

- [ ] 7. Implement capture UX
  - Build Home add-link action, mobile share-intent route, URL validation preview, duplicate response, pending state, blocked state, and offline outbox state.
  - Preserve drafts across auth and network failures.
  - _Requirements: 5.1–5.3_

- [ ] 8. Implement Post Detail
  - Build compact bottom sheet with drag handle and labeled close control.
  - Build wide modal/inspector.
  - Render media, source metadata, AI description, tags, transcript summary, provenance, and source link.
  - Render partial, blocked, failed, and retryable analysis states.
  - Implement web focus trap/restoration.
  - _Requirements: 5.4–5.6_

- [ ] 9. Implement Search surface
  - Build query field, tag suggestions, filters, result cards, explanations, pagination, no-results state, degraded state, and create-album handoff.
  - Add keyboard listbox behavior and screen-reader result announcements.
  - _Requirements: 6.1–6.3_

- [ ] 10. Implement Profile surface
  - Build account, sign-out, export, account deletion, privacy, provider-processing, pending, success, failure, and retry states.
  - _Requirements: 6.4–6.5_

- [ ] 11. Verify client quality
  - Run unit, widget, golden, integration, semantics, responsive, keyboard, and reduced-motion tests.
  - Verify 320–1440 widths and mobile/web device matrix.
  - Confirm no Material/Cupertino defaults leak into production surfaces.
  - _Requirements: 7.1–7.5_

- [ ] 12. Checkpoint - publish client integration artifact
  - Publish generated-client version, fixture contract version, screenshots, test report, and known UI limitations.
