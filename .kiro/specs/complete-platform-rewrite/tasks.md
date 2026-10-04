# Implementation Plan: Complete Platform Rewrite

## Overview

Execute the rewrite as seven independently verifiable checkpoints. Each task below names the target files, exact behavior, required tests, and commit gate. An implementing agent must not move to the next checkpoint while the current gate fails.

## Operating rules

- Read `design.md`, `requirements.md`, and this file before coding.
- Never implement Cortex ingestion or analysis execution; implement only the status boundary.
- Preserve secrets: never commit `.env`, tokens, generated APKs, or debug logs.
- Run the stated gate before each commit.
- Use the git-commit skill and conventional messages exactly as listed.
- If a gate fails, keep the task in progress, fix the failure, and rerun the gate.

## Task 1: Establish baseline and route matrix

**Files to create/update**: `.kiro/specs/complete-platform-rewrite/baseline.md`, optionally `backend/test/route-matrix.test.ts`.

- Run:
  - `cd backend && bun run typecheck && bun test`
  - `cd app && dart format --set-exit-if-changed lib test && flutter test && flutter build apk --debug`
- Record current failures without hiding them.
- Create a matrix for every endpoint in `design.md`: auth source, owner source, service, repository, response, tests.
- Mark Cortex endpoints as deferred and all other rows as required.
- **Gate**: baseline file exists and commands have recorded output.
- **Commit**: `chore: record rewrite baseline`.

## Task 2: Implement typed backend auth context

**Target files**:

- Rewrite `backend/src/modules/auth/auth.ts`.
- Add `backend/src/modules/auth/context.ts`.
- Update `backend/src/app.ts` composition.
- Update route factories under `backend/src/modules/{capture,albums,search,profile,media}`.
- Update `backend/src/modules/auth/routes.ts` only where response contracts require it.
- Add tests to `backend/test/api.test.ts` or `backend/test/auth-context.test.ts`; do not rely only on TypeScript casts to claim context typing.

**Implementation**:

1. Export `AuthenticatedContext { ownerId, accountId, sessionId }`.
2. Implement one Elysia plugin using a composition pattern that TypeScript exposes to consuming routes. Prefer a route factory that receives a typed `authContext` plugin; do not use untyped `any`.
3. Validate `Authorization: Bearer <token>` and call `AuthService.authenticate`.
4. Attach owner context to request and reject invalid credentials before handlers.
5. Route handlers use attached owner context; `x-owner-id` is not used in production paths.
6. Keep explicit test-only fixture authentication if needed, guarded by non-production config.

**Tests**:

- Valid fixture token resolves expected owner.
- Missing, malformed, unknown, expired, revoked token fails.
- Typecheck proves route handlers access owner context.
- One valid token reaches capture, archive, albums, search, profile, and media routes.

**Gate**: `cd backend && bun run format --check && bun run typecheck && bun test`.
**Commit**: `feat: establish authenticated owner context`.

## Task 3: Implement deterministic seed data

**Target files**:

- Add `backend/src/infrastructure/seed/seed-data.ts`.
- Add `backend/src/infrastructure/seed/seed.ts`.
- Add `backend/src/infrastructure/seed/index.ts` or `backend/src/seed.ts` command entry.
- Update `backend/package.json` with a terminable `seed` script.
- Update `backend/src/app.ts` initialization only if seed mode is explicitly enabled.
- Add `backend/test/seed.test.ts`.

**Required fixture constants**:

- Account `seed-account-001`.
- Email `demo@saveyour.tech`.
- Token `seed-session-token-001` only in test/development.
- Posts `seed-post-001` through `seed-post-005`.
- Albums `seed-album-reading`, `seed-album-ideas`, `seed-album-recipes`.

**Implementation**:

- Build records from pure seed factory functions.
- Upsert by stable IDs; do not delete unrelated data.
- Refuse to run when `APP_ENV=production`.
- Seed both in-memory adapters and Mongo adapters through the same logical builder.
- Use pending analysis status and safe deterministic source metadata.

**Tests**:

- First run creates all minimum fixtures.
- Second run creates no duplicates.
- Production mode refuses before writes.
- Fixture bearer token authenticates as seed account.

**Gate**: `cd backend && bun run format --check && bun run typecheck && bun test`.
**Commit**: `feat: add deterministic development seed`.

## Task 4: Complete backend services and persistence

**Target files**:

- `backend/src/modules/capture/service.ts`, `repository.ts`, `persistent-repository.ts`, `api-routes.ts`.
- `backend/src/modules/albums/service.ts`, `repository.ts`, `routes.ts`, `types.ts`.
- `backend/src/modules/search/routes.ts`, `service.ts`, `suggestions.ts`.
- `backend/src/modules/profile/routes.ts`.
- `backend/src/modules/media/routes.ts` and repository/store boundaries.
- `backend/src/infrastructure/mongo/{auth-repositories,album-repository,persistent-repository,post-source}.ts`.
- `backend/test/{api,capture,infrastructure,integration-boundaries}.test.ts`.

**Implementation**:

