import { expect, test } from "bun:test";
import { SqlOutbox } from "../src/modules/analysis/sql-outbox";
import { SqlLeaseStore } from "../src/modules/analysis/sql-leases";
import type { SqlExecutor } from "../src/modules/analysis/tidb-port";

class FakeSql implements SqlExecutor {
  calls: string[] = [];
  async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    this.calls.push(sql);
    if (sql.startsWith("SELECT event_id")) return [];
    if (sql.includes("SELECT lease_version")) return [{ lease_version: 1, created_at: "now", lease_expires_at: "later" }] as T[];
    return [];
  }
  async transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> { return work(this); }
}

test("SQL outbox persists terminal delivery state", async () => {
  const db = new FakeSql();
  const outbox = new SqlOutbox(db);
  await outbox.markDeadLetter("event-1", 5, "failed");
  expect(db.calls.some((sql) => sql.includes("dead-letter"))).toBe(true);
});

test("SQL leases return the current lease version", async () => {
  const db = new FakeSql();
  const lease = await new SqlLeaseStore(db).acquire("job-1", "worker-1", "now", "later");
  expect(lease?.version).toBe(1);
});
