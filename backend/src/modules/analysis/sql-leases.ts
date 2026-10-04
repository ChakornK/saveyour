import type { JobLease } from "./integration-contract";
import type { LeaseStore } from "./leases";
import type { SqlExecutor } from "./tidb-port";

export class SqlLeaseStore implements LeaseStore {
  constructor(private readonly db: SqlExecutor) {}

  async acquire(
    jobId: string,
    workerId: string,
    now: string,
    expiresAt: string,
  ): Promise<JobLease | undefined> {
    await this.db.query(
      "UPDATE analysis_jobs SET lease_owner = ?, lease_version = lease_version + 1, lease_expires_at = ?, status = 'processing', updated_at = ? WHERE id = ? AND (lease_expires_at IS NULL OR lease_expires_at <= ?)",
      [workerId, expiresAt, now, jobId, now],
    );
    const rows = await this.db.query<{
      lease_version: number;
      created_at: string;
      lease_expires_at: string;
    }>(
      "SELECT lease_version, created_at, lease_expires_at FROM analysis_jobs WHERE id = ? AND lease_owner = ?",
      [jobId, workerId],
    );
    const row = rows[0];
    return row
      ? {
          jobId,
          owner: workerId,
          version: row.lease_version,
          acquiredAt: row.created_at,
          expiresAt: row.lease_expires_at,
        }
      : undefined;
  }

  async renew(
    jobId: string,
    workerId: string,
    version: number,
    expiresAt: string,
  ): Promise<JobLease | undefined> {
    await this.db.query(
      "UPDATE analysis_jobs SET lease_expires_at = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND lease_owner = ? AND lease_version = ?",
      [expiresAt, jobId, workerId, version],
    );
    const rows = await this.db.query<JobLease>(
      "SELECT id AS jobId, lease_owner AS owner, lease_version AS version, created_at AS acquiredAt, lease_expires_at AS expiresAt FROM analysis_jobs WHERE id = ? AND lease_owner = ? AND lease_version = ?",
      [jobId, workerId, version],
    );
    return rows[0];
  }

  async reclaimExpired(now: string): Promise<number> {
    const rows = await this.db.query<{ id: string }>(
      "SELECT id FROM analysis_jobs WHERE lease_expires_at IS NOT NULL AND lease_expires_at <= ?",
      [now],
    );
    await this.db.query(
      "UPDATE analysis_jobs SET lease_owner = NULL, lease_expires_at = NULL, status = 'queued', updated_at = ? WHERE lease_expires_at IS NOT NULL AND lease_expires_at <= ?",
      [now, now],
    );
    return rows.length;
  }

  async isCurrent(lease: JobLease): Promise<boolean> {
    const rows = await this.db.query(
      "SELECT id FROM analysis_jobs WHERE id = ? AND lease_owner = ? AND lease_version = ? AND lease_expires_at > CURRENT_TIMESTAMP(3)",
      [lease.jobId, lease.owner, lease.version],
    );
    return Boolean(rows[0]);
  }
}
