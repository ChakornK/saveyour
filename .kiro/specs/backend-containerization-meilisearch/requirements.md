# Requirements Document

## Introduction

The backend shall run as a self-contained containerized application stack. The stack shall include the backend API and worker, MongoDB for application persistence, Redis for queue coordination, and Meilisearch for search indexing. The current OpenSearch integration shall be replaced with Meilisearch while preserving the backend's search capabilities and local development workflow.

## Glossary

- **Backend_Stack**: The containerized backend API, worker, MongoDB, Redis, and Meilisearch services.
- **Backend_API**: The HTTP server that exposes application endpoints.
- **Backend_Worker**: The background process that consumes queued analysis and indexing work.
- **MongoDB**: The document database used for application persistence.
- **Redis**: The queue and coordination service used by the backend.
- **Meilisearch**: The search service used to index and query searchable saved-post data.
- **OpenSearch**: The existing search service integration that this feature replaces.
- **Service**: One runtime component in the Backend_Stack.
- **Persistent_Data**: Database, queue, search index, and configuration data that must survive container recreation.
- **Healthcheck**: A container-level readiness probe that reports whether a Service can accept dependent traffic.

## Requirements

### Requirement 1

**User Story:** As a developer, I want the backend services defined as a reproducible container stack, so that the complete application can be started consistently across development and deployment environments.

#### Acceptance Criteria

1. THE Backend_Stack SHALL define separate Services for the Backend_API, Backend_Worker, MongoDB, Redis, and Meilisearch.
2. THE Backend_Stack SHALL configure inter-Service communication through container-network service names rather than localhost addresses.
3. THE Backend_Stack SHALL configure all non-secret runtime settings through environment variables or an environment file.
4. THE Backend_Stack SHALL expose only the ports required for local development or explicitly configured deployment access.
5. WHEN the Backend_Stack is started from a clean checkout with valid environment configuration, THE Backend_API and Backend_Worker SHALL start without requiring host-installed MongoDB, Redis, or search services.

### Requirement 2

**User Story:** As a developer, I want a production-ready backend image, so that the API and worker can run without depending on the source repository at runtime.

#### Acceptance Criteria

1. THE Backend_API image SHALL install production dependencies, copy the compiled backend output, and define a non-interactive startup command.
2. THE Backend_Worker image SHALL use the same backend build artifact and define a worker-specific startup command.
3. THE backend image build SHALL fail when TypeScript compilation or required dependency installation fails.
4. THE backend image SHALL run as a non-root user unless a documented runtime requirement prevents non-root execution.
5. THE backend image SHALL include a Healthcheck endpoint or command suitable for container orchestration.

### Requirement 3

**User Story:** As a developer, I want MongoDB and Redis included in the stack, so that persistence and background processing work without external infrastructure.

#### Acceptance Criteria

1. THE Backend_Stack SHALL start MongoDB with a named Persistent_Data volume for database files.
2. THE Backend_Stack SHALL start Redis with a named Persistent_Data volume when Redis persistence is enabled by configuration.
3. WHEN MongoDB or Redis is unavailable, THE Backend_API SHALL report a dependency health failure rather than reporting the dependency as ready.
4. WHEN MongoDB and Redis become healthy, THE Backend_API and Backend_Worker SHALL be able to connect using configured container-network addresses.
5. THE Backend_Stack SHALL provide restart behavior for MongoDB and Redis that is configurable and does not silently discard Persistent_Data.

### Requirement 4

**User Story:** As a developer, I want Meilisearch to replace OpenSearch, so that search runs through a simpler self-hosted service in the same stack.

#### Acceptance Criteria

1. THE Backend_API and Backend_Worker SHALL use Meilisearch as the search-service implementation for indexing and querying.
2. THE Backend_Stack SHALL define a Meilisearch Service with a named Persistent_Data volume for the search index.
3. THE backend configuration SHALL provide a Meilisearch URL and authentication key through environment variables.
4. THE backend source SHALL contain no runtime dependency on OpenSearch clients, OpenSearch URLs, or OpenSearch-specific service names after migration.
5. WHEN Meilisearch is unavailable, THE Backend_API SHALL return a controlled dependency or search error and SHALL preserve the source data in MongoDB.
6. WHEN a searchable document is indexed, THE Backend_Worker SHALL write the document to the configured Meilisearch index with the identifier required for subsequent updates and deletes.
7. WHEN a search query is received, THE Backend_API SHALL return results using the configured Meilisearch index and preserve the API's existing search response contract.

### Requirement 5

**User Story:** As an operator, I want service readiness and configuration failures to be visible, so that I can diagnose an unhealthy stack without inspecting every container manually.

#### Acceptance Criteria

1. THE Backend_Stack SHALL define a Healthcheck for MongoDB, Redis, and Meilisearch using service-appropriate readiness commands.
2. THE Backend_Stack SHALL start the Backend_API and Backend_Worker only after their required dependencies pass Healthcheck readiness.
3. WHEN a required environment variable is missing or invalid, THE Backend_API and Backend_Worker SHALL fail startup with a message naming the invalid configuration field.
4. WHEN a Service exits unexpectedly, THE Backend_Stack SHALL apply the configured restart policy and retain the Service logs through the container runtime.

### Requirement 6

**User Story:** As a developer, I want the containerized stack documented and testable, so that contributors can verify the migration without guessing commands or service assumptions.

#### Acceptance Criteria

1. THE backend documentation SHALL describe required environment variables, exposed ports, volume names, service names, and startup commands.
2. THE backend documentation SHALL provide a single command that builds and starts the Backend_Stack.
3. THE backend documentation SHALL provide a single command that stops the Backend_Stack without deleting Persistent_Data.
4. WHEN the Backend_Stack is started in a test environment, THE system SHALL verify API health, MongoDB connectivity, Redis connectivity, and Meilisearch connectivity.
5. WHEN search data is written and queried in a test environment, THE system SHALL verify that the Backend_API returns the indexed result through Meilisearch.
