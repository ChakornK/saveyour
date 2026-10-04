# Implementation Plan: Backend Containerization and Meilisearch Migration

## Overview

Implement the backend as a Docker Compose application containing the API, worker, MongoDB, Redis, and Meilisearch. Replace OpenSearch runtime integration with a Meilisearch adapter while keeping existing API search behavior stable.

## Tasks

- [ ] 1. Define the backend container image
  - Add `backend/Dockerfile` using Bun and a production-capable base image.
  - Install FFmpeg in the image.
  - Install dependencies from `bun.lock`.
  - Define API and worker-compatible runtime commands.
  - Add a non-root runtime user where supported.
  - Add a healthcheck for the API process.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2. Create the Docker Compose stack
  - Define `api`, `worker`, `mongo`, `redis`, and `meilisearch` services.
  - Add a private application network.
  - Add named volumes for MongoDB, Redis, and Meilisearch.
  - Add healthchecks for MongoDB, Redis, and Meilisearch.
  - Configure API and worker dependency conditions using healthcheck readiness.
  - Configure restart policies without automatic volume deletion.
  - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 3.5, 4.2, 5.1, 5.2_

- [ ] 3. Update environment configuration for Compose
  - Set container-network defaults for `MONGO_URI`, `REDIS_URL`, and `SEARCH_URL`.
  - Add Meilisearch key and index configuration.
  - Preserve Gemini configuration as an external API dependency.
  - Add or update `.env.example` with all required values and descriptions.
  - _Requirements: 1.3, 3.3, 4.3, 5.3_

- [ ] 4. Replace OpenSearch with Meilisearch
  - Implement the Meilisearch search adapter behind the existing search interface.
  - Map indexing, deletion, and query operations to Meilisearch.
  - Preserve the existing search response contract.
  - Remove OpenSearch runtime imports, URLs, dependencies, and service references.
  - Add index initialization and searchable field configuration.
  - _Requirements: 4.1, 4.4, 4.6, 4.7_

- [ ] 5. Preserve failure and recovery behavior
  - Return controlled search errors when Meilisearch is unavailable.
  - Preserve MongoDB records when indexing fails.
  - Ensure queue retries can replay failed indexing work.
  - Verify failed analysis remains retryable when Gemini is unavailable.
  - _Requirements: 4.5, 5.4_

- [ ] 6. Add container and search integration tests
  - Validate Compose syntax with `docker compose config`.
  - Build the backend image in CI or a local integration command.
  - Verify API, MongoDB, Redis, and Meilisearch readiness.
  - Verify indexing and querying through the Backend API.
  - Verify named-volume persistence across stack recreation.
  - _Requirements: 6.4, 6.5_

- [ ] 7. Update backend documentation
  - Document Docker and Docker Compose prerequisites.
  - Document environment variables, service names, ports, volumes, and external Gemini dependency.
  - Document `docker compose build`, `docker compose up -d`, `docker compose logs`, and `docker compose down`.
  - Explicitly document that `docker compose down -v` deletes Persistent_Data.
  - Document Meilisearch migration and OpenSearch removal.
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8. Checkpoint - Run validation
  - Run backend typecheck and tests.
  - Run Compose configuration validation.
  - Run the container stack integration checks.
  - Ensure all tests pass before deployment.

## Notes

- Tasks are ordered so the image and Compose foundation exist before application migration.
- MongoDB, Redis, and Meilisearch are internal Compose services.
- Gemini remains external and requires `GEMINI_API_KEY`.
- FFmpeg is packaged inside the backend image rather than run as a separate service.
- `docker compose down` preserves named volumes; `docker compose down -v` is destructive.
