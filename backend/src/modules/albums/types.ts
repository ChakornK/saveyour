import type { SavedPost } from "../capture/types";

export type AlbumVisibility = "private" | "public";

export interface Album {
  id: string;
  ownerId: string;
  name: string;
  postIds: string[];
  tags: string[];
  visibility: AlbumVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumSummary extends Omit<Album, "postIds" | "ownerId"> {
  postCount: number;
  coverPost?: SavedPost;
}

export class AlbumError extends Error {
  constructor(
    public readonly code: "ALBUM_NOT_FOUND" | "ALBUM_EXISTS" | "POST_NOT_FOUND" | "NAME_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "AlbumError";
  }
}
