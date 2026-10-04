import type { CaptureResult, PageCursor, PostPage, SavedPost } from "./types";

export interface CaptureRepository {
  findActiveByUrl(
    ownerId: string,
    canonicalUrl: string,
  ): SavedPost | undefined | Promise<SavedPost | undefined>;
  findById(
    ownerId: string,
    postId: string,
  ): SavedPost | undefined | Promise<SavedPost | undefined>;
  insert(post: SavedPost): SavedPost | Promise<SavedPost>;
  list(
    ownerId: string,
    cursor: PageCursor | undefined,
    limit: number,
  ): PostPage | Promise<PostPage>;
  delete(
    ownerId: string,
    postId: string,
  ): SavedPost | undefined | Promise<SavedPost | undefined>;
  getIdempotent(
    ownerId: string,
    key: string,
  ): CaptureResult | undefined | Promise<CaptureResult | undefined>;
  setIdempotent(
    ownerId: string,
    key: string,
    result: CaptureResult,
  ): void | Promise<void>;
}

const comparePosts = (left: SavedPost, right: SavedPost): number => {
  const byTime = right.capturedAt.localeCompare(left.capturedAt);
  return byTime !== 0 ? byTime : right.id.localeCompare(left.id);
};

export class InMemoryCaptureRepository implements CaptureRepository {
  private readonly posts = new Map<string, SavedPost>();
  private readonly idempotency = new Map<string, CaptureResult>();

  findActiveByUrl(
    ownerId: string,
    canonicalUrl: string,
  ): SavedPost | undefined {
    return [...this.posts.values()].find(
      (post) =>
        post.ownerId === ownerId &&
        post.canonicalUrl === canonicalUrl &&
        post.deletionState === "active",
    );
  }

  findById(ownerId: string, postId: string): SavedPost | undefined {
    const post = this.posts.get(postId);
    return post?.ownerId === ownerId ? post : undefined;
  }

  insert(post: SavedPost): SavedPost {
    this.posts.set(post.id, post);
    return post;
  }

  list(
    ownerId: string,
    cursor: PageCursor | undefined,
    limit: number,
  ): PostPage {
    const active = [...this.posts.values()]
      .filter(
        (post) => post.ownerId === ownerId && post.deletionState === "active",
      )
      .sort(comparePosts);
    const afterCursor = cursor
      ? active.findIndex(
          (post) =>
            post.capturedAt === cursor.capturedAt && post.id === cursor.id,
        ) + 1
      : 0;
    const items = active.slice(afterCursor, afterCursor + limit);
    const last = items.at(-1);
    return {
      items,
      ...(last && afterCursor + items.length < active.length
        ? {
            nextCursor: JSON.stringify({
              capturedAt: last.capturedAt,
              id: last.id,
            }),
          }
        : {}),
    };
  }

  delete(ownerId: string, postId: string): SavedPost | undefined {
    const post = this.findById(ownerId, postId);
    if (!post) return undefined;
    const deleted = {
      ...post,
      deletionState: "deleted" as const,
      updatedAt: new Date().toISOString(),
    };
    this.posts.set(postId, deleted);
    return deleted;
  }

  getIdempotent(ownerId: string, key: string): CaptureResult | undefined {
    return this.idempotency.get(`${ownerId}:${key}`);
  }

  setIdempotent(ownerId: string, key: string, result: CaptureResult): void {
    this.idempotency.set(`${ownerId}:${key}`, result);
  }
}

export const decodeCursor = (
  value: string | undefined,
): PageCursor | undefined => {
  if (!value) return undefined;
  try {
    const cursor = JSON.parse(value) as Partial<PageCursor>;
    if (typeof cursor.capturedAt !== "string" || typeof cursor.id !== "string")
      return undefined;
    return cursor as PageCursor;
  } catch {
    return undefined;
  }
};
