import ort from "onnxruntime-node";
import sharp from "sharp";

export interface ImageTag {
  label: string;
  confidence: number;
}

export interface ImageTagger {
  tagImage(input: { bytes: Uint8Array; mimeType: string }): Promise<ImageTag[]>;
}

export interface ClipTaggerConfig {
  modelPath: string;
  labels: string[];
  timeoutMs?: number;
}

export class OnnxClipImageTagger implements ImageTagger {
  private session?: Promise<ort.InferenceSession>;
  constructor(private readonly config: ClipTaggerConfig) {}

  private getSession() {
    return (this.session ??= ort.InferenceSession.create(this.config.modelPath));
  }

  async tagImage(input: { bytes: Uint8Array; mimeType: string }) {
    if (!input.mimeType.startsWith("image/") || input.bytes.byteLength === 0) return [];
    const { data, info } = await sharp(input.bytes).resize(224, 224, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixels = new Float32Array(3 * 224 * 224);
    for (let y = 0; y < 224; y += 1) for (let x = 0; x < 224; x += 1) {
      const source = (y * info.width + x) * 3;
      const target = y * 224 + x;
      pixels[target] = (data[source] / 255 - 0.48145466) / 0.26862954;
      pixels[224 * 224 + target] = (data[source + 1] / 255 - 0.4578275) / 0.26130258;
      pixels[2 * 224 * 224 + target] = (data[source + 2] / 255 - 0.40821073) / 0.27577711;
    }
    const session = await this.getSession();
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const output = await session.run({ [inputName]: new ort.Tensor("float32", pixels, [1, 3, 224, 224]) });
    const scores = output[outputName].data as Float32Array;
    return this.config.labels.map((label, index) => ({ label, confidence: 1 / (1 + Math.exp(-Number(scores[index] ?? 0))) })).filter((tag) => tag.confidence >= 0.5).sort((a, b) => b.confidence - a.confidence).slice(0, 12);
  }
}
