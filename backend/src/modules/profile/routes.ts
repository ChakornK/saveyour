import { Elysia } from "elysia";
import { AuthError } from "../auth/service";
import type { AuthService } from "../auth/service";
import type { CaptureService } from "../capture/service";
import { authContext } from "../auth/context";

export const profileRoutes = (auth: AuthService, captures: CaptureService) =>
  new Elysia({ name: "profile" })
    .use(authContext(auth))
    .get("/profile", async ({ set, authenticated }) => {
      if (!authenticated) {
        set.status = 401;
        return { code: "AUTH_REQUIRED", message: "Authentication is required" };
      }
      const ownerId = authenticated.ownerId;
      const page = await captures.list({ ownerId }, undefined, 100);
      const posts = page.items;
      const tags = new Set<string>();
      const sources = new Set<string>();
      for (const post of posts) {
        sources.add(post.platform);
      }
      const account = await auth.getAccount(ownerId);
      return {
        displayName: account?.name ?? account?.email ?? ownerId,
        username: account?.email ?? ownerId,
        avatarUrl: account?.picture ?? null,
        savedPostCount: posts.length,
        albumCount: 0,
        sourceCount: sources.size,
        tagCount: tags.size,
      };
    })
    .onError(({ error, set }) => {
      if (error instanceof AuthError) {
        set.status = 401;
        return { code: error.code, message: error.message };
      }
    });
