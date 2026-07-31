# AI Deck Player — Design Spec

**Date:** 2026-07-31  
**Status:** Approved (brainstorming)  
**Problem owner:** Joel  
**Scope:** Autonomous conversational AI player for shared decks with grounded viewer Q&A and deferred-question follow-up

## Problem

UpdateDeck today offers two disconnected AI capabilities:

1. **Slide narration (TTS)** — reads slide text aloud via OpenAI `tts-1`; a script reader, not a presenter.
2. **Deck chat (editor)** — text-only AI assistant for editing; no voice, not available on share links.

Share-link viewers get a static slide player with optional per-slide narration. There is no autonomous presentation experience and no way for viewers to ask questions. Existing `liveQaFromDeck` and `AiPresentPanel` stubs are editor-only debug UI with no voice output and no viewer path.

Users want an **interactive AI deck player**: press play on a share link, the AI presents conversationally, viewers ask questions, and the AI never hallucinates — unanswered questions are logged for the deck owner.

## Goals

| Goal | Success signal |
|------|----------------|
| Autonomous playback | Deck plays start-to-finish on a share link without human intervention |
| Conversational narration | AI speaks in natural presenter voice, not bullet-for-bullet reading |
| Grounded Q&A | Answers cite deck content + project updates; ungrounded questions are deferred |
| Deferred questions | Unanswered questions saved; owner notified; viewer sees follow-up promise |
| Trust | Zero hallucinated metrics, dates, or commitments |
| Graceful degradation | LLM/TTS failures fall back to existing narration behavior |

## Non-goals (v1)

- Human presenter mode or co-presenting
- Viewer voice input (text questions only on share page)
- Real-time human takeover mid-session
- Voice cloning / custom brand voices
- AI editing the deck during playback
- Supabase Realtime (use polling or inline request/response)
- Playback analytics table (`player_playbacks` — defer to v2)

## User stories

| Actor | Story |
|-------|-------|
| Deck owner | Share a link; the AI runs the presentation without me |
| Viewer | Watch, listen, and ask text questions about the content |
| Viewer | Get a cited answer when the deck has it |
| Viewer | Hear a clear deferral when the deck does not have it |
| Deck owner | See unanswered questions in the dashboard and respond async |

## Architecture

### Approach

**Orchestrated LLM + existing TTS** (Approach A from brainstorming). One player orchestrator on top of existing OpenAI TTS, `liveQaFromDeck`, and share-token auth. Phased delivery; OpenAI Realtime API is a v3 option if latency becomes a bottleneck.

### Player state machine

```
idle → narrating → (slide complete) → narrating
                 → (viewer question) → answering → narrating
                 → (not grounded) → deferred → narrating
                 → (last slide) → complete
```

### High-level flow

```
Viewer opens /view/[token]
    → presses Play
    → for each slide:
          LLM generates conversational script
          TTS plays MP3 (cached)
          auto-advance when audio ends
    → viewer submits text question anytime:
          playback pauses
          liveQaFromDeck(question, slides, updates)
          if grounded + citations: speak answer, show citations, resume
          else: speak deferral, save deferred_question, notify owner, resume
```

### Core modules

| Module | Path (proposed) | Responsibility |
|--------|-----------------|----------------|
| Player orchestrator | `src/lib/ai/present/player-orchestrator.ts` | State machine; narration + Q&A loops |
| Player narration | `src/lib/ai/present/player-narration.ts` | LLM conversational script per slide |
| Player Q&A | `src/lib/ai/present/player-qa.ts` | Wrap `liveQaFromDeck`; grounding gate |
| Player defer | `src/lib/ai/present/player-defer.ts` | Save deferred questions; notify owner |
| Player TTS | Reuse `src/lib/ai/tts.ts` | `getOrCreateNarrationMp3` with script hash cache |
| Player UI | Extend `src/components/decks/slide-player.tsx` | Play/pause, question input, citations |

Editor continuity (v2): extend `DeckChatPanel` with optional spoken replies using the same TTS voice preference (`NarrationPrefs`).

### Q&A trust rule

```
Viewer asks question
  → liveQaFromDeck(question, slides, projectUpdates)
  → if result.grounded === true AND result.citations.length > 0:
       speak answer + show citations briefly
  → else:
       speak: "I don't have that information in this presentation.
               I've logged your question and we'll get back to you."
       insert deferred_questions row
       notify deck owner (email via Resend)
       resume narration
```

`grounded: false` from the LLM is a hard gate. No answer is spoken unless citations exist.

### Narration vs. current TTS

| Current | AI Deck Player |
|---------|----------------|
| `buildSlideNarration` concatenates slide fields | LLM writes presenter-style script per slide |
| Cached by slide content + voice + speed | Cached by script hash + voice + speed |
| Manual slide advance | Auto-advance after audio ends (+ short pause) |
| No Q&A | Q&A pauses playback |

On LLM narration failure, fall back to `buildSlideNarration` (existing behavior).

Pre-fetch next slide's audio while current slide plays to reduce inter-slide wait.

## Database

### `deferred_questions` (new table, org-scoped RLS)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `org_id` | uuid | RLS scope; FK → `organizations` |
| `deck_id` | uuid | FK → `decks` |
| `share_link_id` | uuid | FK → `deck_share_links` |
| `question` | text | Max 500 chars |
| `viewer_email` | text | Nullable; optional follow-up contact |
| `status` | text | `pending` \| `answered` \| `dismissed` |
| `owner_answer` | text | Nullable |
| `answered_at` | timestamptz | Nullable |
| `created_at` | timestamptz | Default `now()` |

RLS policies:

