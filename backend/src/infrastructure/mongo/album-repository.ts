import type { Collection } from "mongodb";
import type { MongoDatabase } from "./client";
import type { AlbumRepository } from "../../modules/albums/repository";
import type { Album } from "../../modules/albums/types";

export class MongoAlbumRepository implements AlbumRepository {
  private collection?: Collection<Album>;
  constructor(private readonly mongo: MongoDatabase) {}
  private get albums() {
    return (this.collection ??= this.mongo.db().collection<Album>("albums"));
  }
  async ensureIndexes() {
    await this.albums.createIndex({ ownerId: 1, name: 1 }, { unique: true });
    await this.albums.createIndex({ ownerId: 1, updatedAt: -1 });
  }
  list(ownerId: string) {
    return this.albums.find({ ownerId }).sort({ updatedAt: -1 }).toArray();
  }
  async findById(ownerId: string, id: string) {
    return (await this.albums.findOne({ ownerId, id })) ?? undefined;
  }
  async findByName(ownerId: string, name: string) {
    return (
      (await this.albums.findOne({
        ownerId,
        name: {
          $regex: `^${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}$`,
          $options: "i",
        },
      })) ?? undefined
    );
  }
  async insert(album: Album) {
    await this.albums.insertOne(album);
    return album;
  }
  async update(album: Album) {
    await this.albums.replaceOne(
      { ownerId: album.ownerId, id: album.id },
      album,
    );
    return album;
  }
}
