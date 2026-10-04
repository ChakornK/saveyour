import { Elysia } from "elysia";

export const requireOwner = (
  headers: Record<string, string | undefined>,
  set: { status?: number | string },
) => {
  const ownerId = headers["x-owner-id"];
  if (!ownerId || ownerId.length > 128) {
    set.status = 401;
    return undefined;
  }
  return ownerId;
};

export const ownerScope = new Elysia({ name: "owner-scope" }).derive(
  ({ headers, set }) => ({ ownerId: requireOwner(headers, set) as string }),
);
