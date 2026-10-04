# Requirements Document: Archive and Profile UI Enhancements

## Overview

Enhance the Flutter archive experience with reviewed social brand icons, manual album assignment, a Home-only search workflow, and album management interactions while preserving the existing neobrutalist visual language and persistent navigation.

## Requirements

### Requirement 1: Social brand icons

**User Story:** As a user, I want recognizable social-platform icons so that I can identify a post source quickly.

#### Acceptance Criteria

1. The app SHALL use a reviewed brand-icon pub package or reviewed bundled package assets for supported platforms.
2. The app SHALL provide an accessible text label and fallback icon for unsupported platforms.
3. The app SHALL not fetch arbitrary remote SVG brand assets at runtime.

### Requirement 2: Manual album assignment

**User Story:** As a user, I want to add a saved post to albums from its expanded information view so that I can organize posts without leaving context.

#### Acceptance Criteria

1. Tapping a saved post SHALL open a centered modal rather than a pull-down menu.
2. The modal SHALL list current albums and allow adding the post to one or more albums.
3. Adding an existing assignment SHALL be idempotent and SHALL not create duplicates.
4. Assignment failures SHALL keep the modal open and expose a retryable error.

### Requirement 3: Home-only search action

**User Story:** As a user, I want search controls on Home without cluttering secondary screens.

#### Acceptance Criteria

1. The Search button SHALL be visible on Home.
2. The Search button SHALL not be visible on Albums, Album Detail, or Profile screens.
3. The persistent Home/Albums/Profile navigation SHALL remain available on all application screens.

### Requirement 4: Mock search menu

**User Story:** As a user, I want a structured search menu so that I can enter queries and filters.

#### Acceptance Criteria

1. Activating Search from Home SHALL open a modal or menu with query input.
2. The menu SHALL support mock source and tag filters.
3. Applying a query SHALL update the Home result list deterministically.
4. A no-results state SHALL provide a clear reset action.

### Requirement 5: Album creation and selection

**User Story:** As a user, I want album actions available from album touch interactions so that I can create and organize albums efficiently.

#### Acceptance Criteria

1. Touching or long-pressing an album SHALL expose an explicit action menu.
2. The menu SHALL support opening an album and selecting it for assignment.
3. The menu SHALL support creating an album with validation for blank and duplicate names.
4. Destructive actions SHALL require confirmation.
5. Album interactions SHALL preserve the persistent application navigation.

## Non-Functional Requirements

- Maintain the existing neobrutalist visual style.
- Preserve minimum 44px interactive hit targets and accessible labels.
- Keep repository-backed mock behavior asynchronous and replaceable.
- Avoid unreviewed remote assets and leaking post/account data through logs.
