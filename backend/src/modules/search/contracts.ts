import type { AnalysisStatus, SearchDocument } from "../analysis/contracts";

export interface SearchFilters {
  tags?: string[];
  platform?: string;
  albumId?: string;
  capturedAfter?: string;
  capturedBefore?: string;
  analysisStatus?: AnalysisStatus;
  mediaType?: string;
}

export interface ScopedSearchRequest {
  ownerId: string;
  rawQuery: string;
  filters?: SearchFilters;
  cursor?: string;
  limit?: number;
  vector?: number[];
}

export interface RawSearchHit {
  document: SearchDocument;
  score: number;
  matchedFields: string[];
  sortKey?: string;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  matchedFields: string[];
  explanation?: string;
  sortKey?: string;
}

export interface SearchResponse {
  queryId: string;
  results: SearchResult[];
  nextCursor?: string;
  state: "complete" | "degraded";
  latencyMs: number;
}

export interface SearchIndex {
  upsert(document: SearchDocument): Promise<void>;
  delete(documentId: string): Promise<void>;
  query(request: ScopedSearchRequest): Promise<RawSearchHit[]>;
  rebuild(documents: AsyncIterable<SearchDocument>): Promise<number>;
  health(): Promise<{ status: "healthy" | "unhealthy"; details?: string }>;
}
