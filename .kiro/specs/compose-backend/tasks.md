# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Complete Backend Service Set
  - **CRITICAL**: Write this validation before implementation; it must demonstrate that the unfixed `backend/docker-compose.yml` omits `api`, `worker`, and `downloader`.
  - Parse both Compose files and assert that the backend-scoped file does not yet contain all required services.
  - Run `docker compose -f backend/docker-compose.yml config` on the unfixed file where Docker is available, or use YAML inspection when it is not.
  - **EXPECTED OUTCOME**: The unfixed backend file fails the complete-service assertion; document the missing services.
  - _Requirements: 1.2, 2.1_

- [ ] 2. Write preservation property tests
  - **Property 2: Preservation** - Existing Runtime Configuration
  - **IMPORTANT**: Follow observation-first methodology.
  - Capture the root Compose service commands, ports, named volumes, health checks, dependency conditions, and environment wiring before modifying configuration.
  - Assert the post-change backend Compose file preserves those values for equivalent services.
  - **EXPECTED OUTCOME**: Baseline preservation assertions pass against the unfixed root configuration.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Make backend Compose the canonical complete stack

  - [ ] 3.1 Implement the configuration change
    - Merge `api`, `worker`, and `downloader` from the root `docker-compose.yml` into `backend/docker-compose.yml`.
    - Adjust relative build and env-file paths for the backend Compose file: use `context: .` and `env_file: [.env]` when running with `-f backend/docker-compose.yml` from the repository root, or document the supported working directory consistently.
    - Preserve infrastructure health checks, named volumes, service commands, ports, and dependency conditions.
    - Remove the duplicate root `docker-compose.yml`.
    - Update `README.md` with `docker compose -f backend/docker-compose.yml up --build` as the single backend startup command.
    - Inspect `backend/Dockerfile`; retain it unless validation identifies a necessary fix.
    - _Bug_Condition: isBugCondition(input) where the selected Compose file does not define all seven required services._
    - _Expected_Behavior: The backend-scoped command starts `api`, `worker`, `downloader`, `mongo`, `redis`, `seaweedfs`, and `meilisearch`._
    - _Preservation: Existing backend runtime commands, ports, volumes, health checks, and environment wiring remain unchanged._
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Complete Backend Service Set
    - Re-run the same validation from task 1 after implementation.
    - **EXPECTED OUTCOME**: The backend Compose file defines all seven required services.
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Runtime Configuration
    - Re-run the same preservation assertions from task 2.
    - **EXPECTED OUTCOME**: Existing commands, ports, volumes, health checks, dependencies, and environment wiring remain preserved.
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Checkpoint - Validate the complete backend stack
  - Run `docker compose -f backend/docker-compose.yml config`.
  - If Docker is available, run `docker compose -f backend/docker-compose.yml up --build -d`, inspect service status and API reachability, then run `docker compose -f backend/docker-compose.yml down`.
  - Run applicable backend tests.
  - Ensure no duplicate Compose YAML remains and the working tree contains only intended changes.
