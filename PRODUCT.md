# saveyour.tech

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

People who save interesting social-media posts and later need to retrieve, understand, organize, or share them across devices and source platforms.

## Product Purpose

saveyour.tech lets users capture social-media links from mobile sharing flows or the web, preserve associated media in the cloud, analyze media and text, and retrieve saved knowledge through semantic search, tags, albums, and a visual relationship map.

## Positioning

A unified, searchable memory for posts discovered across Instagram, Reddit, TikTok, Facebook, and X, combining source-link preservation with AI-generated media understanding and user-curated collections.

## Operating Context

Users primarily save posts opportunistically while browsing social platforms, then return from mobile or web to search, inspect, organize, and share collections. The system is self-hosted and deployed through Coolify.

## Capabilities and Constraints

- Capture links from mobile share sheets and web forms.
- Store posts and downloaded media in the cloud.
- Analyze images, extracted video frames, text, and audio transcripts.
- Support semantic search, tag search, tag suggestions, albums, public album links, and a semantic relationship map.
- Use Google OAuth for authentication.
- Use MongoDB for application data, SeaweedFS for media/object storage, and a dedicated full-text/vector search service behind an adapter.
- The client strategy must provide the best shared UX across iOS, Android, and responsive web; the design specification will evaluate Flutter adaptive architecture against React Native plus web and select one explicitly.
- Deployment is self-hosted through Coolify; production services must be containerized and configurable through environment variables.

## Brand Commitments

- Neobrutalism.dev-inspired monochromatic emerald visual language.
- Bold, playful, high-contrast UI with bouncy but purposeful motion.
- Mingcute filled icons imported as SVG assets for Flutter where applicable.
- Required visual tokens are supplied in the feature brief and must be preserved as the source palette.

## Evidence on Hand

No production assets, user research, or existing application implementation were supplied. Future work must not fabricate testimonials, usage metrics, or content claims.

## Product Principles

1. Capture first; organize later.
2. Make saved knowledge retrievable across source platforms.
3. Preserve user control over AI suggestions and automated organization.
4. Keep source attribution and links visible.
5. Make powerful organization tools understandable at a glance.

## Accessibility & Inclusion

The adaptive client must support keyboard, touch, screen readers, reduced motion, high-contrast affordances, semantic labels, minimum touch targets, focus visibility, and accessible alternatives to long-press, drag, and map interactions.
