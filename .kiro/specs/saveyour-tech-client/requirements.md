# Requirements Document

## Introduction

This specification covers the adaptive Flutter client and neobrutalist design system for saveyour.tech. The client must provide one coherent product experience across iOS, Android, mobile web, tablet, and desktop web while adapting navigation and interaction to each platform. The client consumes versioned API contracts and mock repositories so implementation remains independent of backend feature teams.

## Glossary

- **Client**: The Flutter application running on mobile and web.
- **Saved_Post**: A post projection rendered in Home, Albums, Search, or detail surfaces.
- **Capture_Draft**: A URL and optional local metadata waiting to be submitted.
- **Analysis_Status**: queued, processing, partially_completed, completed, failed, blocked, or unsupported.
- **Accessible_Alternative**: A labeled non-gesture action with the same result as long press, drag, hover, or map gestures.
- **Design_System**: Shared saveyour.tech tokens, primitives, states, semantics, and motion rules.

## Requirements

### Requirement 1: Client foundation and routing

**User Story:** As a user, I want saveyour.tech to behave consistently across devices, so that I can access my saved knowledge anywhere.

#### Acceptance Criteria

1. THE Client SHALL support iOS, Android, mobile web, tablet, and desktop web through one Flutter codebase.
2. THE Client SHALL expose routes for authentication, Home, Albums, Album Detail, Search, Post Detail, Relationship Map, Profile, and Public Album.
3. WHEN a deep link is opened, THE Client SHALL restore the corresponding route and preserve its identifier, query, or public token.
4. WHEN authentication initializes, THE Client SHALL render a geometry-preserving loading state rather than a blank surface.
5. IF a protected request returns an authentication error, THEN THE Client SHALL preserve unsent Capture_Drafts and request sign-in.
6. THE Client SHALL use generated API types and repository interfaces rather than directly depending on server implementation packages.

### Requirement 2: Neobrutalist design system

**User Story:** As a user, I want a bold and consistent interface, so that every saveyour.tech surface feels like the same product.

#### Acceptance Criteria

1. THE Design_System SHALL use the supplied emerald palette, black borders, white secondary surfaces, 4px hard shadows, 5px base radius, and bold heading roles.
2. THE Design_System SHALL provide shared button, icon button, card, text field, chip, badge, sheet, dialog, skeleton, empty, error, loading, selection-bar, and external-link primitives.
3. WHEN a control is pressed, THE Client SHALL translate the control by a bounded amount and reduce the shadow without changing surrounding layout.
4. WHEN reduced motion is enabled, THE Client SHALL replace bounce transitions with opacity or immediate state changes.
5. THE Client SHALL provide visible keyboard focus indicators and semantic labels for every interactive control.
6. THE Client SHALL maintain a minimum 44 logical-pixel touch target for interactive controls.
7. THE Client SHALL use Mingcute filled icons where icons are required and SHALL provide text or semantic labels for icon-only controls.

### Requirement 3: Adaptive navigation and shell

**User Story:** As a user, I want navigation suited to my device, so that the product remains comfortable on mobile and desktop.

#### Acceptance Criteria

1. WHEN the Client is in mobile layout, THE Client SHALL provide Home, Albums, and Profile as bottom navigation destinations.
2. WHEN the Client is in wide web layout, THE Client SHALL provide equivalent destinations through a persistent or collapsible navigation rail.
3. WHEN Home is active, THE Client SHALL show pending analysis on the left, the app name in the center, and add-link on the right without overlap.
4. WHEN an Album is active, THE Client SHALL show the album name and an accessible rename action.
5. THE Client SHALL preserve keyboard focus order, safe-area insets, keyboard avoidance, and focus restoration across route changes.
6. THE Client SHALL support widths from 320 through large desktop widths without ordinary horizontal scrolling.

### Requirement 4: Home gallery and selection

**User Story:** As a user, I want to browse and select saved posts, so that I can inspect and organize my library.

#### Acceptance Criteria

1. WHEN Home loads, THE Client SHALL render a scrollable staggered gallery ordered by latest capture time.
2. WHEN a post has no usable media but has source text, THE Client SHALL render a readable text preview with source attribution.
3. WHEN a post has media, THE Client SHALL prioritize the media preview while preserving source identity and analysis status.
4. WHEN a user long-presses a post, THE Client SHALL enter multi-select mode.
5. THE Client SHALL provide an Accessible_Alternative to long-press selection.
6. WHILE multi-select mode is active, THE Client SHALL provide Add to album, Delete, and Cancel actions.
7. WHILE a page is loading, THE Client SHALL preserve gallery geometry with skeleton cards.
8. IF a page request fails, THEN THE Client SHALL preserve loaded posts and provide retry.
9. IF no posts exist, THEN Home SHALL explain capture and provide an add-link action.
10. WHEN deletion is confirmed, THE Client SHALL update the gallery only after a successful server response or an explicitly reversible optimistic action.

### Requirement 5: Capture and post detail UX

**User Story:** As a user, I want to save and inspect posts, so that I can understand what I captured.

#### Acceptance Criteria

1. WHEN a share intent or add-link action provides a URL, THE Client SHALL display the URL and a save action.
2. IF a URL is invalid or unsupported, THEN THE Client SHALL show a field-level explanation and preserve the draft.
3. WHEN capture is accepted, THE Client SHALL show a pending Saved_Post without blocking the rest of the library.
4. WHEN a post is activated, THE Client SHALL open a responsive detail surface with media, source metadata, AI description, tags, analysis status, and source-link action.
5. WHEN a detail surface is open on web, THE Client SHALL trap focus appropriately and restore focus when closed.
6. IF analysis is partial, blocked, or failed, THEN the detail surface SHALL preserve available source content and show an actionable explanation.

### Requirement 6: Search and profile surfaces

**User Story:** As a user, I want to search and manage my account, so that I can retrieve and control saved content.

#### Acceptance Criteria

1. WHEN a user submits a search query, THE Client SHALL display ranked results, filters, source platform, matched tags, and result state.
2. WHEN the search field receives focus, THE Client SHALL provide keyboard-navigable tag suggestions.
3. IF no results match, THEN THE Client SHALL provide revised queries, related tags, filter clearing, and Create album from results.
4. WHEN the user opens Profile, THE Client SHALL provide sign-out, data export, account deletion, and privacy/provider-processing controls.
5. THE Client SHALL show pending, success, failure, and retry states for export and deletion requests.

### Requirement 7: Accessibility and verification

**User Story:** As a maintainer, I want the client verified across devices and assistive technologies, so that visual polish does not reduce usability.

#### Acceptance Criteria

1. THE Client SHALL provide widget, integration, semantics, keyboard, reduced-motion, and responsive tests.
2. THE Client SHALL provide golden coverage for tokens, gallery cards, album cards, detail surfaces, search states, and failure states.
3. THE Client SHALL verify widths of 320, 390, 480, 768, 1024, and 1440 logical pixels.
4. THE Client SHALL provide Accessible_Alternatives for long press, drag, hover, and map gestures.
5. THE Client SHALL not rely on color alone for selection, status, relevance, or chart meaning.
