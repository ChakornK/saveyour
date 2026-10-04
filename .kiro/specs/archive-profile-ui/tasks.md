# Implementation Plan: Archive and Profile UI Enhancements

## Overview

Implement reviewed social brand icons, manual post-to-album assignment, Home-only search, a mock query menu, and album creation/selection actions. Preserve the existing app shell and ensure all nested screens retain the Home/Albums/Profile navigation.

## Tasks

- [ ] 1. Audit and establish shared application shell
  - [ ] 1.1 Identify every route, modal, bottom sheet, and nested page that can replace the current scaffold.
  - [ ] 1.2 Move Home/Albums/Profile navigation ownership to one persistent shell.
  - [ ] 1.3 Ensure Album Detail and all modal entry points render without removing the navigation panel.
  - [ ] 1.4 Add navigation visibility integration tests for root, album detail, profile, search, and post detail flows.
  - _Requirements: 3.3, 5.5_

- [ ] 2. Add and integrate reviewed social brand icon package
  - [ ] 2.1 Review candidate Flutter pub packages and select one with appropriate licensing and supported platforms.
  - [ ] 2.2 Add the selected package to `app/pubspec.yaml` and run dependency resolution.
  - [ ] 2.3 Refactor `SourceIcon` behind a centralized `BrandIconProvider` mapping.
  - [ ] 2.4 Add accessible labels and a generic fallback for unknown platforms.
  - [ ]* 2.5 Add widget tests covering supported and unsupported platforms.
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3. Implement centered neobrutalist saved-post modal
  - [ ] 3.1 Make every saved-post card invoke one shared centered modal route.
  - [ ] 3.2 Apply paper background, black border, rounded corners, and hard offset shadow.
  - [ ] 3.3 Add close, delete, and current-album sections with explicit semantics.
  - [ ] 3.4 Ensure the modal is not implemented as a pull-down menu or unbounded bottom sheet.
  - [ ]* 3.5 Add widget tests asserting centered modal presentation and dismissal behavior.
  - _Requirements: 2.1, 2.4_

- [ ] 4. Add manual post-to-album assignment
  - [ ] 4.1 Extend `AlbumRepository` with add/remove assignment operations.
  - [ ] 4.2 Add a multi-select album list to `PostDetailModal`.
  - [ ] 4.3 Implement idempotent assignment and optimistic/loading states.
  - [ ] 4.4 Surface repository errors inline with retry behavior.
  - [ ]* 4.5 Add unit/property tests for duplicate assignment, removal, and failure recovery.
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 5. Restrict search action and implement Home search menu
  - [ ] 5.1 Move the Search button/action into the Home-only app-bar content.
  - [ ] 5.2 Remove Search actions from Albums, Album Detail, Profile, and nested surfaces.
  - [ ] 5.3 Create `HomeSearchMenu` with query text, source filter, tag chips, recent mock queries, apply, and reset actions.
  - [ ] 5.4 Connect menu output to deterministic mock filtering in the Home repository flow.
  - [ ]* 5.5 Add widget tests for visibility, query application, filters, and no-results reset.
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Add album creation and selection actions
  - [ ] 6.1 Add touch/long-press affordances to album cards with minimum 44px targets.
  - [ ] 6.2 Implement `AlbumActionMenu` with open, select, create, and supported management actions.
  - [ ] 6.3 Add validated album creation with blank-name and duplicate-name errors.
  - [ ] 6.4 Connect selection mode to the post assignment modal.
  - [ ] 6.5 Add confirmation for destructive album actions.
  - [ ]* 6.6 Add widget/integration tests for album touch actions, creation, selection, and cancellation.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Accessibility, responsive behavior, and visual verification
  - [ ] 7.1 Add semantics labels for icons, search controls, album actions, and modal controls.
  - [ ] 7.2 Verify narrow and wide layouts retain navigation and centered modal positioning.
  - [ ] 7.3 Verify keyboard/focus dismissal and modal focus restoration.
  - [ ] 7.4 Run format, analyzer, unit tests, widget tests, and integration tests.
  - _Requirements: 1.2, 2.1, 3.3, 5.5_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Run the complete Flutter test and analysis suite.
  - Verify package licensing and asset provenance.
  - Confirm the implementation matches the approved design and requirements documents.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Every task references the requirements it validates.
- The persistent navigation shell is intentionally completed before nested interaction work.
