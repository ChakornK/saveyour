import snowflake from "snowflake-sdk";
import { CortexError, type CortexClient } from "./cortex-types";

export interface CortexClientConfig {
  account: string;
  user: string;
  password?: string;
  token?: string;
  tokenType?: "oauth" | "jwt";
  warehouse: string;
  database: string;
  schema: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
}

export const redactCortexDiagnostic = (value: string) =>
  value
    .replace(
      /(password|token|secret|key|sig|signature)=([^&\s]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(/https?:\/\/[^\s]+/g, "[URL_REDACTED]");

const redact = redactCortexDiagnostic;

export const redactCortexValue = (value: unknown): unknown => {
  if (typeof value === "string") return redactCortexDiagnostic(value);
  if (Array.isArray(value)) return value.map(redactCortexValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /password|token|secret|key/i.test(key)
          ? "[REDACTED]"
          : redactCortexValue(entry),
      ]),
    );
  return value;
};

const bindJson = (value: unknown) => JSON.stringify(value);

type SnowflakeRow = Record<string, unknown>;

export class SnowflakeCortexClient implements CortexClient {
  private readonly timeoutMs: number;
  private readonly capabilityCache = new Map<
    string,
    { available: boolean; checkedAt: number }
  >();
  private connection?: snowflake.Connection;

  constructor(private readonly config: CortexClientConfig) {
    if (
      !config.account ||
      !config.user ||
      !config.warehouse ||
      !config.database ||
      !config.schema
    )
      throw new CortexError(
        "configuration",
        "Snowflake Cortex configuration is incomplete",
      );
    if (!config.password && !config.token)
      throw new CortexError(
        "configuration",
        "Snowflake Cortex credential is missing",
      );
    if (config.password && config.token)
      throw new CortexError(
        "configuration",
        "Configure either a Snowflake password or token, not both",
      );
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  async executeFunction(
    functionName: string,
    args: unknown[],
    signal?: AbortSignal,
  ) {
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(functionName))
      throw new CortexError("validation", "Invalid Cortex function name");
    if (signal?.aborted)
      throw new CortexError(
        "transient",
        "Cortex request was cancelled",
        "retry",
      );

    if (functionName === "AI_COMPLETE") {
      const model = this.config.model;
      if (!model)
        throw new CortexError(
          "configuration",
          "Cortex model is required for AI_COMPLETE",
        );
      return this.execute(
        "SELECT SNOWFLAKE.CORTEX.COMPLETE(?, ?)",
        [model, JSON.stringify(args[0])],
        signal,
      );
    }

    if (functionName === "AI_EMBED") {
      return this.execute(
        "SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768(?, ?)",
        [String(args[1] ?? this.config.model ?? "snowflake-arctic-embed-m-v1.5"), String(args[0] ?? "")],
        signal,
      );
    }

    if (functionName === "AI_TRANSCRIBE") {
      return this.execute(
        "SELECT SNOWFLAKE.CORTEX.AI_TRANSCRIBE(?)",
        [bindJson(args[0])],
        signal,
      );
    }

    return this.execute(
      `SELECT ${functionName}(?)`,
      args.map(bindJson),
      signal,
    );
  }

  private async execute(
    sqlText: string,
    binds: string[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    const connection = await this.connect();
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        clearTimeout(timer);
        callback();
      };
      const onAbort = () =>
        finish(() =>
          reject(
            new CortexError(
              "transient",
              "Cortex request was cancelled",
              "retry",
            ),
          ),
        );
      const timer = setTimeout(
        () =>
          finish(() =>
            reject(
              new CortexError(
                "transient",
                "Cortex request timed out",
                "retry",
              ),
            ),
          ),
        this.timeoutMs,
      );
      signal?.addEventListener("abort", onAbort, { once: true });
      connection.execute({
        sqlText,
        binds,
        complete: (error, statement, rows) =>
          finish(() => {
            if (error) {
              const category = this.errorCategory(error);
              reject(
                new CortexError(
                  category,
                  `Cortex request failed: ${redact(error.message)}`,
                  category === "transient" ? "retry" : undefined,
                  error,
                ),
              );
              return;
            }
            const row = (rows?.[0] ?? {}) as SnowflakeRow;
            const value = row[Object.keys(row)[0]] ?? statement.getNumRows();
            if (typeof value === "string") {
              try {
                resolve(JSON.parse(value));
                return;
              } catch {
                resolve(value);
                return;
              }
            }
            resolve(value);
          }),
      });
    });
  }

  private async connect() {
    if (this.connection) return this.connection;
    const options = this.config.token
      ? {
          account: this.config.account,
          username: this.config.user,
          token: this.config.token,
          authenticator:
            this.config.tokenType === "jwt" ? "SNOWFLAKE_JWT" : "OAUTH",
          warehouse: this.config.warehouse,
          database: this.config.database,
          schema: this.config.schema,
        }
      : {
          account: this.config.account,
          username: this.config.user,
          password: this.config.password,
          warehouse: this.config.warehouse,
          database: this.config.database,
          schema: this.config.schema,
        };
    const connection = snowflake.createConnection(options);
    await new Promise<void>((resolve, reject) =>
      connection.connect((error) =>
        error
          ? reject(
              new CortexError(
                "authentication",
                `Snowflake connection failed: ${redact(error.message)}`,
                undefined,
                error,
              ),
            )
          : resolve(),
      ),
    );
    this.connection = connection;
    return connection;
  }

  private errorCategory(error: { code?: unknown }) {
    const code = String(error.code ?? "");
    if (code === "390100" || code === "390111") return "authentication" as const;
    if (code === "390112") return "authorization" as const;
    if (code.startsWith("0018")) return "capability" as const;
    return "transient" as const;
  }

  async health() {
    try {
      await this.execute("SELECT CURRENT_VERSION()", [], undefined);
      return { status: "healthy" as const };
    } catch (error) {
      return {
        status: "unhealthy" as const,
        details: error instanceof Error ? error.message : "Cortex unavailable",
      };
    }
  }

  async capability(functionName: string, ttlMs = 300_000) {
    const cached = this.capabilityCache.get(functionName);
    if (cached && Date.now() - cached.checkedAt < ttlMs) return cached.available;
    try {
      await this.executeFunction(functionName, []);
      this.capabilityCache.set(functionName, {
        available: true,
        checkedAt: Date.now(),
      });
      return true;
    } catch {
      this.capabilityCache.set(functionName, {
        available: false,
        checkedAt: Date.now(),
      });
      return false;
    }
  }

  async close() {
    if (this.connection)
      await new Promise<void>((resolve) =>
        this.connection?.destroy(() => resolve()),
      );
    this.connection = undefined;
  }
}

export class FakeCortexClient implements CortexClient {
  constructor(
    private readonly handler: (
      functionName: string,
      args: unknown[],
    ) => unknown | Promise<unknown> = (functionName, args) => ({
      functionName,
      args,
    }),
  ) {}
  executeFunction(functionName: string, args: unknown[]) {
    return Promise.resolve(this.handler(functionName, args));
  }
  health() {
    return Promise.resolve({ status: "healthy" as const });
  }
  capability() {
    return Promise.resolve(true);
  }
  close() {
    return Promise.resolve();
  }
}
