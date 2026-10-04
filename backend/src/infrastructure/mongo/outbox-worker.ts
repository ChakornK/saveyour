import type { EventPublisher } from "../../modules/analysis/events";
import { MongoOutbox } from "./outbox";

export class OutboxWorker {
  constructor(
    private readonly outbox: MongoOutbox,
    private readonly delivery: EventPublisher,
    private readonly maxAttempts = 5,
  ) {}

  async runOnce(limit = 100) {
    const records = await this.outbox.pending(limit);
    for (const record of records) {
      try {
        await this.delivery.publish(record.event);
        await this.outbox.markDelivered(record.eventId);
      } catch {
        const attempts = record.attempts + 1;
        if (attempts < this.maxAttempts)
          await this.outbox.markRetry(
            record.eventId,
            attempts,
            new Date(Date.now() + 2 ** attempts * 1000).toISOString(),
          );
      }
    }
    return records.length;
  }
}
