import ort from "onnxruntime-node";
import sharp from "sharp";
import { Tokenizer } from "@huggingface/tokenizers";

export interface ImageTag { label: string; confidence: number }
export interface ImageTagger { tagImage(input: { bytes: Uint8Array; mimeType: string }): Promise<ImageTag[]> }
export interface ClipTaggerConfig { visionModelPath: string; textModelPath?: string; tokenizerPath?: string; labels: string[]; threshold?: number }

export class OnnxClipImageTagger implements ImageTagger {
  private vision?: Promise<ort.InferenceSession>;
  private tokenizer?: Promise<Tokenizer>;
  private text?: Promise<ort.InferenceSession>;
  constructor(private readonly config: ClipTaggerConfig) {}
  private getVision() { return (this.vision ??= ort.InferenceSession.create(this.config.visionModelPath)); }
  private getTokenizer() { return (this.tokenizer ??= Promise.resolve(new Tokenizer({}, this.config.tokenizerPath!))); }
  private getText() { return (this.text ??= ort.InferenceSession.create(this.config.textModelPath!)); }
  async tagImage(input: { bytes: Uint8Array; mimeType: string }) {
    if (!input.mimeType.startsWith("image/") || !input.bytes.byteLength) return [];
    const { data, info } = await sharp(input.bytes).resize(224, 224, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixels = new Float32Array(3 * 224 * 224);
    for (let y = 0; y < 224; y++) for (let x = 0; x < 224; x++) {
      const source = (y * info.width + x) * 3;
      const target = y * 224 + x;
      pixels[target] = (data[source] / 255 - 0.48145466) / 0.26862954;
      pixels[224 * 224 + target] = (data[source + 1] / 255 - 0.4578275) / 0.26130258;
      pixels[2 * 224 * 224 + target] = (data[source + 2] / 255 - 0.40821073) / 0.27577711;
    }
    const session = await this.getVision();
    const inputName = session.inputNames.find((name) => name === "pixel_values");
    const outputName = session.outputNames.find((name) => name === "image_embeds");
    if (!inputName || !outputName) throw new Error("ONNX vision model contract is invalid");
    const output = await session.run({ [inputName]: new ort.Tensor("float32", pixels, [1, 3, 224, 224]) });
    const embedding = Array.from(output[outputName].data as Float32Array);
    const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0)) || 1;
    const normalized = embedding.map((value) => value / norm);
    return this.config.labels.map((label, index) => ({ label, confidence: Math.max(0, Math.min(1, (normalized[index] ?? 0 + 1) / 2)) })).filter((tag) => tag.confidence >= (this.config.threshold ?? 0.5)).sort((a, b) => b.confidence - a.confidence).slice(0, 12);
  }
}
