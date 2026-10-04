# Platform Media Retrieval Research

## Executive summary

There is no single reliable, provider-neutral download mechanism for all five platforms. The product should treat source-link preservation as guaranteed, provider metadata as best-effort, and media retrieval as an adapter capability with explicit `resolved`, `limited`, and `unavailable` states.

Official APIs are the safest path but generally require app registration, user authorization, scopes, review, and provider-specific account/content restrictions. Public HTML metadata can support limited previews but is fragile, may omit media, and must not be treated as a durable API. Undocumented scraping, session-cookie reuse, proxying anti-bot challenges, and bypassing access controls should not be part of the product.

## Platform findings

### Instagram

- Official Meta/Instagram APIs are account- and permission-oriented. They are suitable for content owned by or accessible through authorized professional accounts, not arbitrary public Instagram URLs.
- Public Open Graph metadata may expose a title/image in some cases, but login walls, consent pages, rate limits, and markup changes make this unreliable.
- Reels and carousel media may require provider-authorized API responses; a single `og:image` is not equivalent to complete post media.
- Recommended capability: preserve the URL always; attempt official API resolution when the user has connected an eligible account; otherwise use bounded metadata-only resolution and report limited media.

### Reddit

- Reddit has a comparatively clear official API and OAuth model. Authorized API responses can expose post data and media/gallery metadata subject to scopes, rate limits, and content availability.
- Reddit-hosted media URLs can expire or require follow-up requests; download immediately after resolution and record source metadata.
- Crossposts, galleries, third-party hosts, deleted posts, quarantined communities, and NSFW restrictions require partial-failure handling.
- Recommended capability: official OAuth/API adapter first, with public JSON/HTML only as a constrained fallback where allowed by current Reddit policy.

### TikTok

- Official TikTok APIs are limited by product, app approval, scopes, and user/content access. Arbitrary public post media download is not generally available as an unrestricted official API capability.
- Public pages may expose metadata or embedded player information, but markup and anti-automation behavior are unstable.
- Recommended capability: support authorized/approved API access where available; otherwise preserve source URL and offer metadata-only capture rather than bypassing access controls.

### Facebook

- Meta Graph API access is permission- and token-dependent. Page/user content and media access depend on the object type, account relationship, app review, and granted scopes.
- Arbitrary public post retrieval is not equivalent to having a user-provided URL. Login, privacy settings, deleted content, and permissions commonly limit access.
- Recommended capability: official Graph API for connected/authorized objects; metadata-only fallback for public links; never assume an HTML page contains downloadable media.

### X

- X API access is governed by developer-project credentials, product tier, endpoint permissions, and rate limits. Post lookup and media expansions may be available for authorized API clients, but media URLs can be signed/temporary and access is policy-controlled.
- Public HTML is not a stable media API. Embedded media may be hosted by X or a third-party provider.
- Recommended capability: official API adapter with configured credentials and expansions; immediate bounded download of returned media URLs; preserve link when access is unavailable.

## Adapter contract

Each adapter should expose:

- `classify(url)`
- `resolve(url, authorizationContext)`
- `downloadableMedia(source)`
- `refresh(source)` for expired URLs
- `capabilities()` reporting metadata/media/gallery/video support

The adapter result should include:

- canonical source URL
- platform
- source status
- provider object/post identifier
- author/title/text when available
- media candidates with MIME hints and expiry time
- bounded failure code
- authorization requirement

## Safe retrieval rules

- Use official APIs and user-authorized credentials where required.
- Do not scrape behind login, defeat bot challenges, rotate proxies to evade limits, reuse user cookies server-side, or bypass deleted/private content.
- Validate every media URL and redirect against an allowlist and SSRF policy.
- Download temporary provider media URLs promptly, with size, timeout, MIME, checksum, and decompression limits.
- Store source attribution and the original URL with every asset.
- Treat media retrieval as partial: one failed asset must not discard the Saved_Post.
- Cache provider IDs and refresh metadata rather than repeatedly scraping public pages.

## Product recommendation

Implement the adapters in phases:

1. Reddit official OAuth/API adapter.
2. X official API adapter where credentials and billing/access are available.
3. Meta adapter for connected Instagram/Facebook accounts and approved objects.
4. TikTok adapter only for approved API capabilities.
5. Metadata-only fallback for unsupported or unauthorized public links.

The capture acknowledgement should never promise media availability. It should return source and analysis state, then a worker resolves and downloads media asynchronously.
