import { describe, expect, test } from "bun:test";
import {
  assertSupportedSchema,
  completionKey,
  SchemaCompatibilityError,
} from "../src/modules/analysis/integration-contract";
import { InMemoryLeaseStore } from "../src/modules/analysis/leases";
import { classifyFailure, retryDecision } from "../src/modules/analysis/retry-policy";

describe("analysis integration contract", () => {
  test("accepts the supported schema and rejects unknown versions", () => {
    expect(() => assertSupportedSchema(1)).not.toThrow();
    expect(() => assertSupportedSchema(99)).toThrow(SchemaCompatibilityError);
  });

  test("builds stable completion keys", () => {
    expect(completionKey("job-1", 4)).toBe("1:job-1:4");
  });

  test("rejects stale lease owners", async () => {
    const store = new InMemoryLeaseStore();
    const first = await store.acquire("job-1", "worker-a", new Date(0).toISOString(), new Date(100_000).toISOString());
    expect(first).toBeDefined();
    const reclaimed = await store.acquire("job-1", "worker-b", new Date(200_000).toISOString(), new Date(300_000).toISOString());
    expect(reclaimed?.owner).toBe("worker-b");
    expect(await store.isCurrent(first!)).toBe(false);
  });

  test("does not retry capability failures", () => {
    const failure = classifyFailure("capability", "UNSUPPORTED", new Error("unsupported"), 1, "corr");
    expect(retryDecision(failure).retry).toBe(false);
  });
});
