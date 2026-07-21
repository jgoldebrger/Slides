# UX Review

Review UpdateDeck UI for usability, clarity, and task completion.

## When to use

- New pages or major UI changes in dashboard, editor, or onboarding
- Before shipping a user-facing flow

## Process

1. Identify the user goal and primary persona (PM, team lead, exec stakeholder)
2. Walk the flow step-by-step: signup → project → update → deck → export
3. Check against UX.md principles: progressive disclosure, status visibility, empty states
4. Flag friction: extra clicks, unclear CTAs, missing feedback, dead ends
5. Verify error and loading states exist for async actions (AI generate, export)

## Output format

```markdown
## UX Review: [feature/screen]

### Flow tested
[steps]

### Issues (severity: high/medium/low)
- [issue] → [recommendation]

### Strengths
- ...

### Priority fixes
1. ...
```

## Checklist

- [ ] Primary action obvious on every screen
- [ ] Deck status always visible during generation
- [ ] Destructive actions confirmed
- [ ] Empty states guide next step
- [ ] Mobile layout acceptable (responsive, not broken)
