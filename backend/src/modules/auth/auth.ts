import { Elysia } from "elysia";

export interface AuthConfig {
  required?: boolean;
  tokens?: Record<string, string>;
}

export const authentication = (config: AuthConfig = {}) =>
  new Elysia({ name: "authentication" }).derive(({ headers, set }) => {
    const authorization = headers.authorization;
    if (!config.required && !authorization)
      return { authenticatedOwnerId: undefined as string | undefined };
    if (!authorization?.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("Bearer token is required");
    }
    const token = authorization.slice("Bearer ".length);
    const ownerId = config.tokens?.[token];
    if (!ownerId) {
      set.status = 401;
      throw new Error("Invalid bearer token");
    }
    return { authenticatedOwnerId: ownerId };
  });
