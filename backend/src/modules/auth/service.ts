import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AppConfig } from "../../config/env";
import type { OwnerScope } from "../capture/types";

export interface GoogleClaims {
  issuer: string;
  audience: string;
  nonce: string;
  subject: string;
  email: string;
  expiresAt: number;
}

export interface Account {
  id: string;
  googleSubject: string;
  email: string;
  createdAt: string;
}

interface SessionRecord {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: number;
  revokedAt?: number;
}

export class AuthError extends Error {
  constructor(
    public readonly code: "AUTH_INVALID" | "AUTH_EXPIRED" | "AUTH_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export class AuthService {
  private readonly accounts = new Map<string, Account>();
  private readonly sessions = new Map<string, SessionRecord>();

  verifyClaims(
    claims: GoogleClaims,
    expected: { issuer: string; audience?: string; nonce: string },
  ): void {
    if (
      claims.issuer !== expected.issuer ||
      (expected.audience !== undefined && claims.audience !== expected.audience) ||
      claims.nonce !== expected.nonce ||
      !claims.subject ||
      !claims.email
    )
      throw new AuthError("AUTH_INVALID", "Google authorization is invalid");
    if (
      !Number.isFinite(claims.expiresAt) ||
      claims.expiresAt <= Math.floor(Date.now() / 1000)
    )
      throw new AuthError("AUTH_EXPIRED", "Google authorization expired");
  }

  signIn(
    claims: GoogleClaims,
    expected: { issuer: string; audience?: string; nonce: string },
    ttlSeconds: number,
  ) {
    this.verifyClaims(claims, expected);
    let account = this.accounts.get(claims.subject);
    if (!account) {
      account = {
        id: randomUUID(),
        googleSubject: claims.subject,
        email: claims.email,
        createdAt: new Date().toISOString(),
      };
      this.accounts.set(claims.subject, account);
    }
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(hashToken(token), {
      id: randomUUID(),
      accountId: account.id,
      tokenHash: hashToken(token),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return { account, token };
  }

  authenticate(token: string): OwnerScope {
    const session = this.sessions.get(hashToken(token));
    if (!session)
      throw new AuthError("AUTH_REQUIRED", "Authentication is required");
    if (session.revokedAt || session.expiresAt <= Date.now())
      throw new AuthError("AUTH_EXPIRED", "Session expired or revoked");
    return { ownerId: session.accountId };
  }

  revoke(token: string): void {
    const session = this.sessions.get(hashToken(token));
    if (session) session.revokedAt = Date.now();
  }

  static expectedGoogleClaims(
    config: Pick<AppConfig, "googleIssuer" | "googleClientId" | "googleAudience">,
    nonce: string,
  ) {
    return {
      issuer: config.googleIssuer,
      audience: config.googleAudience ?? config.googleClientId,
      nonce,
    };
  }
}
