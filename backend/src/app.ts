import cors from '@elysiajs/cors'
import openapi from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import type { AppConfig } from './config/env'
import { healthRoutes } from './modules/health/routes'

export const createApp = (config: AppConfig) =>
  new Elysia({ name: 'saveyour-tech-api' })
    .use(openapi({ documentation: { info: { title: 'saveyour.tech API', version: '0.1.0' } } }))
    .use(cors({ origin: config.corsOrigins.length === 0 ? true : config.corsOrigins }))
    .onError(({ code, error, set }) => {
      const requestId = crypto.randomUUID()
      set.status = code === 'NOT_FOUND' ? 404 : 500
      const detail = error instanceof Error ? error.message : undefined
      return {
        code: code === 'NOT_FOUND' ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: code === 'NOT_FOUND' ? 'Route not found' : 'An unexpected error occurred',
        requestId,
        ...(config.appEnv === 'development' && detail ? { detail } : {})
      }
    })
    .use(healthRoutes)
    .get('/', () => ({ name: 'saveyour.tech API', status: 'ok' as const, version: '0.1.0' }))
