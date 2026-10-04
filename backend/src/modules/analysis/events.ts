import type { AnalysisJob, AnalysisStage, SearchDocument } from "./contracts";

export type AnalysisEvent =
  | { type: "analysis.requested"; version: 1; job: AnalysisJob }
  | { type: "analysis.updated"; version: 1; job: AnalysisJob }
  | { type: "search.index-upsert"; version: 1; document: SearchDocument }
  | {
      type: "search.index-delete";
      version: 1;
      documentId: string;
      ownerId: string;
      postId: string;
    };

export interface EventPublisher {
  publish(event: AnalysisEvent): Promise<void>;
}

export class InMemoryEventPublisher implements EventPublisher {
  readonly events: AnalysisEvent[] = [];

  async publish(event: AnalysisEvent) {
    this.events.push(structuredClone(event));
  }
}

export interface DerivedPost {
  postId: string;
  ownerId: string;
  version: number;
  sourceText: string;
  generatedText?: string;
  generatedTextProvenance?: import("./contracts").Provenance;
  tags: string[];
  transcript?: string;
  transcriptProvenance?: import("./contracts").Provenance;
  embedding?: number[];
  platform?: string;
  albumIds: string[];
  capturedAt?: string;
  mediaKinds: string[];
  status: AnalysisJob["status"];
  completedStages: AnalysisStage[];
  updatedAt: string;
}

export interface DerivedPostStore {
  get(postId: string, version: number): Promise<DerivedPost | undefined>;
  save(post: DerivedPost): Promise<DerivedPost>;
  list(ownerId?: string): Promise<DerivedPost[]>;
  delete(postId: string, version: number): Promise<void>;
}

export class InMemoryDerivedPostStore implements DerivedPostStore {
  private readonly posts = new Map<string, DerivedPost>();

  private key(postId: string, version: number) {
    return `${postId}:${version}`;
  }

  async get(postId: string, version: number) {
    const post = this.posts.get(this.key(postId, version));
    return post ? structuredClone(post) : undefined;
  }

  async save(post: DerivedPost) {
    this.posts.set(this.key(post.postId, post.version), structuredClone(post));
    return structuredClone(post);
  }

  async list(ownerId?: string) {
    return [...this.posts.values()]
      .filter((post) => !ownerId || post.ownerId === ownerId)
      .map((post) => structuredClone(post));
  }

  async delete(postId: string, version: number) {
    this.posts.delete(this.key(postId, version));
  }
}
