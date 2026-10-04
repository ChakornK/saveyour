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
  searchUrl?: string
  searchIndex: string
  searchApiKey?: string
  geminiApiKey?: string
  geminiModel: string
  geminiTimeoutMs: number
  geminiMaxAttempts: number
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
  const mongoUri = env.MONGO_URI ?? 'mongodb://127.0.0.1:27017'
  const mongoDatabase = env.MONGO_DATABASE ?? 'saveyour-tech'
  if (appEnv === 'production' && (!env.MONGO_URI || !env.MONGO_DATABASE)) throw new Error('MONGO_URI and MONGO_DATABASE are required in production')
  if (appEnv === 'production' && (!env.REDIS_URL || !env.SEARCH_URL || !env.GEMINI_API_KEY)) throw new Error('REDIS_URL, SEARCH_URL, and GEMINI_API_KEY are required in production')
  const geminiTimeoutMs = Number(env.GEMINI_TIMEOUT_MS ?? 10_000)
  const geminiMaxAttempts = Number(env.GEMINI_MAX_ATTEMPTS ?? 3)
  if (!Number.isInteger(geminiTimeoutMs) || geminiTimeoutMs < 100) throw new Error('GEMINI_TIMEOUT_MS must be at least 100')
  if (!Number.isInteger(geminiMaxAttempts) || geminiMaxAttempts < 1 || geminiMaxAttempts > 5) throw new Error('GEMINI_MAX_ATTEMPTS must be between 1 and 5')
  return { appEnv, host: env.HOST ?? '0.0.0.0', port, corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean), mongoUri, mongoDatabase, workerConcurrency, redisUrl: env.REDIS_URL, searchUrl: env.SEARCH_URL, searchIndex: env.SEARCH_INDEX ?? 'saveyour-posts', searchApiKey: env.SEARCH_API_KEY, geminiApiKey: env.GEMINI_API_KEY, geminiModel: env.GEMINI_MODEL ?? 'gemini-2.0-flash', geminiTimeoutMs, geminiMaxAttempts }
}
