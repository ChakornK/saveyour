export type AppEnvironment = "development" | "test" | "production";

export interface AppConfig {
  appEnv: AppEnvironment;
  host: string;
  port: number;
  corsOrigins: string[];
  sessionTtlSeconds?: number;
  captureRateLimit?: number;
  mediaMaxBytes?: number;
  requestTimeoutMs?: number;
  seaweedfsEndpoint?: string;
  seaweedfsBucket?: string;
  googleClientId?: string;
  mongoUri: string;
  mongoDatabase: string;
  redisUrl: string;
  geminiApiKey: string;
  searchUrl: string;
  searchIndex: string;
  searchApiKey: string;
  geminiModel: string;
  geminiTimeoutMs: number;
  geminiMaxAttempts: number;
  workerConcurrency: number;
}

const positiveInteger = (
  value: string | undefined,
  fallback: number,
  name: string,
): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const parseEnvironment = (value: string | undefined): AppEnvironment => {
  if (value === "production" || value === "test") return value;
  return "development";
};

export const loadConfig = (
  env: Record<string, string | undefined> = Bun.env,
): AppConfig => {
  const port = positiveInteger(env.PORT, 3000, "PORT");
  if (port > 65535)
    throw new Error("PORT must be an integer between 1 and 65535");

  return {
    appEnv: parseEnvironment(env.APP_ENV),
    host: env.HOST ?? "0.0.0.0",
    port,
    corsOrigins: (env.CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    sessionTtlSeconds: positiveInteger(
      env.SESSION_TTL_SECONDS,
      60 * 60 * 24 * 30,
      "SESSION_TTL_SECONDS",
    ),
    captureRateLimit: positiveInteger(
      env.CAPTURE_RATE_LIMIT,
      30,
      "CAPTURE_RATE_LIMIT",
    ),
    mediaMaxBytes: positiveInteger(
      env.MEDIA_MAX_BYTES,
      25 * 1024 * 1024,
      "MEDIA_MAX_BYTES",
    ),
    requestTimeoutMs: positiveInteger(
      env.REQUEST_TIMEOUT_MS,
      10_000,
      "REQUEST_TIMEOUT_MS",
    ),
    ...(env.SEAWEEDFS_ENDPOINT
      ? { seaweedfsEndpoint: env.SEAWEEDFS_ENDPOINT }
      : {}),
    seaweedfsBucket: env.SEAWEEDFS_BUCKET ?? "saveyour-tech",
    ...(env.GOOGLE_CLIENT_ID ? { googleClientId: env.GOOGLE_CLIENT_ID } : {}),
    mongoUri: env.MONGO_URI ?? "mongodb://127.0.0.1:27017",
    mongoDatabase: env.MONGO_DATABASE ?? "saveyour-tech",
    redisUrl: env.REDIS_URL ?? "redis://127.0.0.1:6379",
    geminiApiKey: env.GEMINI_API_KEY ?? "",
    searchUrl: env.SEARCH_URL ?? "http://127.0.0.1:9200",
    searchIndex: env.SEARCH_INDEX ?? "saveyour-tech",
    searchApiKey: env.SEARCH_API_KEY ?? "",
    geminiModel: env.GEMINI_MODEL ?? "gemini-2.5-flash",
    geminiTimeoutMs: positiveInteger(
      env.GEMINI_TIMEOUT_MS,
      30_000,
      "GEMINI_TIMEOUT_MS",
    ),
    geminiMaxAttempts: positiveInteger(
      env.GEMINI_MAX_ATTEMPTS,
      3,
      "GEMINI_MAX_ATTEMPTS",
    ),
    workerConcurrency: positiveInteger(
      env.WORKER_CONCURRENCY,
      2,
      "WORKER_CONCURRENCY",
    ),
  };
};
