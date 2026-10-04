# Canonical Compose Backend Startup Bugfix Design

## Overview

The repository has a root `docker-compose.yml` that defines the backend stack and a second `backend/docker-compose.yml` that defines only infrastructure. The backend-local file is incomplete and can lead developers to start a partial backend. The fix is to make `backend/docker-compose.yml` the canonical backend-scoped configuration, add all backend processes there, remove the duplicate root backend definition, document one startup command, and validate the stack without changing backend runtime roles.

## Glossary

- **Bug_Condition (C)**: A Compose invocation uses an incomplete Compose file or otherwise does not start the complete backend service set.
- **Property (P)**: A backend-scoped Compose invocation starts all backend processes and their required dependencies with valid internal networking and health ordering.
- **Preservation**: Existing API ports, process commands, named volumes, environment wiring, and non-Compose development behavior remain unchanged.
- **Canonical Compose file**: `backend/docker-compose.yml`.
- **Backend services**: `api`, `worker`, and `downloader`.
- **Infrastructure services**: `mongo`, `redis`, `seaweedfs`, and `meilisearch`.

## Bug Details

### Bug Condition

The bug manifests when a developer invokes `backend/docker-compose.yml`: that file starts infrastructure only and omits the API and background workers. The repository therefore exposes two Compose entry points with different scopes instead of one complete backend startup command.

**Formal Specification:**

```text
FUNCTION isBugCondition(input)
  INPUT: input of type ComposeInvocation
  OUTPUT: boolean

  RETURN input.composeFile is not the canonical backend Compose file
         OR input.startedServices does not include
            {api, worker, downloader, mongo, redis, seaweedfs, meilisearch}
END FUNCTION
```

### Examples

- Running `docker compose -f backend/docker-compose.yml up --build` from the repository root starts the complete backend stack; this is the expected behavior.
- Running `docker compose up` from `backend/` currently starts only MongoDB, Redis, SeaweedFS, and Meilisearch; API and workers are missing.
- Comparing the two files shows divergent settings, including infrastructure port exposure and Meilisearch environment mode, which can produce inconsistent local behavior.
- After merging the complete service set into `backend/docker-compose.yml` and removing the root duplicate, repository inspection has one backend Compose definition and one unambiguous command.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- The API remains available on host port 3000.
- `api`, `worker`, and `downloader` retain their existing Bun entrypoints.
- MongoDB, Redis, Meilisearch, and SeaweedFS continue using the existing named volumes.
- Service names and internal URLs continue to resolve through Compose service networking.
- Backend tests and direct local development remain independent of Compose file selection.

**Scope:**
All behavior unrelated to selecting the canonical backend Compose configuration should be unaffected. This includes:

- Backend source code and package dependencies.
- Existing service environment variables and health checks.
- Persistent data volume names.
- API and infrastructure host ports already exposed by the complete stack.

## Hypothesized Root Cause

Based on repository inspection, the most likely causes are:

1. **Incomplete backend configuration**: `backend/docker-compose.yml` defines only infrastructure services.
2. **Duplicate configuration**: The root file overlaps with the backend file and can drift from it.
3. **Missing canonical startup documentation**: The repository does not clearly state the backend-scoped Compose command.
4. **Entrypoint ambiguity**: Developers can naturally run Compose from `backend/`, where the incomplete configuration is discovered.

## Correctness Properties

Property 1: Bug Condition - Complete Backend Startup

_For any_ Compose invocation using the supported backend-scoped command, the fixed repository SHALL use `backend/docker-compose.yml` and define/start `api`, `worker`, `downloader`, `mongo`, `redis`, `seaweedfs`, and `meilisearch`, with backend services able to resolve required dependencies by service name.

**Validates: Requirements 2.1, 2.2, 2.4**

Property 2: Preservation - Existing Backend Runtime Configuration

_For any_ behavior outside duplicate Compose-file selection, the fixed repository SHALL preserve the existing API port, backend commands, named data volumes, service environment wiring, and direct backend development behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming the existing root service definitions are the intended complete stack:

