# UX

## Personas

- **Project manager** — captures weekly updates, generates decks for stakeholders
- **Team lead** — reviews and edits AI-generated slides before sharing
- **Executive** — consumes exported PPTX; rarely uses the app

## Core journeys

### 1. Onboarding
Signup → auto-created org → empty dashboard → "Create your first project" CTA

### 2. Capture update
Select project → fill structured form (goals, progress, metrics, risks, blockers, next steps) → save

### 3. Generate deck
Choose deck type → AI generates outline → user reviews/edits outline → approve → slides generate

### 4. Edit deck
Slide list with DnD reorder → click slide to edit title, content, notes → autosave. Slide images: upload as-is, annotate (pen, highlight, shapes, crop, blur), then apply or **Polish with AI** (clean rebuild or keep annotations).

### 5. Export
Click export → background job → notification/download when ready

## UX principles

- **Show status always** — deck and export progress never hidden
- **Progressive disclosure** — simple path works; advanced options available
- **Confirm destructive actions** — delete deck, discard outline
- **Guide empty states** — every empty list has a clear next action

## Feedback patterns

| Action | Feedback |
|--------|----------|
| Save update | Toast "Saved" |
| Generate outline | Progress indicator + "Generating outline…" |
| Approve outline | Status badge changes to `approved` |
| Generate slides | Full-page or modal progress; poll or realtime |
| Export | Toast + download link when `completed` |
| Annotate image | Modal with tools; Apply saves flat PNG; Polish enqueues AI job |
| Error | Inline message + retry option |

## Accessibility

- Keyboard-navigable editor (tab between slides, arrow keys in lists)
- DnD has keyboard alternative (move up/down buttons)
- All form fields labeled; errors linked via `aria-describedby`
- Status communicated with text + icon, not color alone
- Focus management in modals and dialogs

## Responsive

- Dashboard: sidebar collapses on mobile
- Slide editor: list stacks above preview on narrow screens
- Minimum supported width: 768px
