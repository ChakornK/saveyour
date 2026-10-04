export type AppEnvironment = 'development' | 'test' | 'production'

export interface AppConfig {
  appEnv: AppEnvironment
  host: string
  port: number
  corsOrigins: string[]
  mongoUri: string
  mongoDatabase: string
  workerConcurrency: number
  redisUrl?: string
  seaweedfsEndpoint?: string
  seaweedfsBucket?: string
  seaweedfsAccessKey?: string
  seaweedfsSecretKey?: string
  mediaMaxBytes?: number
  ytDlpBinary?: string
  ytDlpTempDir?: string
  requestTimeoutMs?: number
  integrationFlags?: {
    cortexAnalysis: boolean
    cortexTranscription: boolean
  }
  googleClientId?: string
  googleIssuer?: string
  sessionTtlSeconds?: number
  searchUrl?: string
  searchIndex: string
  searchApiKey?: string
  geminiApiKey?: string
  geminiModel: string
  geminiTimeoutMs: number
  geminiMaxAttempts: number
  authRequired: boolean
  authTokens: Record<string, string>
  snowflakeAccount?: string
  snowflakeUser?: string
  snowflakePassword?: string
  snowflakeToken?: string
  snowflakeTokenType?: 'oauth' | 'jwt'
  snowflakeWarehouse?: string
  snowflakeDatabase?: string
  snowflakeSchema?: string
  snowflakeEndpoint?: string
  cortexModel?: string
  cortexEmbeddingModel?: string
  cortexTimeoutMs?: number
  cortexMaxAttempts?: number
}

const parseEnvironment = (value: string | undefined): AppEnvironment => {
  if (value === 'production' || value === 'test') return value
  return 'development'
}

export const loadConfig = (env: Record<string, string | undefined> = Bun.env): AppConfig => {
  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535')
  const workerConcurrency = Number(env.WORKER_CONCURRENCY ?? 2)
  if (!Number.isInteger(workerConcurrency) || workerConcurrency < 1 || workerConcurrency > 100) throw new Error('WORKER_CONCURRENCY must be an integer between 1 and 100')
  const appEnv = parseEnvironment(env.APP_ENV)
  const mediaMaxBytes = Number(env.MEDIA_MAX_BYTES ?? 25 * 1024 * 1024)
  const requestTimeoutMs = Number(env.REQUEST_TIMEOUT_MS ?? 10_000)
  const sessionTtlSeconds = Number(env.SESSION_TTL_SECONDS ?? 2_592_000)
  if (!Number.isInteger(mediaMaxBytes) || mediaMaxBytes < 1) throw new Error('MEDIA_MAX_BYTES must be a positive integer')
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 100) throw new Error('REQUEST_TIMEOUT_MS must be at least 100')
  if (!Number.isInteger(sessionTtlSeconds) || sessionTtlSeconds < 1) throw new Error('SESSION_TTL_SECONDS must be positive')
  const mongoUri = env.MONGO_URI ?? 'mongodb://127.0.0.1:27017'
  const mongoDatabase = env.MONGO_DATABASE ?? 'saveyour-tech'
  if (appEnv === 'production' && (!env.MONGO_URI || !env.MONGO_DATABASE)) throw new Error('MONGO_URI and MONGO_DATABASE are required in production')
  if (appEnv === 'production' && (!env.REDIS_URL || !env.SEARCH_URL || (!env.GEMINI_API_KEY && !env.SNOWFLAKE_ACCOUNT))) throw new Error('REDIS_URL, SEARCH_URL, and GEMINI_API_KEY or SNOWFLAKE_ACCOUNT are required in production')
  const geminiTimeoutMs = Number(env.GEMINI_TIMEOUT_MS ?? 10_000)
  const geminiMaxAttempts = Number(env.GEMINI_MAX_ATTEMPTS ?? 3)
  if (!Number.isInteger(geminiTimeoutMs) || geminiTimeoutMs < 100) throw new Error('GEMINI_TIMEOUT_MS must be at least 100')
  if (!Number.isInteger(geminiMaxAttempts) || geminiMaxAttempts < 1 || geminiMaxAttempts > 5) throw new Error('GEMINI_MAX_ATTEMPTS must be between 1 and 5')
  const authTokens = Object.fromEntries((env.AUTH_TOKENS ?? '').split(',').map((entry) => entry.split(':', 2)).filter(([token, owner]) => token && owner))
  const authRequired = env.AUTH_REQUIRED === 'true' || appEnv === 'production'
  const cortexTimeoutMs = Number(env.CORTEX_TIMEOUT_MS ?? 10_000)
  const cortexMaxAttempts = Number(env.CORTEX_MAX_ATTEMPTS ?? 3)
  if (!Number.isInteger(cortexTimeoutMs) || cortexTimeoutMs < 100) throw new Error('CORTEX_TIMEOUT_MS must be at least 100')
  if (!Number.isInteger(cortexMaxAttempts) || cortexMaxAttempts < 1 || cortexMaxAttempts > 5) throw new Error('CORTEX_MAX_ATTEMPTS must be between 1 and 5')
  return { appEnv, host: env.HOST ?? '0.0.0.0', port, corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean), mongoUri, mongoDatabase, workerConcurrency, redisUrl: env.REDIS_URL, seaweedfsEndpoint: env.SEAWEEDFS_ENDPOINT, seaweedfsBucket: env.SEAWEEDFS_BUCKET, seaweedfsAccessKey: env.SEAWEEDFS_ACCESS_KEY, seaweedfsSecretKey: env.SEAWEEDFS_SECRET_KEY, mediaMaxBytes, ytDlpBinary: env.YTDLP_BINARY ?? 'yt-dlp', ytDlpTempDir: env.YTDLP_TEMP_DIR ?? '/tmp/saveyour-tech', requestTimeoutMs, integrationFlags: { cortexAnalysis: env.CORTEX_ANALYSIS_ENABLED !== 'false', cortexTranscription: env.CORTEX_TRANSCRIPTION_ENABLED !== 'false' }, googleClientId: env.GOOGLE_CLIENT_ID, googleIssuer: env.GOOGLE_ISSUER ?? 'https://accounts.google.com', sessionTtlSeconds, searchUrl: env.SEARCH_URL, searchIndex: env.SEARCH_INDEX ?? 'saveyour-posts', searchApiKey: env.SEARCH_API_KEY, geminiApiKey: env.GEMINI_API_KEY, geminiModel: env.GEMINI_MODEL ?? 'gemini-2.0-flash', geminiTimeoutMs, geminiMaxAttempts, authRequired, authTokens, snowflakeAccount: env.SNOWFLAKE_ACCOUNT, snowflakeUser: env.SNOWFLAKE_USER, snowflakePassword: env.SNOWFLAKE_PASSWORD, snowflakeToken: env.SNOWFLAKE_TOKEN, snowflakeTokenType: env.SNOWFLAKE_TOKEN_TYPE === 'jwt' ? 'jwt' : 'oauth', snowflakeWarehouse: env.SNOWFLAKE_WAREHOUSE, snowflakeDatabase: env.SNOWFLAKE_DATABASE, snowflakeSchema: env.SNOWFLAKE_SCHEMA, snowflakeEndpoint: env.SNOWFLAKE_ENDPOINT, cortexModel: env.CORTEX_MODEL ?? 'claude-3-5-sonnet', cortexEmbeddingModel: env.CORTEX_EMBEDDING_MODEL ?? 'snowflake-arctic-embed-m-v1.5', cortexTimeoutMs, cortexMaxAttempts }
}
