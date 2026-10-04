import type { Collection } from "mongodb";
import type { MongoDatabase } from "./client";
import type { Account, AccountRepository, SessionRecord, SessionRepository } from "../../modules/auth/service";

export class MongoAccountRepository implements AccountRepository {
  private collection(): Collection<Account> { return this.db.db().collection<Account>("accounts"); }
  constructor(private readonly db: MongoDatabase) {}
  async findByGoogleSubject(subject: string) { return this.collection().findOne({ provider: "google", googleSubject: subject }) ?? undefined; }
  async create(account: Account) { await this.collection().insertOne(account); return account; }
  async ensureIndexes() { await this.collection().createIndex({ provider: 1, googleSubject: 1 }, { unique: true }); }
}
export class MongoSessionRepository implements SessionRepository {
  private collection(): Collection<SessionRecord> { return this.db.db().collection<SessionRecord>("sessions"); }
  constructor(private readonly db: MongoDatabase) {}
  async create(session: SessionRecord) { await this.collection().insertOne(session); }
  async findByTokenHash(hash: string) { return await this.collection().findOne({ tokenHash: hash }) ?? undefined; }
  async revokeByTokenHash(hash: string, revokedAt: number) { await this.collection().updateOne({ tokenHash: hash }, { $set: { revokedAt } }); }
  async ensureIndexes() { await this.collection().createIndex({ tokenHash: 1 }, { unique: true }); await this.collection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); }
}
