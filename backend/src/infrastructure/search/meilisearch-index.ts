import type {
  RawSearchHit,
  SearchIndex,
  ScopedSearchRequest,
} from "../../modules/search/contracts";
import type { SearchDocument } from "../../modules/analysis/contracts";

export interface MeilisearchConfig {
  url: string;
  index: string;
  apiKey?: string;
}

type MeilisearchHit = SearchDocument & { _formatted?: Record<string, unknown> };

export class MeilisearchIndex implements SearchIndex {
  constructor(private readonly config: MeilisearchConfig) {}

  private headers() {
    const headers = new Headers({ "content-type": "application/json" });
    if (this.config.apiKey)
      headers.set("authorization", `Bearer ${this.config.apiKey}`);
    return headers;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.config.url}${path}`, {
      ...init,
      headers: {
        ...Object.fromEntries(this.headers()),
        ...Object.fromEntries(new Headers(init?.headers)),
      },
    });
    if (!response.ok)
      throw new Error(`Search request failed with status ${response.status}`);
    return response.json() as Promise<T>;
  }

  async upsert(document: SearchDocument) {
    await this.request(
      `/indexes/${encodeURIComponent(this.config.index)}/documents?primaryKey=documentId`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify([document]),
      },
    );
  }

  async delete(documentId: string) {
    const response = await fetch(
      `${this.config.url}/indexes/${encodeURIComponent(this.config.index)}/documents/${encodeURIComponent(documentId)}`,
      { method: "DELETE", headers: this.headers() },
    );
    if (!response.ok && response.status !== 404)
      throw new Error(`Search delete failed with status ${response.status}`);
  }

  async query(request: ScopedSearchRequest) {
    const filters = [`ownerId = "${request.ownerId.replaceAll('"', '\\"')}"`];
    if (request.filters?.platform)
      filters.push(
        `platform = "${request.filters.platform.replaceAll('"', '\\"')}"`,
      );
    if (request.filters?.analysisStatus)
      filters.push(
        `analysisStatus = "${request.filters.analysisStatus.replaceAll('"', '\\"')}"`,
      );
    if (request.filters?.mediaType)
      filters.push(
        `mediaKinds = "${request.filters.mediaType.replaceAll('"', '\\"')}"`,
      );
    const result = await this.request<{ hits?: MeilisearchHit[] }>(
      `/indexes/${encodeURIComponent(this.config.index)}/search`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          q: request.rawQuery ?? "",
          filter: filters,
          limit: Math.min(request.limit ?? 20, 100),
          offset: request.cursor ? Number(request.cursor) || 0 : 0,
          attributesToHighlight: ["text", "tags"],
        }),
      },
    );
    return (result.hits ?? []).map((document): RawSearchHit => ({
      document,
      score: 0,
      sortKey: document.documentId,
      matchedFields: Object.keys(document._formatted ?? {}),
    }));
  }

  async rebuild(documents: AsyncIterable<SearchDocument>) {
    let count = 0;
    for await (const document of documents) {
      await this.upsert(document);
      count += 1;
    }
    return count;
  }

  async health() {
    try {
      const response = await fetch(`${this.config.url}/health`, {
        headers: this.headers(),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      return { status: "healthy" as const };
    } catch (error) {
      return {
        status: "unhealthy" as const,
        details: error instanceof Error ? error.message : "Search unavailable",
      };
    }
  }
}