- Org members with deck access: `SELECT`, `UPDATE` (answer/dismiss)
- Insert via service role in API route (share-token auth validated server-side before insert)

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/decks/[id]/player/narrate-slide` | `shareToken` or authenticated user | Generate conversational script + return MP3 for one slide |
| `POST /api/decks/[id]/player/ask` | `shareToken` | Viewer question → `{ type: "answered" \| "deferred", spokenReply, citations? }` |
| `GET /api/decks/[id]/deferred-questions` | Deck edit access | Owner lists pending questions |
| `PATCH /api/decks/[id]/deferred-questions/[qid]` | Deck edit access | Owner answers or dismisses |

Share-token auth reuses the pattern in `src/app/api/decks/[id]/narrate/route.ts` (`hashShareToken`, `deck_share_links` validation).

### Request/response shapes

**`POST .../player/narrate-slide`**

```ts
// Request
{ slideId: string; voice?: AiTtsVoice; speed?: number; shareToken?: string }

// Response: audio/mpeg stream (same as narrate route)
```

**`POST .../player/ask`**

```ts
// Request
{ question: string; shareToken: string; viewerEmail?: string }

// Response
{
  type: "answered" | "deferred";
  spokenReply: string;
  citations?: Array<{ field: string; excerpt: string }>;
}
```

## UI

### Share page (`/view/[token]`)

Extend `SlidePlayer` when `shareMode` is true and feature flag `present_ai_player` is enabled:

- **Play** — start autonomous narration from slide 1
- **Pause** — freeze narration; questions still accepted
- **Progress bar** — slide index + estimated time
- **Voice selector** — reuse `AI_TTS_VOICE_LABELS`
- **Ask a question** — text input + optional email for follow-up
- **Answer display** — citations shown briefly below player, then fade
- **Deferral display** — inline confirmation: "Question logged — we'll follow up"

When feature flag is off or `OPENAI_API_KEY` missing, show existing static slide viewer (no regression).

### Owner dashboard

New "Questions" section on deck editor (or tab):

- List `deferred_questions` where `status = 'pending'`
- Owner types answer → `status = 'answered'`
- Optional email to `viewer_email` if provided
- Badge on deck list card: pending question count

## Error handling

| Condition | Behavior |
|-----------|----------|
| TTS API down | Show text transcript; offer "Retry audio" |
| LLM narration fails | Fall back to `buildSlideNarration` |
| Q&A LLM fails | "I couldn't process that — try rephrasing" (do not defer) |
| Rate limit hit (viewer) | "Too many questions — try again later" |
| No `OPENAI_API_KEY` | Hide AI player controls |
| Share link expired/revoked | Existing 403 behavior |
| Question > 500 chars | Reject with validation error |

## Rate limits & entitlements

- New rate-limit bucket: `player` (separate from `narrate`)
- Viewer questions: cap per IP/session (e.g. 10/hour on share links)
- TTS + LLM calls count against org AI entitlement (`assertOrgCanUsePaidFeatures`)
- Feature flag: `present_ai_player` gates the entire feature

## Phased rollout

| Phase | Scope |
|-------|-------|
| **v1a** | Conversational narration + auto-advance on share page |
| **v1b** | Viewer Q&A with grounded answers |
| **v1c** | Deferred questions + owner dashboard + owner email notification |
| **v2** | Editor spoken deck-chat replies; pre-fetch all slide audio on Play |
| **v3** | OpenAI Realtime API if latency is a product issue |

## Testing

| Layer | What |
|-------|------|
| Unit | Player orchestrator state transitions |
| Unit | Grounding gate — defer when `grounded: false` or empty citations |
| Unit | `player-narration` fallback to `buildSlideNarration` on LLM error |
| Unit | Deferred question insert + status transitions |
| Integration | Share-token auth on player routes |
| E2E | Play → auto-advance → ask grounded question → citation shown |
| E2E | Ask ungrounded question → deferral spoken → owner sees pending question |

## Files (expected)

| File | Responsibility |
|------|----------------|
| `src/lib/ai/present/player-orchestrator.ts` | State machine |
| `src/lib/ai/present/player-narration.ts` | Conversational script generation |
| `src/lib/ai/present/player-qa.ts` | Q&A with grounding gate |
| `src/lib/ai/present/player-defer.ts` | Deferred question persistence + notify |
| `src/lib/ai/prompts/player-narration.ts` | Narration prompt |
| `src/app/api/decks/[id]/player/narrate-slide/route.ts` | Narrate-slide API |
| `src/app/api/decks/[id]/player/ask/route.ts` | Viewer Q&A API |
| `src/app/api/decks/[id]/deferred-questions/route.ts` | Owner list |
| `src/app/api/decks/[id]/deferred-questions/[qid]/route.ts` | Owner answer/dismiss |
| `src/components/decks/ai-deck-player-controls.tsx` | Share-page player UI |
| `src/components/decks/deferred-questions-panel.tsx` | Owner dashboard panel |
| `supabase/migrations/..._deferred_questions.sql` | Schema + RLS |
| `src/lib/ai/feature-flags.ts` | Add `present_ai_player` |
| `src/lib/rate-limit.ts` | Add `player` bucket |

## Global constraints

- Next.js 15+ App Router, TypeScript, Zod validation
- Vercel AI SDK `generateObject` + OpenAI (`gpt-4o-mini` for narration + Q&A)
- TTS via existing OpenAI `tts-1` (`src/lib/ai/tts.ts`)
- Email via existing Resend client (`src/lib/email/client.ts`)
- No new npm dependencies
- Org-scoped; share routes validate token server-side; no RLS bypass in user paths
- Slide contract: `src/types/slide.ts`
