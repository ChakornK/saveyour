import { CaptureError, type CanonicalPostUrl, type Platform } from "./types";

const PROVIDER_HOSTS: Record<Platform, Set<string>> = {
  instagram: new Set(["instagram.com", "www.instagram.com"]),
  tiktok: new Set(["tiktok.com", "www.tiktok.com"]),
  facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com"]),
  pinterest: new Set(["pinterest.com", "www.pinterest.com"]),
};

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "si",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

const canonicalHostForPlatform: Record<Platform, string> = {
  instagram: "www.instagram.com",
  tiktok: "www.tiktok.com",
  facebook: "www.facebook.com",
  pinterest: "www.pinterest.com",
};

const platformForHost = (hostname: string): Platform | undefined => {
  for (const [platform, hosts] of Object.entries(PROVIDER_HOSTS) as [
    Platform,
    Set<string>,
  ][]) {
    if (hosts.has(hostname)) return platform;
  }
  return undefined;
};

const isPrivateHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  )
    return true;
  if (
    /^127\./.test(normalized) ||
    normalized === "0.0.0.0" ||
    normalized === "::1"
  )
    return true;
  if (/^10\./.test(normalized) || /^192\.168\./.test(normalized)) return true;
  const match = normalized.match(/^172\.(\d{1,3})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
};

const hasPostPath = (platform: Platform, pathname: string): boolean => {
  const segments = pathname.split("/").filter(Boolean);
  if (platform === "instagram")
    return (
      ["p", "reel", "reels", "tv"].includes(segments[0] ?? "") &&
      Boolean(segments[1])
    );
  if (platform === "tiktok")
    return (
      segments[0] === "@" ||
      (segments[0]?.startsWith("@") === true && segments.length >= 3)
    );
  if (platform === "facebook") return segments.length >= 2;
  if (platform === "pinterest") return segments.length >= 2;
  return segments.length >= 1;
};

export const normalizePostUrl = (rawUrl: string): CanonicalPostUrl => {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    throw new CaptureError("URL_INVALID", "A URL is required", "url");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new CaptureError("URL_INVALID", "The URL is malformed", "url");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port
  ) {
    throw new CaptureError(
      "URL_INVALID",
      "Only credential-free HTTPS URLs are supported",
      "url",
    );
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new CaptureError(
      "NETWORK_TARGET_DISALLOWED",
      "The URL targets a disallowed network address",
      "url",
    );
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const platform = platformForHost(hostname);
  if (!platform)
    throw new CaptureError(
      "PLATFORM_UNSUPPORTED",
      "The URL platform is not supported",
      "url",
    );
  if (!hasPostPath(platform, parsed.pathname)) {
    throw new CaptureError(
      "URL_INVALID",
      "The URL does not identify a supported post",
      "url",
    );
  }

  parsed.hostname = canonicalHostForPlatform[platform];
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(key.toLowerCase()))
      parsed.searchParams.delete(key);
  }
  parsed.search = parsed.searchParams.toString()
    ? `?${parsed.searchParams.toString()}`
    : "";
  return { value: parsed.toString(), platform };
};
