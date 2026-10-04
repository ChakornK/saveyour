import ort from "onnxruntime-node";
import sharp from "sharp";
import { Tokenizer } from "@huggingface/tokenizers";

export interface ImageTag { label: string; confidence: number }
export interface ImageTagger { tagImage(input: { bytes: Uint8Array; mimeType: string }): Promise<ImageTag[]> }
export interface ClipTaggerConfig { visionModelPath: string; textModelPath?: string; tokenizerPath?: string; tokenizerConfigPath?: string; labels: string[]; threshold?: number }

export class OnnxClipImageTagger implements ImageTagger {
  private vision?: Promise<ort.InferenceSession>;
  private tokenizer?: Promise<Tokenizer>;
  private text?: Promise<ort.InferenceSession>;
  constructor(private readonly config: ClipTaggerConfig) {}
  private getVision() { return (this.vision ??= ort.InferenceSession.create(this.config.visionModelPath)); }
  private async getTokenizer() {
    if (!this.config.tokenizerPath || !this.config.tokenizerConfigPath) throw new Error("CLIP tokenizer assets are missing");
    return new Tokenizer(await Bun.file(this.config.tokenizerPath).json(), await Bun.file(this.config.tokenizerConfigPath).json());
  }
  private getText() { return (this.text ??= ort.InferenceSession.create(this.config.textModelPath!)); }
  private async textEmbedding(label: string) {
    const tokenizer = await this.getTokenizer();
    const encoded = tokenizer.encode(`a photo of a ${label}`);
    const ids = Int32Array.from(encoded.ids);
    const mask = Int32Array.from(encoded.attention_mask);
    const session = await this.getText();
    const inputs: Record<string, ort.Tensor> = {};
    for (const name of session.inputNames) {
      if (name === "input_ids") inputs[name] = new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]);
      else if (name === "attention_mask") inputs[name] = new ort.Tensor("int64", BigInt64Array.from(mask, BigInt), [1, mask.length]);
    }
    const outputName = session.outputNames.find((name) => name === "text_embeds") ?? session.outputNames[0];
    if (!outputName) throw new Error("ONNX text model has no output");
    const output = await session.run(inputs);
    const values = Array.from(output[outputName].data as Float32Array);
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
    return values.map((value) => value / norm);
  }
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
    const tags = await Promise.all(this.config.labels.map(async (label) => {
      const text = await this.textEmbedding(label);
      const similarity = normalized.reduce((sum, value, index) => sum + value * (text[index] ?? 0), 0);
      return { label, confidence: Math.max(0, Math.min(1, (similarity + 1) / 2)) };
    }));
    return tags.filter((tag) => tag.confidence >= (this.config.threshold ?? 0.5)).sort((a, b) => b.confidence - a.confidence).slice(0, 12);
  }
}
