import { CortexError, type CortexClient } from './cortex-types'

export interface CortexClientConfig {
  account: string
  user: string
  password?: string
  token?: string
  warehouse: string
  database: string
  schema: string
  endpoint?: string
  timeoutMs?: number
}

const redact = (value: string) => value.replace(/(password|token|secret|key|sig|signature)=([^&\s]+)/gi, '$1=[REDACTED]').replace(/https?:\/\/[^\s]+/g, '[URL_REDACTED]')

export class SnowflakeCortexClient implements CortexClient {
  private readonly timeoutMs
  private readonly capabilityCache = new Map<string, { available: boolean; checkedAt: number }>()
  constructor(private readonly config: CortexClientConfig) {
    if (!config.account || !config.user || !config.warehouse || !config.database || !config.schema) throw new CortexError('configuration', 'Snowflake Cortex configuration is incomplete')
    if (!config.password && !config.token) throw new CortexError('configuration', 'Snowflake Cortex credential is missing')
    this.timeoutMs = config.timeoutMs ?? 10_000
  }

  async executeFunction(functionName: string, args: unknown[], signal?: AbortSignal) {
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(functionName)) throw new CortexError('validation', 'Invalid Cortex function name')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
    try {
      const response = await fetch(this.config.endpoint ?? `https://${this.config.account}.snowflakecomputing.com/api/v2/statements`, { method: 'POST', signal: combined, headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.token ?? this.config.password}` }, body: JSON.stringify({ statement: `SELECT ${functionName}(?)`, bindings: args.map((value) => ({ type: 'TEXT', value: JSON.stringify(value) })), warehouse: this.config.warehouse, database: this.config.database, schema: this.config.schema }) })
      if (response.ok) return (await response.json()) as unknown
      const message = redact(await response.text())
      const category = response.status === 401 ? 'authentication' : response.status === 403 ? 'authorization' : response.status === 429 || response.status >= 500 ? 'transient' : response.status === 404 ? 'capability' : 'permanent'
      throw new CortexError(category, `Cortex request failed with status ${response.status}: ${message}`)
    } catch (error) {
      if (error instanceof CortexError) throw error
      if (error instanceof DOMException && error.name === 'AbortError') throw new CortexError('transient', 'Cortex request timed out', 'retry')
      throw new CortexError('transient', `Cortex request failed: ${redact(error instanceof Error ? error.message : 'unknown error')}`, 'retry', error)
    } finally { clearTimeout(timer) }
  }

  async health() { try { await this.executeFunction('CURRENT_VERSION', []); return { status: 'healthy' as const } } catch (error) { return { status: 'unhealthy' as const, details: error instanceof Error ? error.message : 'Cortex unavailable' } } }
  async capability(functionName: string, ttlMs = 300_000) { const cached = this.capabilityCache.get(functionName); if (cached && Date.now() - cached.checkedAt < ttlMs) return cached.available; try { await this.executeFunction(functionName, []); this.capabilityCache.set(functionName, { available: true, checkedAt: Date.now() }); return true } catch { this.capabilityCache.set(functionName, { available: false, checkedAt: Date.now() }); return false } }
  async close() {}
}

export class FakeCortexClient implements CortexClient {
  constructor(private readonly handler: (functionName: string, args: unknown[]) => unknown | Promise<unknown> = (functionName, args) => ({ functionName, args })) {}
  executeFunction(functionName: string, args: unknown[]) { return Promise.resolve(this.handler(functionName, args)) }
  health() { return Promise.resolve({ status: 'healthy' as const }) }
  capability() { return Promise.resolve(true) }
  close() { return Promise.resolve() }
}
