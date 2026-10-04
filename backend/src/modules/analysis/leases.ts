import type { JobLease } from "./integration-contract";

export interface LeaseStore {
  acquire(
    jobId: string,
    workerId: string,
    now: string,
    expiresAt: string,
  ): Promise<JobLease | undefined>;
  renew(
    jobId: string,
    workerId: string,
    version: number,
    expiresAt: string,
  ): Promise<JobLease | undefined>;
  reclaimExpired(now: string): Promise<number>;
  isCurrent(lease: JobLease): Promise<boolean>;
}

export class InMemoryLeaseStore implements LeaseStore {
  private readonly leases = new Map<string, JobLease>();
  private readonly versions = new Map<string, number>();

  async acquire(
    jobId: string,
    workerId: string,
    now: string,
    expiresAt: string,
  ) {
    const current = this.leases.get(jobId);
    if (
      current &&
      new Date(current.expiresAt).getTime() > new Date(now).getTime()
    )
      return undefined;
    const version = (this.versions.get(jobId) ?? 0) + 1;
    const lease = {
      jobId,
      owner: workerId,
      version,
      acquiredAt: now,
      expiresAt,
    };
    this.versions.set(jobId, version);
    this.leases.set(jobId, lease);
    return structuredClone(lease);
  }

  async renew(
    jobId: string,
    workerId: string,
    version: number,
    expiresAt: string,
  ) {
    const current = this.leases.get(jobId);
    if (!current || current.owner !== workerId || current.version !== version)
      return undefined;
    const renewed = { ...current, expiresAt };
    this.leases.set(jobId, renewed);
    return structuredClone(renewed);
  }

  async reclaimExpired(now: string) {
    const timestamp = new Date(now).getTime();
    let count = 0;
    for (const [jobId, lease] of this.leases) {
      if (new Date(lease.expiresAt).getTime() <= timestamp) {
        this.leases.delete(jobId);
        count += 1;
      }
    }
    return count;
  }

  async isCurrent(lease: JobLease) {
    const current = this.leases.get(lease.jobId);
    return Boolean(
      current &&
      current.owner === lease.owner &&
      current.version === lease.version &&
      new Date(current.expiresAt).getTime() > Date.now(),
    );
  }
}
