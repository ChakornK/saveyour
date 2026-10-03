# Saved Posts Memory — Visual Design System

## Product world

Saved Posts Memory is a personal archive that turns fleeting social discoveries into a tangible, searchable collection. The interface uses a strict neobrutalist emerald world: bright mint workspace, white paper-like surfaces, solid black borders, hard offset shadows, bold typography, and small moments of emerald or chart color reserved for meaning. It is playful and expressive, but the archive remains calm enough for long browsing sessions.

## Visual contract

- **THESIS:** The library should feel like a physical wall of labeled clippings, not a generic social feed: saved knowledge is arranged, inspected, and connected.
- **OWN-WORLD:** Mint background, white panels, 2px black borders, 4px hard black offset shadows, uppercase/weighty headings, filled Mingcute icons, emerald action surfaces, and chart colors only for data visualization.
- **STORY:** The user captures something quickly, sees it become understandable while analysis runs, then finds it later through gallery, search, album, or map.
- **FIRST VIEWPORT:** Home opens with a compact top bar, search field, and immediately visible staggered gallery; the add-link action is the strongest emerald control and pending analysis remains visible but secondary.
- **FORM:** Operate-oriented adaptive archive: mobile bottom navigation and gesture-friendly cards; wide web uses a persistent navigation rail and expanded gallery density. The design rejects a conventional feed with a uniform three-column card grid.

## Tokens

Use the supplied CSS values as the web source of truth and mirror them in Flutter theme constants:

```css
:root {
  --background: hsl(156, 84%, 90%);
  --secondary-background: oklch(100% 0 0);
  --foreground: oklch(0% 0 0);
  --main-foreground: oklch(0% 0 0);
  --main: hsl(162, 100%, 42%);
  --border: oklch(0% 0 0);
  --ring: oklch(0% 0 0);
  --overlay: oklch(0% 0 0 / 0.8);
  --shadow: 4px 4px 0px 0px var(--border);
  --chart-1: #00D696;
  --chart-2: #7A83FF;
  --chart-3: #FACC00;
  --chart-4: #FF4D50;
  --chart-5: #0099FF;
}
```

Additional system rules:

- Base radius: 5px. Do not introduce large pill radii except for status chips or avatars.
- Border: 2px solid black for interactive surfaces and primary containers.
- Shadow: 4px 4px 0 black; pressed state translates the surface by 2px and reduces shadow to 2px.
- Typography: one legible sans family with bold heading weight and medium body weight; use uppercase sparingly for labels, status, and navigation.
- Spacing: 4px base unit; common gaps 8, 12, 16, 24, 32.
- Touch target: minimum 44 logical pixels. Desktop may visually compact non-touch controls but not reduce keyboard hit area.
- Focus: 2px black ring with 2px mint/white offset where contrast requires it.
- Text never relies on chart colors alone; chart colors require labels or patterns.

## Component grammar

### App shell

- Mobile: top app bar plus three-item bottom navigation: Home, Albums, Profile.
- Wide web: left navigation rail with the same three destinations; content is centered with a bounded reading width and a wider gallery canvas.
- Top bar alignment: pending analysis left, product mark/name centered, add link right on Home. Album name centered with rename affordance on Album Detail.
- Search field is structurally attached to Home and Albums rather than floating as an unrelated global overlay.

### Buttons

- Primary: emerald fill, black border, hard shadow, black bold label, filled Mingcute icon where relevant.
- Secondary: white fill, black border, hard shadow.
- Destructive: white or pale mint surface with red status icon and explicit label; never rely on red fill alone.
- Icon-only: allowed only for universally recognized actions and always has semantic label/tooltip. Maintain 44px target.
- Press: translate `(2px, 2px)`, shadow reduces to 2px; transition 100–140ms.

### Gallery cards

- Cards use white secondary background, black border, and hard shadow.
- Staggered heights derive from media aspect ratio but clamp extremes so scrolling remains rhythmic.
- Metadata footer always preserves source platform, capture time/relative age, analysis state, and album indication.
- Text-only cards use oversized readable excerpt, source badge, and link action rather than fake media placeholders.
- Selected cards gain emerald inset or offset treatment plus a check control; selection mode exposes a fixed action bar with Add to album, Delete, and Cancel.
- Loading cards preserve the media ratio and footer height.

