import type { DerivedPostStore, EventPublisher } from "../analysis/events";
import type { SearchDocument } from "../analysis/contracts";
import type { SearchIndex } from "./contracts";

export const documentFromDerived = (
  post: Awaited<ReturnType<DerivedPostStore["get"]>>,
): SearchDocument | undefined => {
  if (!post) return undefined;
  return {
    documentId: `${post.postId}:${post.version}`,
    ownerId: post.ownerId,
    postId: post.postId,
    text: [post.sourceText, post.generatedText, post.transcript]
      .filter(Boolean)
      .join("\n"),
    tags: post.tags,
    platform: post.platform,
    albumIds: post.albumIds,
    capturedAt: post.capturedAt,
    mediaKinds: post.mediaKinds,
    analysisStatus: post.status,
    embedding: post.embedding,
    indexVersion: post.version,
  };
};

export class SearchRebuilder {
  constructor(
    private readonly store: DerivedPostStore,
    private readonly index: SearchIndex,
    private readonly publisher?: EventPublisher,
  ) {}

  async rebuild(ownerId?: string) {
    const store = this.store;
    const documents = (async function* () {
      for (const post of await store.list(ownerId)) {
        const document = documentFromDerived(post);
        if (document) yield document;
      }
    })();
    return this.index.rebuild(documents);
  }

  async delete(ownerId: string, postId: string, version: number) {
    await this.index.delete(`${postId}:${version}`);
    if (this.publisher)
      await this.publisher.publish({
        type: "search.index-delete",
        version: 1,
        documentId: `${postId}:${version}`,
        ownerId,
        postId,
      });
  }
}
