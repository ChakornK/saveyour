import { Elysia } from "elysia";

export const healthRoutes = new Elysia({ name: "health" })
  .get("/health/live", () => ({ status: "ok" as const }))
  .get("/health/ready", () => ({
    status: "ok" as const,
    checks: { api: "ok" as const },
  }));
