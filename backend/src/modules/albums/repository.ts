import type { Album } from "./types";

export interface AlbumRepository {
  list(ownerId: string): Promise<Album[]> | Album[];
  findById(ownerId: string, albumId: string): Promise<Album | undefined> | Album | undefined;
  findByName(ownerId: string, name: string): Promise<Album | undefined> | Album | undefined;
  insert(album: Album): Promise<Album> | Album;
  update(album: Album): Promise<Album> | Album;
}

export class InMemoryAlbumRepository implements AlbumRepository {
  private readonly albums = new Map<string, Album>();

  list(ownerId: string) {
    return [...this.albums.values()].filter((album) => album.ownerId === ownerId);
  }

  findById(ownerId: string, albumId: string) {
    const album = this.albums.get(albumId);
    return album?.ownerId === ownerId ? album : undefined;
  }

  findByName(ownerId: string, name: string) {
    return [...this.albums.values()].find(
      (album) => album.ownerId === ownerId && album.name.toLowerCase() === name.toLowerCase(),
    );
  }

  insert(album: Album) {
    this.albums.set(album.id, album);
    return album;
  }

  update(album: Album) {
    this.albums.set(album.id, album);
    return album;
  }
}
