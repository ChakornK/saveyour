import type { AiInput, AiProvider } from "../../modules/analysis/provider";
import type { GeneratedDescription, Transcript } from "../../modules/analysis/contracts";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxAttempts: number;
  endpoint?: string;
}

export class GeminiProvider implements AiProvider {
  constructor(private readonly config: GeminiConfig) {}

  private async request<T>(input: AiInput, prompt: string, schema: (value: unknown) => T): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const parts = input.mimeType?.startsWith("image/") && input.content.startsWith("data:")
          ? [{ inline_data: { mime_type: input.mimeType, data: input.content.split(",", 2)[1] } }, { text: prompt }]
          : [{ text: `${prompt}\n\nInput:\n${input.content}` }];
        const response = await fetch(`${this.config.endpoint ?? "https://generativelanguage.googleapis.com/v1beta/models"}/${this.config.model}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`, {
          method: "POST",
          signal: controller.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] }),
        });
        if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);
        const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
        if (!text) throw new Error("Gemini response contained no text");
        const json = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text;
        return schema(JSON.parse(json));
      } catch (error) {
        lastError = error;
        if (attempt < this.config.maxAttempts) await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }

  describeImage(input: AiInput): Promise<GeneratedDescription> {
    return this.request(input, "Return JSON only: {\"text\": string, \"tags\": string[]}. Describe the image accurately and do not infer details from the URL.", (value) => {
      const result = value as { text?: unknown; tags?: unknown };
      if (typeof result.text !== "string" || !Array.isArray(result.tags) || result.tags.some((tag) => typeof tag !== "string")) throw new Error("Invalid description response");
      return { text: result.text, tags: result.tags, provenance: { provider: "gemini", model: this.config.model, promptVersion: "v1", generatedAt: new Date().toISOString() } };
    });
  }

  transcribe(input: AiInput): Promise<Transcript> {
    return this.request(input, "Return JSON only: {\"segments\": [{\"text\": string, \"startMs\": number, \"endMs\": number}]}. Transcribe the supplied audio.", (value) => {
      const result = value as { segments?: unknown };
      if (!Array.isArray(result.segments)) throw new Error("Invalid transcript response");
      return { segments: result.segments as Transcript["segments"], provenance: { provider: "gemini", model: this.config.model, promptVersion: "v1", generatedAt: new Date().toISOString() } };
    });
  }

  embed(input: AiInput): Promise<number[]> {
    return this.request(input, "Return a JSON array of numeric embedding values only.", (value) => {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "number")) throw new Error("Invalid embedding response");
      return value as number[];
    });
  }
}
