# Requirements Document

## Introduction

This specification covers albums, album membership, AI-assisted organization, public sharing links, relationship maps, profile export/deletion, and self-hosted operational deployment for saveyour.tech. The workstream owns its API modules and deployment definitions while consuming post/search/media contracts through stable interfaces.

## Glossary

- **Album**: Owner-created collection of Saved_Post references.
- **Album_Membership**: Ordered relationship between an Album and Saved_Post.
- **Organization_Suggestion**: Ranked recommendation to add a post to an Album.
- **Auto_Organization**: Explicit Owner rule that suggests or automatically adds matching posts.
- **Public_Album_Link**: Revocable read-only link to a redacted Album projection.
- **Relationship_Map**: Bounded graph of authorized posts, tags, albums, platforms, and edges.
- **Coolify**: Existing self-hosted deployment platform used to run saveyour.tech services.

## Requirements

### Requirement 1: Albums and memberships

**User Story:** As a user, I want to organize saved posts into albums, so that collections such as trips or recipes are easy to revisit.

#### Acceptance Criteria

1. WHEN a valid album name is submitted, THE Album_Service SHALL create an Owner-owned private Album.
2. IF the name is empty, too long, or contains unsupported control characters, THEN THE Album_Service SHALL return field validation and create no Album.
3. WHEN Albums are listed, THE API SHALL return cover, name, post count, visibility, and updated time.
4. WHEN an Album opens, THE API SHALL return its Owner-authorized ordered posts through the shared post projection.
5. WHEN a post is added, THE Album_Service SHALL create one idempotent Album_Membership.
6. WHEN a post is removed, THE Album_Service SHALL remove only membership and preserve the Saved_Post.
7. WHEN an Album is renamed, THE service SHALL preserve ID, memberships, sharing state, and history.
8. WHEN an Album is deleted, THE service SHALL remove memberships and revoke public links while preserving Saved_Post records.
9. THE service SHALL support deterministic ordering and safe optimistic concurrency for membership changes.

### Requirement 2: AI organization

**User Story:** As a user, I want album suggestions based on album names and post meaning, so that organization requires less manual work.

#### Acceptance Criteria

1. WHEN an Album is created or renamed, THE Organization_Service SHALL return ranked suggestions with match explanation and confidence.
2. WHEN a user reviews suggestions, THE API SHALL support accept, reject, and accept-selected commands.
3. WHEN a user adds all search results to an Album, THE API SHALL return candidate count, applied count, and exclusions.
4. WHERE Auto_Organization is enabled, THE service SHALL evaluate new posts against the configured rule.
5. THE service SHALL distinguish suggest-only rules from automatic-add rules.
6. THE service SHALL record rule ID and reason for every automatic membership change.
7. THE service SHALL never silently mutate existing memberships without an explicit accepted suggestion, search action, or enabled automatic rule.

### Requirement 3: Public sharing

**User Story:** As a user, I want to share an album publicly, so that others can browse a curated collection without accessing my account.

#### Acceptance Criteria

1. WHEN sharing is enabled, THE Public_Album_Service SHALL generate an unguessable revocable token.
2. WHEN a valid public token is opened, THE public API SHALL return only the album's allowlisted read-only projection.
3. THE public API SHALL omit Owner identity, private tags, internal IDs/object keys, provider credentials, and unrelated posts.
4. WHEN a link is revoked or regenerated, THE public API SHALL reject the previous token within the cache invalidation bound.
5. WHEN an Album is deleted or private, THE service SHALL revoke its active links.
6. IF a public token is missing, revoked, or private, THEN THE API SHALL return a non-disclosing not-found response.
7. THE Owner API SHALL support copy-link, revoke, regenerate, and visibility-status operations.

### Requirement 4: Relationship map

**User Story:** As a user, I want to see relationships among saved posts, so that I can discover themes in my own library.

#### Acceptance Criteria

1. WHEN the map opens, THE Map_Service SHALL return Owner-authorized post, tag, album, and platform nodes.
2. THE Map_Service SHALL provide typed weighted edges for shared tags, semantic similarity, membership, and source relationships.
3. THE Map_Service SHALL cap graph size and provide deterministic sampling/clustering for larger libraries.
4. THE service SHALL return an Accessible_Alternative list projection with equivalent node and relationship details.
5. IF graph data fails, THEN the API SHALL return a retryable error without exposing unauthorized records.

### Requirement 5: Profile, privacy, and lifecycle

**User Story:** As a user, I want to export or delete my account, so that I retain control over my data.

#### Acceptance Criteria

1. WHEN export is requested, THE Profile_Service SHALL create a job containing authorized metadata, memberships, tags, provenance, and source links.
2. WHEN account deletion is confirmed, THE service SHALL revoke sessions, revoke public links, remove or anonymize metadata, and schedule media cleanup.
3. THE service SHALL expose export/deletion status and retryable failure states.
4. THE service SHALL provide configured retention and cleanup procedures.
5. THE service SHALL expose generated-data provenance and provider-processing controls.

### Requirement 6: Existing Coolify deployment operations

**User Story:** As a self-hosting operator, I want saveyour.tech to deploy on my existing Coolify instance, so that I can run and maintain the application without provisioning another platform.

#### Acceptance Criteria

1. THE project SHALL provide container definitions and Coolify service configuration for web, API, worker, scheduler, MongoDB, SeaweedFS, Redis, and SearchIndex services as applicable.
2. THE deployment SHALL configure secrets, service URLs, OAuth credentials, storage credentials, model credentials, limits, and flags through environment variables or mounted secrets.
3. THE project SHALL provide health/readiness checks, structured logs, metrics, migration/index initialization, and graceful shutdown configuration.
4. THE project SHALL document persistent volumes, MongoDB backup/restore, SeaweedFS backup/restore, and consistency assumptions.
5. THE deployment SHALL not install or provision Coolify; it SHALL document how to connect these services to the existing Coolify instance.
6. WHEN a dependency is unavailable, THE services SHALL fail with bounded timeouts and actionable health status.
7. THE deployment SHALL support separate development, staging, and production configuration.
