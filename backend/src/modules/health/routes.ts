import { Elysia } from 'elysia'
import type { AppConfig } from '../../config/env'
import type { MongoDatabase } from '../../infrastructure/mongo/client'

export const healthRoutes = (config?: AppConfig, mongo?: MongoDatabase) => new Elysia()
  .get('/health/live', () => ({ status: 'ok' as const }))
  .get('/health/ready', async ({ set }) => {
    if (!mongo) return { status: 'ready' as const, dependencies: { database: 'in-memory' as const } }
    try { await mongo.ping(); return { status: 'ready' as const, dependencies: { database: 'healthy' as const } } } catch (error) { set.status = 503; return { status: 'not-ready' as const, dependencies: { database: 'unhealthy' as const }, detail: config?.appEnv === 'development' && error instanceof Error ? error.message : undefined } }
  })
}
