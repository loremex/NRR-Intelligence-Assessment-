# Sprint 1 Retrospective — NRR Intelligence Assessment

**Sprint**: Sprint 1 — Foundation & Pre-Assessment Flow
**Date**: 2026-06-16 → 2026-06-17
**Tag**: v0.1.0
**Branch merged**: staging → main

---

## What was delivered

| Story | Title | Status |
|-------|-------|--------|
| S0 | Monorepo scaffold (Vite + React + TS + Tailwind client, Express + TS server) | ✅ Done |
| S1.1 | Landing page hero + sample scorecard | ✅ Done |
| S1.2 | Email capture with consent gate | ✅ Done |
| S1.3 | HubSpot lead capture wiring | ✅ Done |
| S1.4 | Analytics stub (typed event system) | ✅ Done |
| S2.1 | NRR Calculator core (live math, 4 inputs) | ✅ Done |
| S2.2 | Interpretation badges (NRR band + color) | ✅ Done |
| S2.3 | Skip calculator flow (confirm modal) | ✅ Done |
| S3.1 | rubric.json Zod schema validator | ✅ Done |
| S3.2 | State management foundation (Context + Reducer + localStorage) | ✅ Done |
| S3.3 | Capability Selection page | ✅ Done |

**Test suite**: 60 tests passing (54 client, 6 server)
**Build**: Clean — client bundle ~330KB (~97KB gzipped)
**Lint/typecheck**: 0 errors, 0 warnings

---

## What went well

- **Math-first approach**: Implementing NRR math with reference test cases before UI meant the calculator was correct from the first render.
- **Zod schema on rubric.json**: Catching rubric shape errors at module load (fail-loud in dev, graceful fallback in prod) will save hours of debugging in Sprint 2 when assessment section components start reading deeply nested lever data.
- **State consolidation in S3.2**: Replacing the piecemeal session.tsx with a single `AssessmentState` reducer + localStorage persistence means Sprint 2 can add picks and scoring without touching state architecture.
- **HubSpot create-or-update pattern**: The search→create/PATCH flow with retry handles re-submissions cleanly and is already tested.
- **Analytics type system**: The discriminated union `AnalyticsEvent` makes it easy to swap in PostHog in Sprint 2 without touching call sites.

## What could be improved

- **`.claude/settings.local.json` not gitignored**: Claude Code wrote permitted bash commands (including a curl with the HubSpot token) into `.claude/settings.local.json`, which was committed and blocked the push. Added `.claude/settings.local.json` to `.gitignore` and rewrote the offending commit before pushing. Root fix: add `.claude/` to `.gitignore` at scaffold time.
- **Context budget**: Sprint 1 spanned two sessions with a context compaction mid-way. Sprint 2 stories should be sized so each fits in one session.
- **server/.env not templated**: The `server/` directory needs its own `.env.example` (separate from root `.env.example`) so a fresh clone is clear on what server-side env vars are required.

---

## Decisions made during Sprint 1

1. **S1.4 reduced scope**: PostHog integration deferred to Sprint 2. `track()` logs to console only in Sprint 1. Laura approved.
2. **HubSpot `booleancheckbox` requires explicit options**: The `assessment_consent` property needed `options: [{label: 'Yes', value: 'true'}, {label: 'No', value: 'false'}]` — undocumented HubSpot API requirement discovered in integration testing.
3. **state.tsx replaces session.tsx**: S3.2 introduced a proper `AssessmentState` type with `picks` for all four capabilities. The old `session.tsx` was removed; `App.tsx` was updated to use `AssessmentStateProvider`.
4. **rubric.ts validates at import time**: Zod parse runs once at module initialization. Dev throws hard on invalid rubric; prod falls back to a minimal safe rubric and logs an error.

---

## Sprint 2 entry point

**Branch**: `staging` (continue from current HEAD)

**Epics to implement**:
- E3: Assessment Sections (NRR Reporting / Measurement block + Action capability blocks)
- E4: Scoring engine (`client/src/lib/scoring.ts` with all rollup math + reference test cases)
- E5: Scorecard (HeadlineTiles, CrossCapDimView, PerCapHeatmap, ThreeWeakest, RecommendationBlock)

**First story**: S4.1 — Scoring engine with all four reference test cases from CLAUDE.md

**Prerequisites before starting**:
- Install PostHog client in Sprint 2 S1 and wire `track()` calls
- Add `server/.env.example` template
- Review PRD §6.3 (assessment section layout) before implementing measurement vs. action section components
