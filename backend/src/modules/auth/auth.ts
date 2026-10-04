import { Elysia } from "elysia";

export interface AuthConfig { required?: boolean; tokens?: Record<string, string>; authenticate?: (token: string) => Promise<string>; }

export const authentication = (config: AuthConfig = {}) =>
  new Elysia({ name: "authentication" }).derive(async ({ headers }) => {
    const authorization = headers.authorization;
    if (!config.required && !authorization) return { authenticatedOwnerId: undefined as string | undefined };
    if (!authorization?.startsWith("Bearer ")) throw new Error("Bearer token is required");
    const token = authorization.slice("Bearer ".length);
    const ownerId = config.authenticate ? await config.authenticate(token) : config.tokens?.[token];
    if (!ownerId) throw new Error("Invalid bearer token");
    return { authenticatedOwnerId: ownerId };
  });
