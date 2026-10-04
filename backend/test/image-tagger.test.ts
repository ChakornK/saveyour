import { describe, expect, test } from "bun:test";
import { OnnxClipImageTagger } from "../src/infrastructure/ai/image-tagger";

describe("ONNX image tagger", () => {
  test("rejects empty and unsupported input without inference", async () => {
    const tagger = new OnnxClipImageTagger({ visionModelPath: "/missing.onnx", labels: ["cat"] });
    expect(await tagger.tagImage({ bytes: new Uint8Array(), mimeType: "image/jpeg" })).toEqual([]);
    expect(await tagger.tagImage({ bytes: new Uint8Array([1]), mimeType: "text/plain" })).toEqual([]);
  });
});
