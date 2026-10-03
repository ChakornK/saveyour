export type AppEnvironment = 'development' | 'test' | 'production'

export interface AppConfig {
  appEnv: AppEnvironment
  host: string
  port: number
  corsOrigins: string[]
}

const parseEnvironment = (value: string | undefined): AppEnvironment => {
  if (value === 'production' || value === 'test') return value
  return 'development'
}

export const loadConfig = (env: Record<string, string | undefined> = Bun.env): AppConfig => {
  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return {
    appEnv: parseEnvironment(env.APP_ENV),
    host: env.HOST ?? '0.0.0.0',
    port,
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
  }
}