- Make every service method take owner context from the route, never request owner data.
- Make all Mongo filters owner-scoped.
- Return exact envelopes in `design.md`.
- Add album post batching.
- Make create/rename/membership/delete idempotent as specified.
- Compute profile album/tag counts from owner-scoped repositories.
- Map duplicate Mongo errors to typed domain errors.
- Preserve analysis status without Cortex execution.

**Tests**:

- Full authenticated vertical API flow.
- Cross-owner negative tests for every resource family.
- Capture duplicate, delete, pagination, album CRUD/membership, search, suggestions, profile, media.

**Gate**: `cd backend && bun run format --check && bun run typecheck && bun test`.
**Commit**: `fix: complete owner scoped backend APIs`.

## Task 5: Rewrite Flutter session and API layer

**Target files**:

- `app/lib/services/auth.dart`.
- `app/lib/services/session_store.dart`.
- `app/lib/services/api_client.dart` and add `onUnauthorized` injection without coupling the client to Flutter widgets.
- `app/lib/domain/models.dart`.
- Add/extend `app/test/services_test.dart` and `app/test/api_client_test.dart`.

**Implementation**:

- Restore secure session then call `/auth/me`; clear invalid sessions.
- Always clear local storage in sign-out `finally`.
- Add bearer token only; never send owner ID as an authorization source.
- Support GET/POST/PATCH/DELETE with 20-second timeout.
- Normalize `{items,nextCursor}`, bare lists, object envelopes, and `204` responses.
- Map `{code,message,field}` errors.
- Invoke unauthorized callback on confirmed 401.
- Add typed `renameAlbum`, returned album mutation parsing, and profile/post parsing.

**Tests**:

- Valid restore, invalid restore, expiry reset, sign-out failure cleanup.
- Header injection, timeout, envelope parsing, 401 behavior.
- Album methods and mutation response parsing.

**Gate**: `cd app && dart format --set-exit-if-changed lib test && flutter test && flutter analyze`.
**Commit**: `feat: wire flutter session and api contract`.

## Task 6: Complete Flutter surfaces

**Target files**:

- `app/lib/main.dart`.
- `app/lib/screens.dart`.
- `app/lib/widgets/post_card.dart`.
- `app/lib/widgets/post_detail_modal.dart`.
- `app/lib/widgets/brutalist_button.dart`.
- `app/lib/theme/app_theme.dart`.
- Add/extend `app/test/screens_test.dart`, `additional_coverage_test.dart`, `theme_and_modal_test.dart`, `widget_test.dart`.

**Implementation**:

- Home: archive, search, capture, post detail, refresh, empty/failure/retry.
- Albums: server-backed list/create/search/empty/failure/retry.
- Album detail: server-backed load/not-found/retry, scoped search, rename, add/remove membership, mutation refresh.
- Profile: server counts, identity, retry, sign-out.
- Detail: source/media fallback, status, album membership, delete with confirmed server result.
- Ensure all product controls use custom neobrutalist wrappers, Sora, semantic labels, 44px targets, and reduced-motion-safe feedback.
- Never introduce raw MD3 NavigationBar/FAB/AlertDialog/FilterChip in product surfaces.

**Tests**:

- Every state row in the state matrix.
- Auth-expiry return to sign-in.
- Album create/rename/detail/add/remove.
- Search/capture/error preservation.
- Profile and post deletion refresh.

**Gate**: `cd app && dart format --set-exit-if-changed lib test && flutter test && flutter analyze && flutter build apk --debug`.
**Commit**: `feat: complete archive and album flows`.

## Task 7: End-to-end matrix and final release

**Target files**: `backend/test/integration-e2e.test.ts`, `backend/test/api.test.ts`, `app/test/*`, documentation if required.

**Required scenario**:

1. Seed fixture.
2. Authenticate with fixture bearer token.
3. Load profile and assert counts.
4. List archive.
5. Capture valid URL and assert receipt.
6. Search captured/archive data.
7. Create album.
8. Rename album.
9. Add post.
10. Read album detail and assert membership.
11. Remove post and assert absence.
12. Delete post and assert archive/album absence.
13. Sign out and assert subsequent protected request fails.
14. Confirm Cortex is the only skipped boundary.

**Gate**:

```bash
cd backend && bun run format --check && bun run typecheck && bun test
cd ../app && dart format --set-exit-if-changed lib test && flutter analyze && flutter test && flutter build apk --debug
git status --short
```

All tests must pass. Analyzer warnings may remain only if documented as pre-existing and non-functional; new errors are blockers. If a baseline test asserts removed MD3 structure, update the test to assert replacement behavior rather than restoring the removed component. Working tree must be clean.

**Commit**: `test: add end to end platform coverage`, then `chore: finalize rewrite verification`.

## Definition of done

- All requirements have automated coverage or an explicitly documented external dependency.
- Bearer-authenticated fixture can use all non-Cortex functionality.
- No route requires an owner header in normal authenticated operation.
- Seed data is deterministic, idempotent, and production-safe.
- Flutter never reports success before server confirmation.
- Backend and Flutter verification gates pass.
- Each checkpoint has an atomic conventional commit.
