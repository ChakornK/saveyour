import cors from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import type { AppConfig } from "./config/env";
import { healthRoutes } from "./modules/health/routes";
import { analysisRoutes } from "./modules/analysis/routes";
import { searchRoutes } from "./modules/search/routes";
import { createInfrastructure } from "./infrastructure/runtime";
import { AuthService } from "./modules/auth/service";
import { createAuthRoutes } from "./modules/auth/routes";
import { InMemoryMediaStore } from "./modules/media/store";
import { createMediaRoutes } from "./modules/media/routes";
import { captureRoutes } from "./modules/capture/routes";
import { InMemoryPostSource } from "./modules/analysis/pipeline";

export const createApp = (config: AppConfig) => {
  const auth = new AuthService();
  const media = new InMemoryMediaStore(
    config.mediaMaxBytes ?? 25 * 1024 * 1024,
  );
  const infrastructure = createInfrastructure(config);
  return new Elysia({ name: "saveyour-tech-api" })
    .use(
      openapi({
        documentation: {
          info: { title: "saveyour.tech API", version: "0.1.0" },
        },
      }),
    )
    .use(
      cors({
        origin: config.corsOrigins.length === 0 ? true : config.corsOrigins,
      }),
    )
    .onError(({ code, error, set }) => {
      const requestId = crypto.randomUUID();
      set.status = code === "NOT_FOUND" ? 404 : 500;
      const detail = error instanceof Error ? error.message : undefined;
      return {
        code: code === "NOT_FOUND" ? "NOT_FOUND" : "INTERNAL_ERROR",
        message:
          code === "NOT_FOUND"
            ? "Route not found"
            : "An unexpected error occurred",
        requestId,
        ...(config.appEnv === "development" && detail ? { detail } : {}),
      };
    })
    .use(healthRoutes)
    .use(
      analysisRoutes(
        infrastructure.analysis,
        infrastructure.analysisRepository,
        infrastructure.metrics,
      ),
    )
    .use(searchRoutes(infrastructure.search))
    .use(captureRoutes(new InMemoryPostSource(), infrastructure.analysis))
    .use(createAuthRoutes(config, auth))
    .use(createMediaRoutes(auth, media))
    .get("/", () => ({
      name: "saveyour.tech API",
      status: "ok" as const,
      version: "0.1.0",
    }));
};
