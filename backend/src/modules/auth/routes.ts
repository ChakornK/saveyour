import { Elysia, t } from "elysia";
import type { AppConfig } from "../../config/env";
import { AuthError, AuthService } from "./service";

export const createAuthRoutes = (config: AppConfig, auth: AuthService) =>
  new Elysia({ name: "auth" })
    .post(
      "/auth/google",
      async ({ body, set }) => {
        const result = await auth.signInWithIdToken(
          body.idToken,
          {
            clientId: config.googleClientId ?? "",
            issuer: config.googleIssuer,
          },
          config.sessionTtlSeconds ?? 2592000,
        );
        set.status = 201;
        return result;
      },
      { body: t.Object({ idToken: t.String({ minLength: 1 }) }), parse: "json" },
    )
    .get("/auth/me", ({ headers }) => ({
      accountId: auth.authenticate(
        headers.authorization?.replace(/^Bearer\s+/i, "") ?? "",
      ).ownerId,
    }))
    .post("/auth/sign-out", ({ headers }) => {
      const token = headers.authorization?.replace(/^Bearer\s+/i, "");
      if (token) void auth.revoke(token);
      return { status: "ok" as const };
    })
    .onError(({ error, set }) => {
      if (error instanceof AuthError) {
        set.status = error.code === "AUTH_PROVIDER_UNAVAILABLE" ? 503 : 401;
        return { code: error.code, message: error.message };
      }
    });
