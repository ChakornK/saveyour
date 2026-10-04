# Requirements Document

## Introduction

Upgrade the saveyour.tech Flutter client into a polished adaptive archive that is reliable against the existing backend API. The client must preserve the product's neobrutalist emerald visual language while improving hierarchy, responsive navigation, accessibility, loading/error/empty states, capture, search, albums, profile, and post detail. Snowflake Cortex media analysis remains out of scope; analysis status must still be represented honestly.

## Glossary

- **Capture**: Submitting a valid social-media URL to `POST /capture`.
- **Archive**: The authenticated user's captured posts returned from `/captured-posts` or `/v1/search`.
- **Analysis state**: Pending, partial, complete, or failed processing status supplied by the backend.
- **Adaptive shell**: Bottom navigation on compact widths and navigation rail on expanded widths.
- **Repository**: The typed Flutter API boundary implementing posts, albums, and profile operations.

## Requirements

### Requirement 1

**User Story:** As an authenticated user, I want a coherent adaptive shell, so that the app feels intentional on phone, tablet, and desktop.

#### Acceptance Criteria

1. WHEN the viewport is compact, THE app SHALL use safe-area-aware top content and a three-destination bottom navigation with 44dp minimum targets.
2. WHEN the viewport is expanded, THE app SHALL use a persistent navigation rail and SHALL NOT show a duplicate bottom navigation bar.
3. THE app SHALL preserve the emerald background, paper surfaces, black 2px borders, 4px hard shadows, 5px radii, and meaningful pressed/focus states across interactive surfaces.
4. THE app SHALL support keyboard focus, semantic labels, readable contrast, and reduced-motion-friendly transitions.

### Requirement 2

**User Story:** As a user, I want to save a link quickly and understand what happened, so that capture never feels ambiguous.

#### Acceptance Criteria

1. WHEN a user opens capture, THE app SHALL show a labeled URL field, validation guidance, cancel action, and a clear primary save action.
2. IF a URL is not absolute HTTP(S), THEN the app SHALL reject it before network submission with an actionable message.
3. WHEN capture succeeds, THE app SHALL show a success confirmation, refresh the archive, and represent the returned analysis status without claiming analysis is complete.
4. IF capture fails or times out, THEN the app SHALL preserve the entered URL and offer retry without losing context.

### Requirement 3

**User Story:** As a user, I want to browse and search saved posts, so that I can retrieve knowledge quickly.

#### Acceptance Criteria

1. THE archive SHALL provide responsive gallery density, stable card geometry, source attribution, capture age, media fallback, and analysis state on each card.
2. WHEN a search query changes, THE app SHALL debounce requests and show loading, results, no-results, failure, and retry states.
3. IF a result has no media, THEN the app SHALL present a readable text-first card rather than a fake image placeholder.
4. WHEN a card is activated, THE app SHALL open a detail surface with source link, generated-content labeling, tags, album membership, and available actions.

### Requirement 4

**User Story:** As a user, I want albums that work end to end, so that I can organize saved posts.

#### Acceptance Criteria

1. THE albums surface SHALL load, search, and display cover, post count, visibility, and updated information.
2. WHEN an album is opened, THE app SHALL load its posts, provide scoped search, preserve back navigation, and avoid nested duplicate global navigation.
3. THE app SHALL support creating albums and adding/removing posts through the backend repository.
4. IF album loading fails, THEN THE app SHALL show an explanatory retry state rather than an unbounded spinner.

### Requirement 5

**User Story:** As a user, I want profile and session controls to be dependable, so that I can understand and control my account.

#### Acceptance Criteria

1. THE profile surface SHALL load with skeleton/progress, failure/retry, identity, archive statistics, and session state.
2. WHEN the user signs out, THE app SHALL clear the session and return to the sign-in surface.
3. THE app SHALL not log personal profile responses in production builds.

### Requirement 6

**User Story:** As a maintainer, I want API integration to match backend contracts, so that client actions work against real services.

#### Acceptance Criteria

1. THE repository SHALL handle object and list response envelopes where backend routes permit them and SHALL provide typed validation errors.
2. THE repository SHALL use consistent `/capture`, `/captured-posts`, `/albums`, `/profile`, and `/v1/search` contracts and encode path/query values safely.
3. THE app SHALL provide bounded request timeouts and user-visible network recovery for every major operation.
4. THE app SHALL ignore Cortex implementation details while representing backend-provided analysis statuses honestly.

### Requirement 7

**User Story:** As a maintainer, I want evidence of quality, so that changes can ship confidently.

#### Acceptance Criteria

1. Flutter formatting, static analysis, unit tests, and widget tests SHALL pass.
2. Backend tests and API integration tests SHALL pass or any pre-existing environment blocker SHALL be documented with reproduction evidence.
3. The final build SHALL contain no debug prints, placeholder interactions, broken nested navigation, or unhandled loading states in required surfaces.
