import type { DerivedPostStore } from "../analysis/events";

export class TagSuggestionService {
  constructor(private readonly store: DerivedPostStore) {}

  async suggest(ownerId: string, query: string, limit = 10) {
    const normalized = query.trim().toLocaleLowerCase();
    const counts = new Map<string, number>();
    for (const post of await this.store.list(ownerId))
      for (const tag of post.tags) {
        const value = tag.trim().toLocaleLowerCase();
        if (value && value.includes(normalized))
          counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, Math.min(Math.max(limit, 1), 50))
      .map(([tag, count]) => ({ tag, count }));
  }
}
