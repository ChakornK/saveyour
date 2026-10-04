import snowflake from 'snowflake-sdk'
import { CortexError, type CortexClient } from './cortex-types'

export interface CortexClientConfig {
  account: string
  user: string
  password?: string
  token?: string
  tokenType?: 'oauth' | 'jwt'
  warehouse: string
  database: string
  schema: string
  endpoint?: string
  timeoutMs?: number
}

export const redactCortexDiagnostic = (value: string) => value.replace(/(password|token|secret|key|sig|signature)=([^&\s]+)/gi, '$1=[REDACTED]').replace(/https?:\/\/[^\s]+/g, '[URL_REDACTED]')
const redact = redactCortexDiagnostic
export const redactCortexValue = (value: unknown): unknown => {
  if (typeof value === 'string') return redactCortexDiagnostic(value)
  if (Array.isArray(value)) return value.map(redactCortexValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key.match(/password|token|secret|key/i) ? key : key, key.match(/password|token|secret|key/i) ? '[REDACTED]' : redactCortexValue(entry)]))
  return value
}

export class SnowflakeCortexClient implements CortexClient {
  private readonly timeoutMs
  private readonly capabilityCache = new Map<string, { available: boolean; checkedAt: number }>()
  private connection?: snowflake.Connection
  constructor(private readonly config: CortexClientConfig) {
    if (!config.account || !config.user || !config.warehouse || !config.database || !config.schema) throw new CortexError('configuration', 'Snowflake Cortex configuration is incomplete')
    if (!config.password && !config.token) throw new CortexError('configuration', 'Snowflake Cortex credential is missing')
    if (config.password && config.token) throw new CortexError('configuration', 'Configure either a Snowflake password or token, not both')
    this.timeoutMs = config.timeoutMs ?? 10_000
  }

  async executeFunction(functionName: string, args: unknown[], signal?: AbortSignal) {
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(functionName)) throw new CortexError('validation', 'Invalid Cortex function name')
    if (signal?.aborted) throw new CortexError('transient', 'Cortex request was cancelled', 'retry')
    const connection = await this.connect()
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new CortexError('transient', 'Cortex request timed out', 'retry')), this.timeoutMs)
      connection.execute({ sqlText: `SELECT ${functionName}(?)`, binds: args.map((value) => JSON.stringify(value)), complete: (error, statement, rows) => { clearTimeout(timer); if (error) { reject(new CortexError(this.errorCategory(error), `Cortex request failed: ${redact(error.message)}`, this.errorCategory(error) === 'transient' ? 'retry' : undefined, error)); return } resolve(rows?.[0] ?? statement.getNumRows()) } })
    })
  }

  private async connect() {
    if (this.connection) return this.connection
    const connection = snowflake.createConnection(this.config.token ? { account: this.config.account, username: this.config.user, token: this.config.token, authenticator: this.config.tokenType === 'jwt' ? 'SNOWFLAKE_JWT' : 'OAUTH', warehouse: this.config.warehouse, database: this.config.database, schema: this.config.schema } : { account: this.config.account, username: this.config.user, password: this.config.password, warehouse: this.config.warehouse, database: this.config.database, schema: this.config.schema })
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      this.connection = connection
      return connection
    }
    await new Promise<void>((resolve, reject) => connection.connect((error) => error ? reject(new CortexError('authentication', `Snowflake connection failed: ${redact(error.message)}`, undefined, error)) : resolve()))
    this.connection = connection
    return connection
  }

  private errorCategory(error: { code?: unknown }) { const code = String(error.code ?? ''); return code === '390100' || code === '390111' ? 'authentication' as const : code === '390112' ? 'authorization' as const : 'transient' as const }

  async health() { try { await this.executeFunction('CURRENT_VERSION', []); return { status: 'healthy' as const } } catch (error) { return { status: 'unhealthy' as const, details: error instanceof Error ? error.message : 'Cortex unavailable' } } }
  async capability(functionName: string, ttlMs = 300_000) { const cached = this.capabilityCache.get(functionName); if (cached && Date.now() - cached.checkedAt < ttlMs) return cached.available; try { await this.executeFunction(functionName, []); this.capabilityCache.set(functionName, { available: true, checkedAt: Date.now() }); return true } catch { this.capabilityCache.set(functionName, { available: false, checkedAt: Date.now() }); return false } }
  async close() { if (this.connection) await new Promise<void>((resolve) => this.connection?.destroy(() => resolve())); this.connection = undefined }
}

export class FakeCortexClient implements CortexClient {
  constructor(private readonly handler: (functionName: string, args: unknown[]) => unknown | Promise<unknown> = (functionName, args) => ({ functionName, args })) {}
  executeFunction(functionName: string, args: unknown[]) { return Promise.resolve(this.handler(functionName, args)) }
  health() { return Promise.resolve({ status: 'healthy' as const }) }
  capability() { return Promise.resolve(true) }
  close() { return Promise.resolve() }
}
