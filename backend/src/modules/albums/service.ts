import { randomUUID } from "node:crypto";
import type { CaptureRepository } from "../capture/repository";
import type { SavedPost } from "../capture/types";
import type { AlbumRepository } from "./repository";
import { AlbumError, type Album, type AlbumSummary } from "./types";

export class AlbumService {
  constructor(
    private readonly albums: AlbumRepository,
    private readonly posts: CaptureRepository,
  ) {}

  async list(
    ownerId: string,
    query = "",
    tags: string[] = [],
  ): Promise<AlbumSummary[]> {
    const needle = query.trim().toLowerCase();
    const requestedTags = tags.map((tag) => tag.toLowerCase()).filter(Boolean);
    const result: AlbumSummary[] = [];
    for (const album of await this.albums.list(ownerId)) {
      const albumPosts = await this.postsForAlbum(ownerId, album);
      const albumTags = new Set(album.tags.map((tag) => tag.toLowerCase()));
      if (
        needle &&
        !`${album.name} ${album.tags.join(" ")}`.toLowerCase().includes(needle)
      )
        continue;
      if (
        requestedTags.length &&
        !requestedTags.some((tag) => albumTags.has(tag))
      )
        continue;
      result.push(this.summary(album, albumPosts));
    }
    return result.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async get(ownerId: string, albumId: string) {
    const album = await this.requireAlbum(ownerId, albumId);
    const posts = await this.postsForAlbum(ownerId, album);
    return { album: this.summary(album, posts), posts };
  }

  async create(ownerId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed)
      throw new AlbumError("NAME_INVALID", "Album name is required");
    if (await this.albums.findByName(ownerId, trimmed)) {
      throw new AlbumError("ALBUM_EXISTS", "That album already exists");
    }
    const now = new Date().toISOString();
    return this.albums.insert({
      id: randomUUID(),
      ownerId,
      name: trimmed,
      postIds: [],
      tags: [],
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    });
  }

  async rename(ownerId: string, albumId: string, name: string) {
    const album = await this.requireAlbum(ownerId, albumId);
    const trimmed = name.trim();
    if (!trimmed)
      throw new AlbumError("NAME_INVALID", "Album name is required");
    const existing = await this.albums.findByName(ownerId, trimmed);
    if (existing && existing.id !== albumId) {
      throw new AlbumError("ALBUM_EXISTS", "That album already exists");
    }
    return this.albums.update({
      ...album,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    });
  }

  async addPost(ownerId: string, albumId: string, postId: string) {
    const album = await this.requireAlbum(ownerId, albumId);
    const post = await this.posts.findById(ownerId, postId);
    if (!post || post.deletionState === "deleted")
      throw new AlbumError("POST_NOT_FOUND", "Post not found");
    if (!album.postIds.includes(postId)) {
      return this.albums.update({
        ...album,
        postIds: [...album.postIds, postId],
        updatedAt: new Date().toISOString(),
      });
    }
    return album;
  }

  async removePost(ownerId: string, albumId: string, postId: string) {
    const album = await this.requireAlbum(ownerId, albumId);
    return this.albums.update({
      ...album,
      postIds: album.postIds.filter((id) => id !== postId),
      updatedAt: new Date().toISOString(),
    });
  }

  private async requireAlbum(ownerId: string, albumId: string) {
    const album = await this.albums.findById(ownerId, albumId);
    if (!album) throw new AlbumError("ALBUM_NOT_FOUND", "Album not found");
    return album;
  }

  private async postsForAlbum(
    ownerId: string,
    album: Album,
  ): Promise<SavedPost[]> {
    const posts: SavedPost[] = [];
    for (const postId of album.postIds) {
      const post = await this.posts.findById(ownerId, postId);
      if (post && post.deletionState === "active") posts.push(post);
    }
    return posts;
  }

  private summary(album: Album, posts: SavedPost[]): AlbumSummary {
    const { postIds: _postIds, ownerId: _ownerId, ...publicAlbum } = album;
    return {
      ...publicAlbum,
      tags: [
        ...new Set([...album.tags, ...posts.flatMap((post) => [] as string[])]),
      ],
      postCount: posts.length,
      coverPost: posts[0],
    };
  }
}
