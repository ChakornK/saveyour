import type { MediaAsset, MediaProcessor } from "./media";
import type { JobContext, MediaReference } from "./integration-contract";

export interface AuthorizedMediaStore {
  load(ownerId: string, reference: MediaReference): Promise<MediaAsset>;
  saveDerived(ownerId: string, source: MediaReference, artifact: MediaAsset): Promise<MediaReference>;
}

export interface PreparedMedia {
  source: MediaReference;
  image?: MediaAsset;
  frames: MediaAsset[];
  audio?: MediaAsset;
}

export class MediaPreparationOrchestrator {
  constructor(
    private readonly store: AuthorizedMediaStore,
    private readonly processor: MediaProcessor,
  ) {}

  async prepare(context: JobContext): Promise<PreparedMedia[]> {
    const prepared: PreparedMedia[] = [];
    for (const reference of context.media) {
      if (reference.ownerId !== context.ownerId || reference.postId !== context.postId) {
        throw new Error("Media ownership mismatch");
      }
      const asset = await this.store.load(context.ownerId, reference);
      const frames = await this.processor.extractFrames(asset);
      const audio = await this.processor.extractAudio(asset);
      const derivedFrames = await Promise.all(
        frames.map((frame) =>
          this.store.saveDerived(context.ownerId, reference, {
            bytes: frame.bytes,
            mimeType: frame.mimeType,
          }),
        ),
      );
      const derivedAudio = audio
        ? await this.store.saveDerived(context.ownerId, reference, audio)
        : undefined;
      prepared.push({
        source: reference,
        image: reference.mimeType.startsWith("image/") ? asset : undefined,
        frames: derivedFrames.map((frame) => ({
          bytes: new Uint8Array(),
          mimeType: frame.mimeType,
        })),
        audio: derivedAudio
          ? { bytes: new Uint8Array(), mimeType: derivedAudio.mimeType }
          : undefined,
      });
    }
    return prepared;
  }
}
