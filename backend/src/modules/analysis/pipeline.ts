import type { AnalysisJob, AnalysisStage, SearchDocument } from './contracts'
import type { AiProvider } from './provider'
import type { DerivedPostStore, EventPublisher } from './events'
import type { StageHandler } from './orchestrator'

export interface AcceptedPost {
  postId: string
  ownerId: string
  version: number
  sourceText: string
  platform?: string
  albumIds?: string[]
  capturedAt?: string
  mediaKinds?: string[]
}

export interface PostSource {
  get(postId: string, version: number): Promise<AcceptedPost | undefined>
}

export class InMemoryPostSource implements PostSource {
  private readonly posts = new Map<string, AcceptedPost>()
  add(post: AcceptedPost) { this.posts.set(`${post.postId}:${post.version}`, structuredClone(post)) }
  async get(postId: string, version: number) { const post = this.posts.get(`${postId}:${version}`); return post ? structuredClone(post) : undefined }
}

export class AnalysisPipeline implements StageHandler {
  constructor(private readonly source: PostSource, private readonly derived: DerivedPostStore, private readonly ai: AiProvider, private readonly publisher?: EventPublisher) {}

  async run(job: AnalysisJob, stage: AnalysisStage) {
    const source = await this.source.get(job.postId, job.postVersion)
    if (!source) throw new Error('Source post is unavailable')
    const current = await this.derived.get(job.postId, job.postVersion) ?? {
      postId: source.postId, ownerId: source.ownerId, version: source.version, sourceText: source.sourceText,
      tags: [], albumIds: source.albumIds ?? [], mediaKinds: source.mediaKinds ?? [], platform: source.platform,
      capturedAt: source.capturedAt, status: 'processing' as const, completedStages: [], updatedAt: new Date().toISOString()
    }
    if (stage === 'describe' || stage === 'normalize') {
      const result = await this.ai.describeImage({ content: source.sourceText })
      current.generatedText = result.text
      current.tags = [...new Set(result.tags.map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))]
    }
    if (stage === 'transcribe') current.transcript = (await this.ai.transcribe({ content: source.sourceText })).segments.map((segment) => segment.text).join(' ')
    if (stage === 'embed') current.embedding = await this.ai.embed({ content: [source.sourceText, current.generatedText, current.transcript, ...current.tags].filter(Boolean).join(' ') })
    if (!current.completedStages.includes(stage)) current.completedStages.push(stage)
    current.updatedAt = new Date().toISOString()
    await this.derived.save(current)
    if (stage === 'index') {
      const document: SearchDocument = {
        documentId: `${source.postId}:${source.version}`, ownerId: source.ownerId, postId: source.postId,
        text: [source.sourceText, current.generatedText, current.transcript].filter(Boolean).join('\n'), tags: current.tags,
        platform: source.platform, albumIds: source.albumIds ?? [], capturedAt: source.capturedAt, mediaKinds: source.mediaKinds ?? [],
        analysisStatus: current.status, embedding: current.embedding, indexVersion: source.version
      }
      if (this.publisher) await this.publisher.publish({ type: 'search.index-upsert', version: 1, document })
    }
  }
}
