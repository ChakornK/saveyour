import { Elysia, t } from "elysia";
import type { AuthService } from "./service";

export interface AuthenticatedContext {
  ownerId: string;
  accountId: string;
  sessionId: string;
}

export const authContext = (auth: AuthService) => (app: Elysia) =>
  app.resolve({ as: "global" }, async ({ headers, set }) => {
    const token = headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token)
      return { authenticated: undefined as AuthenticatedContext | undefined };
    try {
      const scope = await auth.authenticate(token);
      return {
        authenticated: {
          ownerId: scope.ownerId,
          accountId: scope.ownerId,
          sessionId: token,
        } satisfies AuthenticatedContext,
      };
    } catch {
      set.status = 401;
      return { authenticated: undefined as AuthenticatedContext | undefined };
    }
  });

export const protectedContext = t.Object({});
