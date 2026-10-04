import { describe, expect, test } from "bun:test";
import {
  parseInstagram,
  parseTikTok,
} from "../src/modules/capture/provider-parsers";

describe("provider parsers", () => {
  test("parses TikTok embedded state", () => {
    const html = `<script id="SIGI_STATE" type="application/json">${JSON.stringify({ ItemModule: { one: { id: "1", desc: "hello", author: { uniqueId: "creator" }, video: { playAddr: "https://v.example.test/video.mp4", cover: "https://v.example.test/cover.jpg" } } } })}</script>`;
    const result = parseTikTok(
      "https://www.tiktok.com/@creator/video/7675039008543509791",
      html,
    );
    expect(result.author).toBe("creator");
    expect(result.media.map((item) => item.kind)).toEqual(["video", "image"]);
  });

  test("parses Instagram media fields", () => {
    const html = String.raw`{"display_url":"https://scontent.example.test/image.jpg","video_url":"https://scontent.example.test/video.mp4"}`;
    const result = parseInstagram(
      "https://www.instagram.com/p/DeCt4wiMgDA/",
      html,
    );
    expect(result.media).toHaveLength(2);
  });
});
