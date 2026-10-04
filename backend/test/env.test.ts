import { describe, expect, test } from 'bun:test'
import { loadConfig } from '../src/config/env'

describe('loadConfig', () => {
  test('loads defaults', () => {
    expect(loadConfig({})).toEqual({
      appEnv: 'development',
      host: '0.0.0.0',
      port: 3000,
      corsOrigins: [],
      mongoUri: 'mongodb://127.0.0.1:27017',
      mongoDatabase: 'saveyour-tech',
      workerConcurrency: 2,
      redisUrl: undefined,
      searchUrl: undefined,
      searchApiKey: undefined,
      searchIndex: 'saveyour-posts',
      geminiModel: 'gemini-2.0-flash',
      geminiTimeoutMs: 10000,
      geminiMaxAttempts: 3,
      authRequired: false,
      authTokens: {},
      snowflakeAccount: undefined,
      snowflakeUser: undefined,
      snowflakePassword: undefined,
      snowflakeToken: undefined,
      snowflakeWarehouse: undefined,
      snowflakeDatabase: undefined,
      snowflakeSchema: undefined,
      snowflakeEndpoint: undefined,
      cortexModel: 'claude-3-5-sonnet',
      cortexEmbeddingModel: 'snowflake-arctic-embed-m-v1.5',
      cortexTimeoutMs: 10000,
      cortexMaxAttempts: 3
    })
  })

  test('parses comma-separated origins', () => {
    expect(loadConfig({ PORT: '4100', HOST: '127.0.0.1', CORS_ORIGINS: 'http://a, http://b' })).toMatchObject({
      port: 4100,
      host: '127.0.0.1',
      corsOrigins: ['http://a', 'http://b']
    })
  })
})
