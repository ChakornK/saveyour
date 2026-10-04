import cors from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import type { AppConfig } from "./config/env";
import { healthRoutes } from "./modules/health/routes";
import { InMemorySearchIndex } from "./modules/search/in-memory-index";
import { SearchService } from "./modules/search/service";
import { searchRoutes } from "./modules/search/routes";
import { InMemoryAnalysisRepository } from "./modules/analysis/repository";
import { AnalysisOrchestrator } from "./modules/analysis/orchestrator";
import { FakeAiProvider } from "./modules/analysis/provider";
import {
  InMemoryPostSource,
  AnalysisPipeline,
} from "./modules/analysis/pipeline";
import { InMemoryDerivedPostStore } from "./modules/analysis/events";
import { InMemoryAnalysisMetrics } from "./modules/analysis/observability";
import { analysisRoutes } from "./modules/analysis/routes";
import { TagSuggestionService } from "./modules/search/suggestions";
import { MongoDatabase } from "./infrastructure/mongo/client";
import { MongoAnalysisRepository } from "./infrastructure/mongo/analysis-repository";
import { MongoDerivedPostStore } from "./infrastructure/mongo/derived-post-store";
import { MongoPostSource } from "./infrastructure/mongo/post-source";
import { MongoOutbox } from "./infrastructure/mongo/outbox";
import { MeilisearchIndex } from "./infrastructure/search/meilisearch-index";
import { SearchEventDelivery } from "./infrastructure/search/event-index-delivery";
import { GeminiProvider } from "./infrastructure/ai/gemini-provider";
import { SnowflakeCortexClient } from "./infrastructure/ai/cortex-client";
import { CortexAnalysisProvider } from "./infrastructure/ai/cortex-provider";
import { InMemoryJobQueue } from "./modules/analysis/queue";
import { QueuePublisher } from "./modules/analysis/queue-publisher";
import { RedisClientAdapter } from "./infrastructure/queue/redis-client";
import { RedisJobQueue } from "./infrastructure/queue/redis-queue";
import { InMemoryRateLimitStore, rateLimit } from "./modules/limits/rate-limit";
import { authentication } from "./modules/auth/auth";
import { authContext } from "./modules/auth/context";
import { captureRoutes } from "./modules/capture/routes";
import { captureApiRoutes } from "./modules/capture/api-routes";
import { CaptureService } from "./modules/capture/service";
import { InMemoryCaptureRepository } from "./modules/capture/repository";
import { MongoCaptureRepository } from "./modules/capture/persistent-repository";
import { AuthService, GoogleWebCryptoVerifier } from "./modules/auth/service";
import { createAuthRoutes } from "./modules/auth/routes";
import {
  InMemoryAccountRepository,
  InMemorySessionRepository,
} from "./modules/auth/service";
import {
  MongoAccountRepository,
  MongoSessionRepository,
} from "./infrastructure/mongo/auth-repositories";
import { initializeSearchIndex } from "./infrastructure/search/index-init";
import { profileRoutes } from "./modules/profile/routes";
import { albumRoutes } from "./modules/albums/routes";
import { AlbumService } from "./modules/albums/service";
import { InMemoryAlbumRepository } from "./modules/albums/repository";
import { MongoAlbumRepository } from "./infrastructure/mongo/album-repository";
import { MongoMediaAssetRepository } from "./modules/media/repository";
import { SeaweedFsMediaStore } from "./infrastructure/media/seaweedfs-store";
import { CaptureMediaWorkflow } from "./modules/capture/media-workflow";

