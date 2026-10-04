import type { GeneratedDescription, Transcript } from './contracts'

export const validateGeneratedDescription = (value: GeneratedDescription) => {
  if (!value.text.trim() || value.text.length > 20_000) throw new Error('Generated description is invalid')
  if (value.tags.length > 100 || value.tags.some((tag) => !tag.trim() || tag.length > 100)) throw new Error('Generated tags are invalid')
  return value
}

export const validateTranscript = (value: Transcript) => {
  if (value.segments.length > 10_000) throw new Error('Transcript has too many segments')
  for (const segment of value.segments) if (!segment.text.trim() || segment.startMs < 0 || segment.endMs < segment.startMs) throw new Error('Transcript segment is invalid')
  return value
}

export const validateEmbedding = (value: number[], dimensions = 8) => {
  if (value.length !== dimensions || value.some((number) => !Number.isFinite(number))) throw new Error('Embedding has invalid dimensions')
  return value
}
