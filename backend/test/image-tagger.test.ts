import { describe, expect, test } from "bun:test";
import { ImageTaggerInputError, OnnxClipImageTagger } from "../src/infrastructure/ai/image-tagger";

describe("ONNX image tagger", () => {
  test("rejects empty and unsupported input without inference", async () => {
    const tagger = new OnnxClipImageTagger({ visionModelPath: "/missing.onnx", labels: ["cat"] });
    expect(await tagger.tagImage({ bytes: new Uint8Array(), mimeType: "image/jpeg" })).toEqual([]);
    expect(await tagger.tagImage({ bytes: new Uint8Array([1]), mimeType: "text/plain" })).toEqual([]);
  });

  test("returns no labels for empty input without loading model", async () => {
    const tagger = new OnnxClipImageTagger({ visionModelPath: "/missing.onnx", labels: ["cat"] });
    expect(await tagger.tagImage({ bytes: new Uint8Array(), mimeType: "image/jpeg" })).toEqual([]);
  });

  test("enforces the configured input limit before decoding", async () => {
    const tagger = new OnnxClipImageTagger({ visionModelPath: "/missing.onnx", labels: ["cat"], maxBytes: 2 });
    await expect(tagger.tagImage({ bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" })).rejects.toThrow("IMAGE_TAGGER_INPUT_TOO_LARGE");
  });

  test("reports decode errors without exposing image bytes", async () => {
    const metrics: Array<{ outcome: string; payloadBytes: number }> = [];
    const tagger = new OnnxClipImageTagger({ visionModelPath: "/missing.onnx", labels: ["cat"], onMetrics: (value) => metrics.push(value) });
    await expect(tagger.tagImage({ bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" })).rejects.toThrow();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({ outcome: "error", payloadBytes: 3 });
    await expect(Promise.reject(new ImageTaggerInputError("invalid"))).rejects.toMatchObject({ name: "PermanentError", code: "IMAGE_TAGGER_INVALID_INPUT" });
  });

  test("reports empty-input metrics without exposing payloads", async () => {
    const metrics: unknown[] = [];
    const tagger = new OnnxClipImageTagger({ visionModelPath: "/missing.onnx", labels: ["cat"], onMetrics: (value) => metrics.push(value) });
    await tagger.tagImage({ bytes: new Uint8Array(), mimeType: "image/jpeg" });
    expect(metrics).toEqual([{ payloadBytes: 0, preprocessingMs: 0, inferenceMs: 0, outcome: "empty" }]);
  });
});