export const createApp = (config: AppConfig) => {
  const useProduction = config.appEnv === "production";
  const useDurableInfrastructure = Boolean(config.mongoUri && config.redisUrl);
  const mongo = useDurableInfrastructure
    ? new MongoDatabase({
        uri: config.mongoUri,
        database: config.mongoDatabase,
      })
    : undefined;
  const repository = useProduction
    ? new MongoAnalysisRepository(mongo!)
    : new InMemoryAnalysisRepository();
  const derivedStore = useProduction
    ? new MongoDerivedPostStore(mongo!)
    : new InMemoryDerivedPostStore();
  const source = useProduction
    ? new MongoPostSource(mongo!)
    : new InMemoryPostSource();
  const mediaRepository = useProduction
    ? new MongoMediaAssetRepository(mongo!)
    : undefined;
  const mediaStore =
    useProduction && mediaRepository && config.seaweedfsEndpoint
      ? new SeaweedFsMediaStore(
          {
            endpoint: config.seaweedfsEndpoint,
            bucket: config.seaweedfsBucket ?? "saveyour-tech",
            accessKey: config.seaweedfsAccessKey,
            secretKey: config.seaweedfsSecretKey,
            maxBytes: config.mediaMaxBytes ?? 25 * 1024 * 1024,
          },
          mediaRepository,
        )
      : undefined;
  const mediaWorkflow = mediaStore
    ? new CaptureMediaWorkflow(mediaStore)
    : undefined;
  const searchConfig =
    useProduction && config.searchUrl
      ? {
          url: config.searchUrl,
          index: config.searchIndex,
          apiKey: config.searchApiKey,
        }
      : undefined;
  const searchIndex = searchConfig
    ? new MeilisearchIndex(searchConfig)
    : new InMemorySearchIndex();
  const searchService = new SearchService(searchIndex);
  const redis =
    useDurableInfrastructure && config.redisUrl
      ? new RedisClientAdapter(config.redisUrl)
      : undefined;
  const initialize = async () => {
    if (redis) await redis.connect();
    if (mongo) {
      await mongo.connect();
      await Promise.all([
        new MongoAnalysisRepository(mongo).ensureIndexes(),
        new MongoDerivedPostStore(mongo).ensureIndexes(),
        new MongoPostSource(mongo).ensureIndexes(),
        new MongoOutbox(mongo).ensureIndexes(),
        new MongoCaptureRepository(mongo).ensureIndexes(),
        new MongoAccountRepository(mongo).ensureIndexes(),
        new MongoSessionRepository(mongo).ensureIndexes(),
        new MongoAlbumRepository(mongo).ensureIndexes(),
        mediaRepository?.ensureIndexes(),
      ]);
    }
    await initializeSearchIndex(searchIndex, searchConfig);
  };
  const metrics = new InMemoryAnalysisMetrics();
  const provider =
    useProduction &&
    config.snowflakeAccount &&
    config.snowflakeUser &&
    config.snowflakeWarehouse &&
    config.snowflakeDatabase &&
    config.snowflakeSchema &&
    (config.snowflakePassword || config.snowflakeToken)
      ? new CortexAnalysisProvider(
          new SnowflakeCortexClient({
            account: config.snowflakeAccount,
            user: config.snowflakeUser,
            password: config.snowflakePassword,
            token: config.snowflakeToken,
            tokenType: config.snowflakeTokenType,
            warehouse: config.snowflakeWarehouse,
            database: config.snowflakeDatabase,
            schema: config.snowflakeSchema,
            endpoint: config.snowflakeEndpoint,
            timeoutMs: config.cortexTimeoutMs ?? 10_000,
          }),
          {
            model: config.cortexModel ?? "claude-3-5-sonnet",
            embeddingModel:
              config.cortexEmbeddingModel ?? "snowflake-arctic-embed-m-v1.5",
            maxAttempts: config.cortexMaxAttempts ?? 3,
          },
        )
      : useProduction && config.geminiApiKey
        ? new GeminiProvider({
            apiKey: config.geminiApiKey,
            model: config.geminiModel,
            timeoutMs: config.geminiTimeoutMs,
            maxAttempts: config.geminiMaxAttempts,
          })
        : new FakeAiProvider();
  const pipeline = new AnalysisPipeline(source, derivedStore, provider);
  const queue = redis
    ? new RedisJobQueue(redis, repository)
    : new InMemoryJobQueue(repository);
  const orchestrator = new AnalysisOrchestrator(
    repository,
    pipeline,
    3,
    undefined,
    new QueuePublisher(queue),
  );
  const authAccounts = useDurableInfrastructure
    ? new MongoAccountRepository(mongo!)
    : new InMemoryAccountRepository();
  const authSessions = useDurableInfrastructure
    ? new MongoSessionRepository(mongo!)
    : new InMemorySessionRepository();
  const authService = new AuthService(
    authAccounts,
    authSessions,
    new GoogleWebCryptoVerifier("https://www.googleapis.com/oauth2/v3/certs"),
  );
  const captureRepository = useDurableInfrastructure
    ? new MongoCaptureRepository(mongo!)
    : new InMemoryCaptureRepository();
  const captureService = new CaptureService(captureRepository);
  const albumRepository = useDurableInfrastructure
    ? new MongoAlbumRepository(mongo!)
    : new InMemoryAlbumRepository();
  const albumService = new AlbumService(albumRepository, captureRepository);
  const app = new Elysia({ name: "saveyour-tech-api" })
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
    .use(rateLimit(new InMemoryRateLimitStore(), 120, 60_000))
    .use(authContext(authService))
    .use(
      authentication({
        required: config.authRequired,
        tokens: config.authTokens,
        authenticate: async (token) => {
          try {
            return (await authService.authenticate(token)).ownerId;
          } catch (error) {
            if (!config.authRequired && config.authTokens[token]) {
              return config.authTokens[token];
            }
            throw error;
          }
        },
      }),
    )
    .onError(({ code, error, set }) => {
      const requestId = crypto.randomUUID();
      const status =
        code === "NOT_FOUND" ? 404 : code === "VALIDATION" ? 400 : 500;
      set.status = status;
      const detail = error instanceof Error ? error.message : undefined;
      return {
        code:
          code === "NOT_FOUND"
            ? "NOT_FOUND"
            : code === "VALIDATION"
              ? "VALIDATION_ERROR"
              : "INTERNAL_ERROR",
        message:
          code === "NOT_FOUND"
            ? "Route not found"
            : code === "VALIDATION"
              ? "Request validation failed"
              : "An unexpected error occurred",
        requestId,
        ...(config.appEnv !== "production" && detail ? { detail } : {}),
      };
    })
    .use(healthRoutes())
    .use(createAuthRoutes(config, authService))
    .use(captureApiRoutes(captureService, authService))
    .use(profileRoutes(authService, captureService))
    .use(albumRoutes(albumService, authService))
    .use(analysisRoutes(orchestrator, repository, metrics))
    .use(captureRoutes(source, orchestrator, mediaWorkflow, mediaStore))
    .use(searchRoutes(searchService, new TagSuggestionService(derivedStore)))
    .get("/", () => ({
      name: "saveyour.tech API",
      status: "ok" as const,
      version: "0.1.0",
    }));
  return Object.assign(app, {
    auth: authService,
    initialize,
    close: async () => {
      await redis?.close();
      await mongo?.close();
    },
  });
};
