import type { AiInput, AiProvider } from '../../modules/analysis/provider'
import type { GeneratedDescription, Transcript } from '../../modules/analysis/contracts'

export interface GeminiConfig { apiKey: string; model: string; timeoutMs: number; maxAttempts: number; endpoint?: string }

export class GeminiProvider implements AiProvider {
  constructor(private readonly config: GeminiConfig) {}

  private async request<T>(input: AiInput, schema: (value: unknown) => T): Promise<T> {
    let lastError: unknown
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)
      try {
        const response = await fetch(`${this.config.endpoint ?? 'https://generativelanguage.googleapis.com/v1beta/models'}/${this.config.model}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`, {
          method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: input.content }] }] })
        })
        if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`)
        const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('Gemini response contained no text')
        return schema(JSON.parse(text))
      } catch (error) { lastError = error; if (attempt < this.config.maxAttempts) await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100)) } finally { clearTimeout(timer) }
    }
    throw lastError
  }

  describeImage(input: AiInput): Promise<GeneratedDescription> { return this.request(input, (value) => { const result = value as { text?: unknown; tags?: unknown }; if (typeof result.text !== 'string' || !Array.isArray(result.tags) || result.tags.some((tag) => typeof tag !== 'string')) throw new Error('Invalid description response'); return { text: result.text, tags: result.tags, provenance: { provider: 'gemini', model: this.config.model, promptVersion: 'v1', generatedAt: new Date().toISOString() } } }) }
  transcribe(input: AiInput): Promise<Transcript> { return this.request(input, (value) => { const result = value as { segments?: unknown }; if (!Array.isArray(result.segments)) throw new Error('Invalid transcript response'); return { segments: result.segments as Transcript['segments'], provenance: { provider: 'gemini', model: this.config.model, promptVersion: 'v1', generatedAt: new Date().toISOString() } } }) }
  embed(input: AiInput): Promise<number[]> { return this.request(input, (value) => { if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) throw new Error('Invalid embedding response'); return value as number[] }) }
}
