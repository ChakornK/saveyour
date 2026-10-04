import { expect, test } from "bun:test";
import { checkIntegrationHealth } from "../src/modules/analysis/health";
import { InMemoryIntegrationMetrics } from "../src/modules/analysis/metrics";

test("readiness reports failed dependencies", async () => {
  const health = await checkIntegrationHealth({
    tidb: async () => false,
    redis: async () => true,
    seaweedfs: async () => true,
    cortex: async () => true,
  });
  expect(health.ready).toBe(false);
  expect(health.dependencies.tidb).toBe(false);
});

test("metrics retain correlation IDs and operational counters", () => {
  const metrics = new InMemoryIntegrationMetrics();
  metrics.stageLatency("transcription", 42, "corr-1");
  metrics.leaseConflict("corr-1");
  metrics.retryExhausted("corr-1");
  metrics.outboxBacklog(3);
  expect(metrics.latencies[0]).toEqual({
    stage: "transcription",
    milliseconds: 42,
    correlationId: "corr-1",
  });
  expect(metrics.leaseConflicts).toBe(1);
  expect(metrics.retriesExhausted).toBe(1);
  expect(metrics.backlog).toBe(3);
});
