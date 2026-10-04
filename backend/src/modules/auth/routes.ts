import { Elysia, t } from "elysia";
import type { AppConfig } from "../../config/env";
import { AuthError, AuthService, type GoogleClaims } from "./service";

export const createAuthRoutes = (config: AppConfig, auth: AuthService) =>
  new Elysia({ name: "auth" })
    .post(
      "/auth/google",
      ({ body, set }) => {
        const claims = body.claims as GoogleClaims;
        const result = auth.signIn(
          claims,
          {
            issuer: body.issuer,
            audience: body.audience,
            nonce: body.nonce,
          },
          config.sessionTtlSeconds ?? 60 * 60 * 24 * 30,
        );
        set.status = 201;
        return { account: result.account, token: result.token };
      },
      {
        body: t.Object({
          issuer: t.String(),
          audience: t.String(),
          nonce: t.String(),
          claims: t.Unknown(),
        }),
      },
    )
    .post("/auth/sign-out", ({ headers }) => {
      const token = headers.authorization?.replace(/^Bearer\s+/i, "");
      if (token) auth.revoke(token);
      return { status: "ok" as const };
    })
    .onError(({ error, set }) => {
      if (error instanceof AuthError) {
        set.status = error.code === "AUTH_REQUIRED" ? 401 : 400;
        return { code: error.code, message: error.message };
      }
    });
