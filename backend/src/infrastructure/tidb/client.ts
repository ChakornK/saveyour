import type { SqlExecutor } from "../../modules/analysis/tidb-port";

export interface TiDBConfig {
  url: string;
  user: string;
  password: string;
  database: string;
}

export class HttpTiDBExecutor implements SqlExecutor {
  constructor(private readonly config: TiDBConfig) {}

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const response = await fetch(`${this.config.url}/query`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${btoa(`${this.config.user}:${this.config.password}`)}`,
      },
      body: JSON.stringify({ database: this.config.database, sql, params }),
    });
    if (!response.ok) throw new Error(`TiDB query failed: ${response.status}`);
    const payload = (await response.json()) as { rows?: T[] };
    return payload.rows ?? [];
  }

  async transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    await this.query("BEGIN");
    try {
      const result = await work(this);
      await this.query("COMMIT");
      return result;
    } catch (error) {
      await this.query("ROLLBACK");
      throw error;
    }
  }
}
