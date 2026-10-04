import type {
  EventPublisher,
  AnalysisEvent,
} from "../../modules/analysis/events";
import type { SearchIndex } from "../../modules/search/contracts";

export class SearchEventDelivery implements EventPublisher {
  constructor(private readonly index: SearchIndex) {}
  async publish(event: AnalysisEvent) {
    if (event.type === "search.index-upsert")
      await this.index.upsert(event.document);
    if (event.type === "search.index-delete")
      await this.index.delete(event.documentId);
  }
}
