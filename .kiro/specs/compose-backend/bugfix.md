# Bugfix Requirements Document

## Introduction

The repository currently contains two Compose files with overlapping infrastructure definitions: a root file that starts the backend application and dependencies, and a backend-local file that starts only dependencies. This split creates ambiguity about the supported startup location and prevents a single, backend-scoped Compose command from reliably starting the complete backend stack. The fix will establish `backend/docker-compose.yml` as the canonical configuration for the backend scope, expand it to include the application processes and dependencies, and remove the duplicate root backend definition.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a developer runs Compose from the repository root THEN the system uses a duplicate backend definition that overlaps with the backend-scoped Compose file.
1.2 WHEN a developer runs Compose from the `backend` directory THEN the system starts infrastructure services without the API, worker, or downloader services, so the entire backend does not run.
1.3 WHEN a developer follows repository documentation or discovers Compose files by location THEN the system does not provide one unambiguous backend-scoped command and canonical configuration for starting the backend.

### Expected Behavior (Correct)

2.1 WHEN a developer runs `docker compose -f backend/docker-compose.yml up --build` from the repository root THEN the system SHALL start the API, worker, downloader, MongoDB, Redis, SeaweedFS, and Meilisearch services using one canonical backend-scoped Compose file.
2.2 WHEN the canonical Compose stack starts THEN the system SHALL use service-to-service container networking and health-gated dependencies so backend processes can reach their required infrastructure services.
2.3 WHEN a developer inspects the repository THEN the system SHALL contain no duplicate root Compose YAML that conflicts with the canonical backend configuration.
2.4 WHEN a developer follows the startup instructions THEN the system SHALL identify `docker compose -f backend/docker-compose.yml up --build` as the single supported backend startup command.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend services run under Compose THEN the system SHALL CONTINUE TO expose the API on port 3000 and preserve the existing worker and downloader process roles.
3.2 WHEN the infrastructure services run under Compose THEN the system SHALL CONTINUE TO persist MongoDB, Redis, Meilisearch, and SeaweedFS data in named volumes.
3.3 WHEN backend code is built THEN the system SHALL CONTINUE TO use the existing backend Docker image build inputs and runtime commands unless a Dockerfile change is required to make the canonical stack work.
3.4 WHEN backend tests and local non-Compose development are used THEN the system SHALL CONTINUE to function without requiring the removed duplicate root Compose definition.