### Detail surface

- Mobile: bottom sheet with visible drag handle, but every action also exists as a labeled control.
- Wide web: centered modal or side inspector depending on available width; content never gets hidden behind a toolbar.
- Media first, source link second, generated description third, tags fourth, provenance/status last.
- Generated content carries a small “AI-generated” label and confidence/provenance affordance where applicable.

### Albums

- Album grid uses variable cover treatments, not generic identical cards: cover image, post count, visibility label, and updated date.
- Album detail reuses the Home gallery contract and adds an album header with rename, share, and organization controls.
- Public album uses the same world but removes private navigation, editing actions, internal status, and private tags.

### Search

- Search field supports natural-language query, tag chips, source filters, and date/media filters.
- Suggestions appear in a bordered listbox with keyboard navigation and clear result counts.
- Search result cards use a thin emerald relevance marker plus a plain-language “matched because…” explanation when available.
- No-results state offers a query rewrite, clear filters, related tags, and Create album from results.

### Analysis states

- Pending: striped or dotted emerald indicator plus “Analyzing” label and a pending queue action.
- Partial: amber chart color with explicit “Some details unavailable.”
- Failed: white card, black border, red error icon, clear reason, Retry.
- Complete: quiet status chip; do not add unnecessary decoration to every card.

### Relationship map

- Map nodes are solid black-outlined stickers/cards with type-specific chart-color accents.
- Edges use weight and line style, never color alone.
- Map toolbar has labeled zoom, fit, filter, and list-view controls.
- Accessible list view mirrors nodes, relationships, and explanations in a sortable list.

## Motion

- Motion is bouncy only where it explains state: card press, add-to-album confirmation, sheet open, selection bar appearance, and map focus.
- Default transitions 140–250ms; spring overshoot must remain small enough not to cause loss of context.
- Gallery cards do not continuously float, pulse, or animate while idle.
- Respect `prefers-reduced-motion` and Flutter accessibility animation settings with opacity/instant alternatives.
- Loading indicators use a restrained looping transform or progress bar; do not animate large layout regions.

## Responsive rules

- 320–479px: one-column gallery with safe horizontal padding; bottom navigation; bottom-sheet detail.
- 480–767px: two-column staggered gallery where content width permits; bottom navigation or compact rail.
- 768–1199px: two/three-column gallery, optional persistent rail, modal detail.
- 1200px+: three/four-column gallery with wider canvas, persistent rail, and inspector detail.
- Never rely on hover for essential information. Long press, drag, and map gestures require buttons or list alternatives.
- At narrow widths, top-bar actions remain 44px targets and never overlap the centered title.
- Keyboard focus order follows reading order: navigation → top bar → search/filter → content → contextual actions → bottom navigation where present.

## Content and accessibility

- Source platform and external-link actions remain visible at every detail level.
- AI-generated data is labeled as generated; unsupported media is explained without blaming the user.
- Empty states say what happened and offer the next action.
- Error states preserve existing content and provide retry.
- Screen readers receive semantic card names containing source, title/excerpt, analysis status, and available actions.
- Selection state is announced; deletion is confirmable by keyboard and touch.
- Public albums never expose private labels or account identifiers.

## Required surfaces

1. Auth / Google sign-in.
2. Home gallery and capture sheet.
3. Search overlay/page and result state.
4. Post detail surface.
5. Pending analysis queue.
6. Albums grid.
7. Album detail and organization suggestion flow.
8. Public album page.
9. Relationship map and accessible list.
10. Profile, export, account deletion, and settings.
11. Loading, empty, offline, partial, failure, retry, and not-found variants for each major surface.

## Quality bar

A polished implementation must feel like one physical system: identical borders and shadows across mobile and web, consistent press feedback, stable card geometry during loading, meaningful empty/error states, no inaccessible gesture-only actions, no generic Material/Cupertino defaults, and no decorative chart colors outside their semantic role.
