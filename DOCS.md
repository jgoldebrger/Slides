# Documentation

## Map

| Doc | Audience | Updates when |
|-----|----------|-------------|
| [AGENTS.md](./AGENTS.md) | AI agents | Stack or agent rules change |
| [PROJECT.md](./PROJECT.md) | All devs | Structure, conventions change |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | All devs | System design changes |
| [FRONTEND.md](./FRONTEND.md) | Frontend | App Router, component patterns |
| [BACKEND.md](./BACKEND.md) | Backend | API, actions, jobs |
| [openapi/openapi.yaml](./openapi/openapi.yaml) | API contract | Internal HTTP OpenAPI 3.1 |
| [MIDDLEWARE.md](./MIDDLEWARE.md) | All devs | Auth flow changes |
| [DATABASE.md](./DATABASE.md) | Backend | Schema, RLS, migrations |
| [SECURITY.md](./SECURITY.md) | All devs | Security policy changes |
| [UX.md](./UX.md) | Design/PM | User flows change |
| [DESIGN.md](./DESIGN.md) | Design/Frontend | Visual system changes |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Backend | New third-party service |
| [TESTING.md](./TESTING.md) | All devs | Test strategy changes |
| [PERFORMANCE.md](./PERFORMANCE.md) | All devs | Performance targets/patterns |

## Cursor config

| Path | Purpose |
|------|---------|
| `.cursor/rules/project.mdc` | Always-on index (points here) |
| `.cursor/rules/*.mdc` | Scoped rules per domain |
| `.cursor/skills/*/SKILL.md` | Task-specific agent workflows |

## Maintenance rules

1. **Code is source of truth** — update docs when behavior changes, not before
2. **Keep docs concise** — actionable bullets, not essays
3. **One topic per file** — cross-link, don't duplicate
4. **Update both** — when adding a pattern, update the relevant `.md` and `.mdc` rule
5. **Env changes** — always update `.env.example` alongside code

## Pass levels

- **Pass 1** (current): Foundation docs, Cursor rules/skills, env template
- **Pass 2** (future): API reference, runbooks, onboarding guide
- **Pass 3** (future): ADRs, deployment guide, incident playbooks

## Do not edit

Project plan files — they are managed separately.
