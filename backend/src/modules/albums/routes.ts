import { Elysia, t } from "elysia";
import { AuthError, AuthService } from "../auth/service";
import { requireOwner } from "../auth/owner-scope";
import { AlbumError } from "./types";
import { AlbumService } from "./service";

export const albumRoutes = (service: AlbumService, auth: AuthService) =>
  new Elysia({ name: "albums" })
    .get("/albums", async ({ headers, query, set }) => {
      const ownerId = requireOwner(headers, set);
      if (!ownerId) return { code: "UNAUTHORIZED", message: "owner identity is required" };
      return service.list(ownerId, query.q, query.tags?.split(","));
    }, { query: t.Object({ q: t.Optional(t.String()), tags: t.Optional(t.String()) }) })
    .post("/albums", async ({ headers, body, set }) => {
      const ownerId = requireOwner(headers, set);
      if (!ownerId) return { code: "UNAUTHORIZED", message: "owner identity is required" };
      set.status = 201;
      return service.create(ownerId, body.name);
    }, { body: t.Object({ name: t.String({ minLength: 1, maxLength: 120 }) }) })
    .get("/albums/:albumId", async ({ headers, params, set }) => {
      const ownerId = requireOwner(headers, set);
      if (!ownerId) return { code: "UNAUTHORIZED", message: "owner identity is required" };
      return service.get(ownerId, params.albumId);
    }, { params: t.Object({ albumId: t.String() }) })
    .post("/albums/:albumId/posts/:postId", async ({ headers, params, set }) => {
      const ownerId = requireOwner(headers, set);
      if (!ownerId) return { code: "UNAUTHORIZED", message: "owner identity is required" };
      return service.addPost(ownerId, params.albumId, params.postId);
    }, { params: t.Object({ albumId: t.String(), postId: t.String() }) })
    .delete("/albums/:albumId/posts/:postId", async ({ headers, params, set }) => {
      const ownerId = requireOwner(headers, set);
      if (!ownerId) return { code: "UNAUTHORIZED", message: "owner identity is required" };
      return service.removePost(ownerId, params.albumId, params.postId);
    }, { params: t.Object({ albumId: t.String(), postId: t.String() }) })
    .onError(({ error, set }) => {
      if (error instanceof AuthError) { set.status = 401; return { code: error.code, message: error.message }; }
      if (error instanceof AlbumError) {
        set.status = error.code === "ALBUM_NOT_FOUND" || error.code === "POST_NOT_FOUND" ? 404 : 422;
        return { code: error.code, message: error.message };
      }
    });
