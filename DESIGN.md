# Design

## Visual language

Bold, high-contrast SaaS aesthetic with tight density. Border-first surfaces, brand-blue primary actions, and semantic feedback colors for status. Slide previews use a 16:9 canvas.

**Brief:** B2B productivity · PMs shipping status decks · mood *Bold / dense* · restrained motion.

## Token foundation

Source of truth:

| Layer | Location |
|-------|----------|
| DTCG tokens | `tokens/*.json` (color, semantic, theming, typography, spacing, motion) |
| Runtime CSS | `src/styles/theme.css` (OKLCH primitives + semantic roles) |
| Tailwind bridge | `src/app/globals.css` `@theme inline` |

Verify with `npm run verify` (tokens aliases, contrast AA, theme refs, JSON↔CSS sync).

### Semantic roles (app chrome)

| Role | CSS / Tailwind |
|------|----------------|
| `action.primary` / hover | `bg-primary` (brand-600), `hover:bg-primary-hover` |
| `action.destructive` | `bg-destructive` |
| `text.primary` / secondary | `text-foreground`, `text-muted-foreground` |
| `text.on-action` | `text-primary-foreground` |
| `text.link` | `text-link` (brand accent) |
| `surface.page` / card / raised | `bg-background`, `bg-card`, `bg-raised` |
| `border.default` / strong | `border-border`, `border-border-strong` |
| `feedback.*` | `text-success`, `text-warning`, `text-error`, `text-info` |

Do **not** use raw Tailwind palettes (`slate-*`, `teal-*`, `neutral-*`) in app chrome or marketing. One theme only.

Org-specific brand colors (`brand_kits.primary_color`, `accent_color`) apply in **slide preview**, **player**, and **PPTX export** when `decks.apply_branding` is true — never recolor dashboard chrome.

## Typography

Scale in `tokens/typography.json`. App recipes:

| Element | Style |
|---------|-------|
| Page title | `text-xl font-semibold tracking-tight` |
| Section heading | `text-base font-medium` |
| Body | `text-sm text-foreground` |
| Helper text | `text-sm text-muted-foreground` |
| Stat / metric | `text-3xl font-semibold` |

Fonts: Geist Sans / Geist Mono (chrome). Brand kit `font_style` maps preview to `font-sans` / `font-serif` / `font-mono` (export: Arial / Georgia / Courier New).

Use [`PageHeader`](src/components/shared/page-header.tsx) for list/dashboard page titles.

## Spacing & radius

4px base scale in `tokens/spacing.json`. Page padding: `px-4 py-5 sm:px-6`. Card: `p-4`. Gaps: `gap-3` lists, `gap-2` toolbars. Radius: `sm` 2px · `md` 4px · `lg` 6px · `xl` 8px. Prefer borders over shadows (`shadow-none` on cards).

## Components

### Buttons
- Default height `h-8`; primary brand blue; outline uses `border-border-strong`
- Variants via shadcn in `src/components/ui/button.tsx`

### Cards
- `rounded-lg border shadow-none`; list containers use divided rows with `px-4 py-3`

### Navigation
- Sidebar `w-56`; active item = left accent bar + `bg-muted`

### Slide preview
16:9. When branding on: kit primary/accent, logo on titles, derived muted/border from primary. Kit colors must pass WCAG contrast on white (≥4.5:1 primary, ≥3:1 accent).

## Dark mode

Designed dark overrides in `theme.css` under `html.dark` and `[data-theme="dark"]`. App chrome defaults to **light**. Landing hero opts into dark via `data-theme="dark"` on that section only.

## Motion

Tokens in `tokens/motion.json`. Slide preview/player: `slide-enter` uses `--duration-normal` (200ms), disabled when `prefers-reduced-motion: reduce`. Chrome: `transition-colors` only.

## Adding new UI

1. Prefer existing shadcn components
2. Use semantic tokens from theme — no hex / raw palettes in chrome
3. Match spacing/typography recipes
4. Run `npm run verify` after token changes
