# Design System

Apply and extend UpdateDeck's visual design system.

## When to use

- Building new UI components
- Adding slide preview templates
- Applying org brand kits
- Changing colors / type / motion tokens

## Foundations

- **Tokens:** `tokens/*.json` (DTCG) → `src/styles/theme.css` → `globals.css` `@theme`
- **UI library:** shadcn/ui + Tailwind CSS 4
- **Icons:** lucide-react (individual imports)
- **Utility:** `cn()` from `lib/utils`
- **Verify:** `npm run verify`

## Semantic tokens

Use theme utilities, not hardcoded colors or raw palettes (`slate-*`, `teal-*`):

- Surfaces: `bg-background`, `bg-card`, `bg-raised`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`, `text-link`
- Borders: `border-border`, `border-border-strong`
- Actions: `bg-primary`, `hover:bg-primary-hover`, `bg-destructive`
- Feedback: `text-success`, `text-warning`, `text-error`, `text-info`

## Component patterns

| Pattern | Component |
|---------|-----------|
| Page header | title + description + primary CTA |
| List item | Card with title, meta, actions dropdown |
| Editor panel | Tabs (Content / Notes) |
| Toolbar | ghost buttons, grouped with `gap-1` |
| Status badge | variant by deck/export status |
| Destructive action | Dialog confirmation |

## Brand kit (preview + export)

From `brand_kits` table via `src/lib/brand.ts`:
- `primary_color`, `accent_color` → slide accents when `apply_branding` is true
- Muted/border derived via `deriveSlideSupportColors` (not fixed hex)
- Contrast validated on save (`validateBrandKitContrast`)
- `logo_path` → title slide logo
- `font_style` → `sans` | `serif` | `mono`

## Rules

- Extend shadcn components; don't fork without reason
- New color roles go in `tokens/` + `theme.css`, not scattered in components
- Slide preview aspect ratio: 16:9
- Dark: designed overrides via `html.dark` / `[data-theme="dark"]`
