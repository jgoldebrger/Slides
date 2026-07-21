# Flow Checker

Validate end-to-end user flows in UpdateDeck for completeness and correctness.

## When to use

- Adding or changing a multi-step workflow
- Debugging "user got stuck" reports

## Core flows to verify

| Flow | Steps |
|------|-------|
| Auth | signup → email confirm → dashboard |
| Project | create project → add update → save |
| Deck | select type → generate outline → approve → generate slides |
| Edit | reorder slides → edit content → autosave |
| Export | request PPTX → job runs → download link |
| Billing | upgrade → Stripe checkout → feature unlock |

## Process

1. Map the flow as a sequence diagram (happy path + branches)
2. Identify entry points, exit points, and state transitions
3. Verify each transition updates DB status correctly (`deck_status`, `export_status`)
4. Check auth gates: unauthenticated redirect, wrong-org access denied
5. Confirm rollback/error paths don't leave orphan or stuck states

## Output

List each step with: **trigger → handler → DB change → UI feedback → next step**

Flag any step missing feedback, auth check, or status update.