**File**: `backend/docker-compose.yml`

**Function**: Canonical backend Compose entrypoint

**Specific Changes**:

1. **Expand backend YAML**: Add `api`, `worker`, and `downloader` services using the existing root Compose definitions.
2. **Preserve infrastructure**: Keep MongoDB, Redis, SeaweedFS, and Meilisearch with required health checks, volumes, and networking.
3. **Remove duplicate root YAML**: Delete the root `docker-compose.yml` after its complete service definitions have been merged into the backend file.
4. **Document startup command**: Update the root README with `docker compose -f backend/docker-compose.yml up --build`.
5. **Validate Docker build inputs**: Inspect `backend/Dockerfile` and retain it unless Compose validation or image build proves a required correction.
6. **Validate configuration**: Run `docker compose -f backend/docker-compose.yml config` and, where Docker is available, build/start the stack and verify service health and API reachability.

## Testing Strategy

### Validation Approach

Validation will first inspect the unfixed repository to establish that both Compose files exist and that the backend-local file omits application services. The change will then be validated statically and, where the environment supports Docker, through a real Compose build and startup check.

### Exploratory Bug Condition Checking

**Goal**: Surface the incomplete startup behavior before removing the duplicate file.

**Test Plan**: Parse both Compose files and compare service sets. Run the backend-local configuration, when Docker is available, and verify that it lacks the API and worker processes.

**Test Cases**:

1. **Service-set comparison**: Confirm root defines seven services while backend-local defines only four (will demonstrate the defect).
2. **Backend entrypoint check**: Confirm backend-local YAML has no API, worker, or downloader service (will demonstrate the defect).
3. **Configuration drift check**: Compare environment and port settings between files (will demonstrate divergence).
4. **Canonical command check**: Confirm the backend Compose file resolves the backend build context and required dependencies.

**Expected Counterexamples**:

- `backend/docker-compose.yml` cannot start `api`, `worker`, or `downloader`.
- The two files expose or configure infrastructure differently.

### Fix Checking

**Goal**: Verify that the canonical command defines and starts the complete backend.

**Pseudocode:**

```text
FOR ALL input WHERE isBugCondition(input) is addressed by the fix DO
  result := dockerComposeConfig(backendComposeFile)
  ASSERT requiredServices(result) =
    {api, worker, downloader, mongo, redis, seaweedfs, meilisearch}
  ASSERT dependenciesUseServiceNames(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that moving the complete service definitions into the backend-scoped file does not alter established runtime behavior.

**Pseudocode:**

```text
FOR ALL preserved configuration properties DO
  ASSERT rootComposeBeforeChange(property) = backendComposeAfterChange(property)
END FOR
```

**Testing Approach**: Compare the complete root configuration before the change with the normalized backend configuration after the change, then use `docker compose config` and a Compose startup smoke test.

**Test Cases**:

1. **Runtime command preservation**: Confirm API, worker, and downloader commands remain unchanged.
2. **Port and volume preservation**: Confirm API port, infrastructure ports, and named volumes remain unchanged.
3. **Health and dependency preservation**: Confirm health checks and `depends_on` conditions remain present.

### Unit Tests

- Validate the canonical backend Compose YAML service set and required fields.
- Validate README startup instructions contain the backend-scoped command.
- Validate no duplicate root Compose YAML remains.

### Property-Based Tests

- Generate required-service assertions over the parsed Compose service map.
- Verify all backend services retain non-empty commands and required dependency references.
- Verify named volume references remain stable across configuration normalization.

### Integration Tests

- Run `docker compose -f backend/docker-compose.yml config` from the repository root.
- Run `docker compose -f backend/docker-compose.yml up --build -d` and wait for health-gated dependencies.
- Verify API reachability on `http://localhost:3000` and inspect service status/logs; tear down with `docker compose -f backend/docker-compose.yml down` after validation.
