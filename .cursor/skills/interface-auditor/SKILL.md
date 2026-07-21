# Interface Auditor

Audit UpdateDeck UI components for consistency, accessibility, and design system compliance.

## When to use

- Reviewing PRs that touch `src/components/` or `src/app/`
- Periodic design QA before release

## Audit areas

### Design system
- Uses shadcn/ui primitives from `components/ui/`
- Semantic Tailwind tokens (no raw hex)
- Consistent spacing, typography, button variants

### Accessibility
- Keyboard navigation works (tab order, focus visible)
- Icon buttons have `aria-label`
- Form fields have associated labels
- Color contrast WCAG AA
- Modals trap focus and close on Escape

### Responsiveness
- Dashboard usable at 1280px and 768px
- Slide editor doesn't overflow horizontally
- Touch targets ≥ 44px on mobile

### States
- Loading, empty, error, and success states present
- Disabled buttons during in-flight requests

## Output format

| Component | Issue | Severity | Fix |
|-----------|-------|----------|-----|
| ... | ... | high/med/low | ... |

Reference DESIGN.md and UX.md for expected patterns.
