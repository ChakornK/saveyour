import { describe, expect, test } from 'bun:test'
import { loadConfig } from '../src/config/env'

describe('loadConfig', () => {
  test('loads defaults', () => {
    expect(loadConfig({})).toEqual({
      appEnv: 'development',
      host: '0.0.0.0',
      port: 3000,
      corsOrigins: []
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
