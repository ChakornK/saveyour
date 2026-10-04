import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { OwnerScope } from "../capture/types";

export interface GoogleClaims {
  issuer: string;
  audience: string;
  nonce: string;
  subject: string;
  email: string;
  expiresAt: number;
}

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  issuer: string;
  audience: string;
  expiresAt: number;
}
export interface Account {
  id: string;
  provider: "google";
  googleSubject: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}
export interface SessionRecord { id: string; accountId: string; tokenHash: string; expiresAt: number; revokedAt?: number; }
export interface AccountRepository { findByGoogleSubject(subject: string): Promise<Account | null | undefined>; create(account: Account): Promise<Account>; }
export interface SessionRepository { create(session: SessionRecord): Promise<void>; findByTokenHash(hash: string): Promise<SessionRecord | undefined>; revokeByTokenHash(hash: string, revokedAt: number): Promise<void>; ensureIndexes(): Promise<void>; }
export interface AuthRedis {
  set(key: string, value: string, options?: { EX: number; NX?: boolean }): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}
export interface GoogleTokenVerifier {
  verify(token: string, expected: { clientId: string; issuer: string }): Promise<VerifiedGoogleIdentity>;
}

export class AuthError extends Error { constructor(public readonly code: "AUTH_INVALID" | "AUTH_EXPIRED" | "AUTH_REQUIRED" | "AUTH_PROVIDER_UNAVAILABLE", message: string) { super(message); this.name = "AuthError"; } }
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();
  async findByGoogleSubject(subject: string) { return this.accounts.get(subject); }
  async create(account: Account) { this.accounts.set(account.googleSubject, account); return account; }
}
export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, SessionRecord>();
  async create(session: SessionRecord) { this.sessions.set(session.tokenHash, session); }
  async findByTokenHash(hash: string) { return this.sessions.get(hash); }
  async revokeByTokenHash(hash: string, revokedAt: number) { const session = this.sessions.get(hash); if (session) session.revokedAt = revokedAt; }
  async ensureIndexes() {}
}

export class AuthService {
  constructor(private readonly accounts: AccountRepository = new InMemoryAccountRepository(), private readonly sessions: SessionRepository = new InMemorySessionRepository(), private readonly verifier?: GoogleTokenVerifier, private readonly redis?: AuthRedis) {}
  async signIn(claims: GoogleClaims, expected: { issuer: string; audience: string; nonce: string }, ttlSeconds: number) {
    if (claims.issuer !== expected.issuer || claims.audience !== expected.audience || claims.nonce !== expected.nonce || claims.expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new AuthError("AUTH_INVALID", "Google authorization is invalid");
    }
    return this.createSession(claims.subject, claims.email, ttlSeconds);
  }
  async signInWithIdToken(idToken: string, expected: { clientId: string; issuer: string }, ttlSeconds: number) {
    if (!this.verifier) throw new AuthError("AUTH_INVALID", "Google authorization is not configured");
    const identity = await this.verifier.verify(idToken, expected);
    return this.createSession(identity.subject, identity.email, ttlSeconds);
  }
  private async createSession(subject: string, email: string, ttlSeconds: number) {
    let account = await this.accounts.findByGoogleSubject(subject);
    if (!account) account = await this.accounts.create({ id: randomUUID(), provider: "google", googleSubject: subject, email: email.trim().toLowerCase(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const session = { id: randomUUID(), accountId: account.id, tokenHash: hashToken(token), expiresAt };
    void this.sessions.create(session);
    return { account, token, expiresAt };
  }
  authenticate(token: string): OwnerScope {
    const tokenHash = hashToken(token);
    const session = this.sessions.findByTokenHash(tokenHash) as unknown as SessionRecord | undefined;
    if (!session) throw new AuthError("AUTH_REQUIRED", "Authentication is required");
    if (session.revokedAt || session.expiresAt <= Date.now()) throw new AuthError("AUTH_EXPIRED", "Session expired or revoked");
    return { ownerId: session.accountId };
  }
  async revoke(token: string) {
    const tokenHash = hashToken(token);
    if (this.redis) void this.redis.del(`auth:session:${tokenHash}`);
    void this.sessions.revokeByTokenHash(tokenHash, Date.now());
  }
}

interface GoogleKey { kid: string; n: string; e: string; kty: string; alg?: string; use?: string }
interface GoogleKeyResponse { keys: GoogleKey[] }

const base64UrlBytes = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const decode = (value: string) =>
  JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as Record<string, unknown>;

export class GoogleWebCryptoVerifier implements GoogleTokenVerifier {
  private keys?: { expiresAt: number; keys: GoogleKey[] };
  constructor(private readonly jwksUrl: string, private readonly fetcher: typeof fetch = fetch) {}

  private async keysForVerification(): Promise<GoogleKey[]> {
    if (this.keys && this.keys.expiresAt > Date.now()) return this.keys.keys;
    let response: Response;
    try { response = await this.fetcher(this.jwksUrl); } catch { throw new AuthError("AUTH_PROVIDER_UNAVAILABLE", "Google key verification is unavailable"); }
    if (!response.ok) throw new AuthError("AUTH_PROVIDER_UNAVAILABLE", "Google key verification is unavailable");
    try {
      const payload = (await response.json()) as GoogleKeyResponse;
      const cacheControl = response.headers.get("cache-control") ?? "";
      const maxAge = Number(cacheControl.match(/max-age=(\\d+)/i)?.[1] ?? 3600);
      this.keys = { keys: payload.keys, expiresAt: Date.now() + maxAge * 1000 };
      return payload.keys;
    } catch { throw new AuthError("AUTH_PROVIDER_UNAVAILABLE", "Google key verification is unavailable"); }
  }

  async verify(token: string, expected: { clientId: string; issuer: string }) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("malformed");
      const header = decode(parts[0]);
      const claims = decode(parts[1]);
      if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("invalid header");
      if (claims.iss !== expected.issuer || claims.aud !== expected.clientId || typeof claims.sub !== "string" || typeof claims.email !== "string") throw new Error("invalid claims");
      if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) throw new AuthError("AUTH_EXPIRED", "Google authorization expired");
      const key = (await this.keysForVerification()).find((candidate) => candidate.kid === header.kid);
      if (!key) throw new Error("unknown key");
      const cryptoKey = await crypto.subtle.importKey("jwk", { kty: key.kty, n: key.n, e: key.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, cryptoKey, base64UrlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
      if (!valid) throw new Error("invalid signature");
      return { subject: claims.sub, email: claims.email, issuer: claims.iss, audience: claims.aud, expiresAt: claims.exp };
    } catch (error) { if (error instanceof AuthError) throw error; throw new AuthError("AUTH_INVALID", "Google authorization is invalid"); }
  }
}
