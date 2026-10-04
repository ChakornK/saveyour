import type { GeneratedDescription, Provenance, Transcript } from "./contracts";

export interface AiInput {
  content: string;
  mimeType?: string;
}
export interface AiProvider {
  describeImage(input: AiInput): Promise<GeneratedDescription>;
  transcribe(input: AiInput): Promise<Transcript>;
  embed(input: AiInput): Promise<number[]>;
}

const provenance = (provider: string, model: string): Provenance => ({
  provider,
  model,
  promptVersion: "v1",
  generatedAt: new Date().toISOString(),
});

export class FakeAiProvider implements AiProvider {
  async describeImage(input: AiInput) {
    return {
      text: input.content,
      tags: input.content
        .toLocaleLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .slice(0, 10),
      provenance: provenance("fake", "deterministic-v1"),
    };
  }

  async transcribe(input: AiInput) {
    return {
      segments: [{ text: input.content, startMs: 0, endMs: 1000 }],
      provenance: provenance("fake", "deterministic-v1"),
    };
  }

  async embed(input: AiInput) {
    const vector = Array.from(
      { length: 8 },
      (_, index) => (input.content.charCodeAt(index) || 0) / 255,
    );
    return vector;
  }
}

export class BoundedAiProvider implements AiProvider {
  constructor(
    private readonly delegate: AiProvider,
    private readonly timeoutMs = 10_000,
    private readonly maxAttempts = 3,
  ) {}

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("AI provider timeout")),
              this.timeoutMs,
            ),
          ),
        ]);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts)
          await new Promise((resolve) =>
            setTimeout(resolve, 2 ** attempt * 25),
          );
      }
    }
    throw lastError;
  }

  describeImage(input: AiInput) {
    return this.call(() => this.delegate.describeImage(input));
  }
  transcribe(input: AiInput) {
    return this.call(() => this.delegate.transcribe(input));
  }
  embed(input: AiInput) {
    return this.call(() => this.delegate.embed(input));
  }
}
