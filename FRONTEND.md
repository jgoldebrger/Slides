# Frontend

## App Router structure

```
src/app/
  (auth)/          # login, signup, callback
  (dashboard)/     # authenticated app shell
    [orgSlug]/     # org-scoped routes
      projects/
      decks/
  api/             # API routes, webhooks
  layout.tsx       # root layout
  page.tsx         # landing
```

## Server vs client

| Use Server Component | Use Client Component |
|---------------------|---------------------|
| Data fetching | Forms with instant validation |
| Static layout | Drag-and-drop |
| SEO pages | Modals, dropdowns |
| Initial page render | Real-time editor state |

Mark client components with `'use client'` at file top.

## Data fetching

```tsx
// Server Component
import { createClient } from '@/lib/supabase/server';

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('id, name');
  return <ProjectList projects={data ?? []} />;
}
```

## Components

| Directory | Purpose |
|-----------|---------|
| `components/ui/` | shadcn primitives (Button, Card, Input, …) |
| `components/slides/` | Slide preview renderers per layout |
| `components/decks/` | Deck list, editor shell, outline review |

## Forms

- react-hook-form + `@hookform/resolvers/zod`
- Server Actions for submit; show pending state with `useTransition`
- Toast success/error via `sonner`

## Slide editor

- `@dnd-kit` for slide reorder
- Layout picker constrained to `SLIDE_LAYOUTS`
- Autosave debounced 300–500ms
- Preview panel renders current slide via layout component

## Styling

- `cn()` utility for conditional classes
- No inline styles
- Responsive: mobile-first with `md:` breakpoints

## Imports

Use `@/` alias: `import { Button } from '@/components/ui/button'`
