import type { Platform } from "./types";
import { normalizePostUrl } from "./url-policy";

export interface ParsedMedia {
  url: string;
  kind: "image" | "video" | "audio";
}
export interface ParsedPost {
  platform: Platform;
  canonicalUrl: string;
  title?: string;
  text?: string;
  author?: string;
  media: ParsedMedia[];
}
const safeUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};
const uniqueMedia = (items: Array<ParsedMedia | undefined>) => [
  ...new Map(
    items
      .filter((item): item is ParsedMedia => Boolean(item && safeUrl(item.url)))
      .map((item) => [item.url, { ...item, url: safeUrl(item.url)! }]),
  ).values(),
];
const findObject = (
  value: unknown,
  predicate: (value: Record<string, unknown>) => boolean,
): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObject(item, predicate);
      if (found) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (predicate(record)) return record;
  for (const child of Object.values(record)) {
    const found = findObject(child, predicate);
    if (found) return found;
  }
  return undefined;
};
const jsonScripts = (html: string, id: string) => {
  const match = html.match(
    new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)</script>`, "i"),
  );
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
};

export const parseTikTok = (url: string, html: string): ParsedPost => {
  const canonical = normalizePostUrl(url);
  const item = findObject(
    jsonScripts(html, "__NEXT_DATA__") ?? jsonScripts(html, "SIGI_STATE"),
    (record) =>
      Boolean(
        record.video &&
        typeof record.video === "object" &&
        (record.id || record.desc),
      ),
  );
  const video = item?.video as Record<string, unknown> | undefined;
  const author = item?.author as Record<string, unknown> | undefined;
  const media = uniqueMedia([
    { url: video?.playAddr as string, kind: "video" },
    { url: video?.downloadAddr as string, kind: "video" },
    { url: video?.cover as string, kind: "image" },
    { url: video?.originCover as string, kind: "image" },
  ]);
  return {
    platform: "tiktok",
    canonicalUrl: canonical.value,
    text: typeof item?.desc === "string" ? item.desc : undefined,
    author: typeof author?.uniqueId === "string" ? author.uniqueId : undefined,
    media,
  };
};

export const parsePinterest = (url: string, html: string): ParsedPost => {
  const canonical = normalizePostUrl(url);
  const media = uniqueMedia([
    ...[
      ...html.matchAll(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)/gi,
      ),
    ].map((match) => ({ url: match[1], kind: "image" as const })),
    ...[...html.matchAll(/"(?:image|url)":"(https?:\/\/[^"\\]+)"/g)].map(
      (match) => ({
        url: match[1].replaceAll("\\u002F", "/"),
        kind: "image" as const,
      }),
    ),
  ]);
  return {
    platform: "pinterest",
    canonicalUrl: canonical.value,
    title: html.match(
      /property=["']og:title["'][^>]+content=["']([^"']+)/i,
    )?.[1],
    media,
  };
};

export const parseInstagram = (url: string, html: string): ParsedPost => {
  const canonical = normalizePostUrl(url);
  const matches = [
    ...html.matchAll(
      /"display_url"\s*:\s*"([^"\\]+)|"video_url"\s*:\s*"([^"\\]+)/g,
    ),
  ];
  const image = html.match(
    /property=["']og:image["'][^>]+content=["']([^"']+)/i,
  )?.[1];
  const video = html.match(
    /property=["']og:video["'][^>]+content=["']([^"']+)/i,
  )?.[1];
  const media = uniqueMedia([
    ...matches.flatMap((match) => [
      { url: match[1], kind: "image" as const },
      { url: match[2], kind: "video" as const },
    ]),
    image ? { url: image, kind: "image" as const } : undefined,
    video ? { url: video, kind: "video" as const } : undefined,
  ]);
  return {
    platform: "instagram",
    canonicalUrl: canonical.value,
    title: html.match(
      /property=["']og:title["'][^>]+content=["']([^"']+)/i,
    )?.[1],
    media,
  };
};
