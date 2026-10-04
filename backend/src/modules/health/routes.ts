import { Elysia } from "elysia";
import type { IntegrationHealth } from "../analysis/health";

export const healthRoutes = (getHealth?: () => Promise<IntegrationHealth>) =>
  new Elysia({ name: "health" })
    .get("/health/live", () => ({ status: "ok" as const }))
    .get("/health/ready", async ({ set }) => {
      const health = getHealth
        ? await getHealth()
        : { ready: true, dependencies: { api: true } };
      if (!health.ready) set.status = 503;
      return {
        status: health.ready ? ("ok" as const) : ("degraded" as const),
        checks: health.dependencies,
      };
    });
