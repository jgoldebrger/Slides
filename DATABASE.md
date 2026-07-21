# Database

## Provider

Supabase Postgres with Row Level Security on all public tables.

## Schema

### Core tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (extends `auth.users`) |
| `organizations` | Tenant workspaces |
| `organization_members` | User ↔ org mapping with role |
| `projects` | Projects within an org |
| `project_updates` | Structured update data (JSONB fields) |
| `decks` | Presentation decks |
| `slides` | Individual slides |
| `slide_assets` | Images attached to slides |
| `brand_kits` | Org branding (colors, logo, font, AI writing tone) |
| `exports` | PPTX export jobs |
| `ai_generations` | AI usage audit log (`status`, optional `result` jsonb for async job polling) |
| `deck_share_links` | View-only share tokens (hashed) for stakeholder access |
| `deck_revisions` | Slide snapshots before refresh/regenerate/restore |

### Enums

- `org_role`: `owner`, `admin`, `member`
- `deck_status`: `draft`, `outline`, `approved`, `generating`, `ready`, `failed`
- `export_status`: `pending`, `processing`, `completed`, `failed`

## RLS

All tables have RLS enabled. Primary check:

```sql
public.is_org_member(org_id)  -- security definer function
```

Slides/assets use subquery through `decks` to resolve `org_id`.

## Migrations

Location: `supabase/migrations/`

- Numbered sequentially: `001_initial_schema.sql`, `002_...`
- Include table + policies in same migration
- Test with two users in different orgs to verify isolation

## JSONB fields

| Table.Column | TypeScript type |
|--------------|----------------|
| `project_updates.goals` | `string[]` |
| `project_updates.metrics` | metric objects |
| `decks.outline` | `DeckOutline` |
| `slides.content` | `SlideContent` |

Validate JSONB on write with Zod before inserting.

## Storage buckets

| Bucket | Path pattern | Access |
|--------|-------------|--------|
| `screenshots` | `{org_id}/{project_id}/{file}` | Private, signed URLs |
| `brand-logos` | `{org_id}/{file}` | Private |
| `slide-assets` | `{org_id}/{slide_id}/{file}` | Private |
| `exports` | `{org_id}/{export_id}.pptx` | Private, signed download |

## Signup trigger

`handle_new_user()` creates profile + personal org + owner membership on `auth.users` insert.

## Indexes

Index all foreign keys: `org_id`, `project_id`, `deck_id`, `slide_id`.

## Local dev

```bash
supabase start          # local Postgres
supabase db push        # apply migrations
supabase db reset       # reset + reapply
```
