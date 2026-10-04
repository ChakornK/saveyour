CREATE TABLE IF NOT EXISTS analysis_jobs (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  correlation_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  schema_version INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  lease_owner VARCHAR(255),
  lease_version BIGINT NOT NULL DEFAULT 0,
  lease_expires_at TIMESTAMP NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL,
  UNIQUE KEY analysis_jobs_owner_idempotency (owner_id, idempotency_key),
  KEY analysis_jobs_lease (status, lease_expires_at)
);

CREATE TABLE IF NOT EXISTS analysis_outbox (
  event_id CHAR(36) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  owner_id CHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  correlation_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP(3) NULL,
  last_error TEXT,
  created_at TIMESTAMP(3) NOT NULL,
  delivered_at TIMESTAMP(3) NULL,
  UNIQUE KEY analysis_outbox_idempotency (event_type, idempotency_key),
  KEY analysis_outbox_pending (status, next_attempt_at, created_at)
);

CREATE TABLE IF NOT EXISTS analysis_job_context (
  job_id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  schema_version INT NOT NULL,
  correlation_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  post_version INT NOT NULL,
  requested_stages JSON NOT NULL,
  media JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_stage_states (
  job_id CHAR(36) NOT NULL,
  stage VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  payload JSON,
  updated_at TIMESTAMP(3) NOT NULL,
  PRIMARY KEY (job_id, stage)
);

CREATE TABLE IF NOT EXISTS analysis_results (
  result_key VARCHAR(255) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  media_asset_id CHAR(36),
  payload JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_completions (
  completion_key VARCHAR(255) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  lease_version BIGINT NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL
);
