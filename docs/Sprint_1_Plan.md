# Sprint 1 Plan — Foundation + Landing + Calculator

**Goal**: Working scaffold + complete pre-assessment flow (Landing → Email Gate → NRR Calculator → Capability Selection) deployed to a staging URL, lead-capture wired to HubSpot.

**Duration**: 1-2 weeks (depending on Claude Code pace).

**Branch**: All work in `staging`. NO merges to `main` until end-of-sprint Laura review.

## Sprint scope (stories from PRD §11.5)

| Story | Size | Description |
|---|---|---|
| Story 0 | M | Scaffold the monorepo (client + server, Tailwind, TypeScript configs) |
| S1.1 | M | Landing page hero + sub-hero + scorecard sample visual |
| S1.2 | S | Email capture form with consent + client/server validation |
| S1.3 | M | /api/start-session endpoint creating HubSpot contact |
| S1.4 | S | Wire analytics events: page_view, form_submitted, session_started |
| S2.1 | M | NRR Calculator UI with 4 inputs, live computation, validation |
| S2.2 | S | Interpretation badges by NRR band |
| S2.3 | S | Skip-calculator flow with confirmation modal |
| S3.1 | S | Confirm `rubric.json` valid; add JSON schema validator |
| S3.2 | M | React state management for picks (Context + reducer + localStorage) |
| S3.3 | M | Capability Selection page with 4 checkboxes + dynamic time estimate + validation |

**11 stories total. Roughly 1 person-week if Claude Code paces well.**

## Sequencing and stopping points

Each STOP is a Laura-review gate. Do NOT continue past a STOP without explicit approval.

```
[Story 0] Scaffold
    ↓
   STOP — Laura reviews repo structure, runs `npm run dev`, confirms client + server boot
    ↓
[S1.1] Landing page (no functionality, just the hero + sample visual)
    ↓
[S1.2] Email capture form (client-side only — no HubSpot yet)
    ↓
   STOP — Laura reviews landing page UX (desktop + mobile)
    ↓
[S1.3] /api/start-session + HubSpot contact creation
[S1.4] Analytics wiring
    ↓
   STOP — Laura verifies a test email creates a HubSpot contact with correct properties
    ↓
[S2.1] NRR Calculator core
[S2.2] Interpretation badges
[S2.3] Skip modal
    ↓
   STOP — Laura uses the calculator end-to-end, confirms math matches Excel
    ↓
[S3.1] rubric.json validator
[S3.2] State management foundation
    ↓
[S3.3] Capability Selection page
    ↓
   STOP — Sprint 1 complete. Full pre-assessment flow demoable. Laura review + retro.
    ↓
  Merge `staging` → `main` (with Laura's explicit approval).
```

## Story details

### Story 0 — Scaffold the monorepo

**What**: Set up the working repo structure so all subsequent stories have a place to live.

**Tasks**:
- `npm create vite@latest client -- --template react-ts` in `client/`
- `npm install` Tailwind, postcss, autoprefixer; configure `tailwind.config.js` with the brand color tokens
- Initialize the `server/` workspace: `npm init`, install Express + TypeScript types, basic `index.ts` with health check
- Configure npm workspaces in root `package.json` (already created by init.ps1)
- Add `concurrently` so `npm run dev` boots both client and server
- Configure ESLint + Prettier (consistent with Loremex-Website conventions)
- Add `vitest` for client tests
- Verify `npm run dev` works — client on 5173, server on 3001
- Verify `npm run build` succeeds
- Commit to `staging`

**Done when**:
- [ ] `npm run dev` boots client + server without errors
- [ ] `npm run build` produces a dist/ in client and server (or compiled JS)
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` all pass with zero output
- [ ] `client/src/content/rubric.json` is present, valid, and importable
- [ ] Folder structure matches `CLAUDE.md`

**STOP for Laura review**: `npm run dev`, browse to localhost:5173, see Vite default page, then continue.

---

### S1.1 — Landing page hero + scorecard sample

**What**: The first page a visitor sees. Sets the value prop and visual frame.

**Tasks**:
- Build the hero section: headline ("NRR is moved, not measured"), sub-headline, visual treatment per loremex.ai brand
- Build a static "what you'll get" preview showing a stylized sample scorecard
- Add the "Start Assessment" CTA (button — does nothing yet)
- Make it responsive (320px+ viewports)
- Apply brand typography (Georgia for headings, Instrument Sans for body)

**Done when**:
- [ ] Visual matches loremex.ai aesthetic (monochrome blue/navy, clean typography, ample whitespace)
- [ ] Renders correctly on iPhone 13 portrait, iPad landscape, desktop 1440px
- [ ] Lighthouse Performance ≥ 90 on this page
- [ ] No console errors

---

### S1.2 — Email capture with consent

**What**: The gate that every visitor must pass before accessing any assessment content.

**Tasks**:
- Form with: email input (required), consent checkbox (required), submit button
- Client-side validation: email format, consent checked
- Inline error messages (no toasts)
- Submit handler stores email + consent in React state and advances to NRR Calculator (no API call yet)
- Disabled submit until both fields valid
- Accessibility: focus order, ARIA labels, keyboard nav

**Done when**:
- [ ] Form rejects invalid emails inline
- [ ] Consent unchecked = submit disabled with tooltip
- [ ] Submitting routes to /calculator
- [ ] Form passes WAVE accessibility check
- [ ] Test: invalid email → error; valid email + consent → advance

**STOP for Laura review**: Walk through landing → email gate → (would land on calculator stub).

---

### S1.3 — /api/start-session + HubSpot

**What**: Wire the email capture to actually create a HubSpot contact.

**Tasks**:
- Server route: POST /api/start-session
- Body: `{ email, consent, source: "assessment" }`
- Server-side validation (don't trust client)
- HubSpot Contacts API: create contact (or update if email exists)
- Set custom properties: `first_touch_source = "assessment"`, `assessment_consent_at = ISO timestamp`
- Return `{ sessionId }` (just a UUID for tracking)
- Retry logic: 3 attempts with exponential backoff on 5xx
- Error handling: if HubSpot fails after retries, log + queue + return success to client (don't block UX)
- Client: replace the local state advance with an API call; show loading state during submission
- Add server route smoke tests

**Done when**:
- [ ] Submitting the form creates/updates a HubSpot contact
- [ ] Custom property values appear correctly in HubSpot UI
- [ ] HubSpot 500 simulated → contact creation queued, user still advances
- [ ] No PII or API keys leak to the browser
- [ ] Server logs show the contact ID for every successful submission

---

### S1.4 — Analytics wiring

**What**: Instrument the funnel events so we can measure conversion.

**Tasks**:
- Install Posthog client SDK in `client/`
- Configure with `VITE_POSTHOG_KEY` from `.env.local`
- Track these events with the properties documented in PRD §13.5:
  - `page_view` (auto on route changes)
  - `email_submitted` with `{ valid: bool }`
  - `session_started` with `{ session_id }`
- Verify events arrive in Posthog UI in dev mode

**Done when**:
- [ ] All three events fire with correct properties
- [ ] Posthog dashboard shows the funnel: landing → email submit → session started
- [ ] No events fire if `VITE_POSTHOG_KEY` is unset (graceful no-op)

**STOP for Laura review**: Verify a real-name test email creates a HubSpot contact AND fires Posthog events.

---

### S2.1 — NRR Calculator core

**What**: The 4-input calculator that computes NRR / GRR / Net Movement live.

**Tasks**:
- Build the calculator UI: 4 currency inputs (Starting MRR, Expansion, Contraction, Churn)
- Add tooltips on each input with semantic definitions (from rubric.json's NRR Semantics section, or hardcoded for now — Laura to provide if not in JSON)
- Live computation as user types (debounced 100ms)
- Display: NRR %, GRR %, Net Movement
- Validation: Starting MRR > 0 required; others ≥ 0
- Inline error messages
- "Continue" button advances to Capability Selection (S3.3); disabled until Starting MRR is valid
- "Skip Calculator" link triggers the modal (S2.3)

**Done when**:
- [ ] Math matches the Excel calculator exactly (test: $1M / $180K / $40K / $60K → NRR 108.0%, GRR 90.0%, Net $80,000)
- [ ] Negative inputs rejected
- [ ] Continue is disabled until Starting MRR > 0
- [ ] Tooltips visible on hover and on tab focus
- [ ] Renders correctly on mobile

---

### S2.2 — Interpretation badges

**What**: Color-coded NRR band display.

**Tasks**:
- Read `nrrBands` from rubric.json
- Display the matching badge below the computed NRR (e.g., "Strong" green badge for NRR ≥ 110%)
- Animation: subtle fade-in when band changes

**Done when**:
- [ ] Bands match rubric.json thresholds exactly
- [ ] Each band has the correct color from the JSON config
- [ ] Test: 125% → World-class, 115% → Strong, 105% → Net positive, 95% → Eroding, 85% → Declining

---

### S2.3 — Skip calculator flow

**What**: Let users skip the calculator if they don't have the inputs at hand.

**Tasks**:
- "Skip Calculator" link below the form
- Click opens a modal: "Your scorecard will be more useful with NRR computed. Continue without it?"
- Two buttons: "Go Back" (closes modal) / "Skip and Continue" (advances to Capability Selection; sets `nrrCalculatorSkipped: true` in state)
- Track event: `nrr_calculator_skipped`

**Done when**:
- [ ] Modal traps focus (a11y)
- [ ] Skip persists in state so scorecard knows to show "Not calculated"
- [ ] Modal closes on Escape

**STOP for Laura review**: Full calculator flow demoable. Laura tests with her own NRR.

---

### S3.1 — Validate rubric.json

**What**: Add a runtime schema validator so we catch malformed content before the app renders.

**Tasks**:
- Install `zod` (or similar)
- Define a Zod schema matching `rubric.json` structure (capabilities, levers, dimensions, etc.)
- Add a module that loads + validates `rubric.json` at app boot
- If validation fails, show a clear error in dev mode and silently log + render fallback in prod
- Add a unit test: `npm run test` validates the shipped rubric.json

**Done when**:
- [ ] `rubric.json` validates cleanly
- [ ] Hand-mangling a field (e.g., removing a weight) is caught with a clear error
- [ ] CI step: build fails if rubric.json doesn't validate

---

### S3.2 — State management foundation

**What**: The Context + Reducer + localStorage layer that holds all assessment state.

**Tasks**:
- Define state shape:
  ```ts
  type State = {
    sessionId: string | null;
    email: string | null;
    consent: boolean;
    nrrInputs: { start, expansion, contraction, churn } | null;
    nrrCalculatorSkipped: boolean;
    selectedCapabilities: string[];     // ["measurement", "retention", ...]
    picks: { [capKey]: { [leverId]: { [dim]: string }}};   // for action caps
                                                            // measurement: { picks: [capKey][leverId]: string }
    completedSections: string[];
  };
  ```
- Reducer with actions: SET_EMAIL, SET_NRR_INPUTS, SKIP_CALCULATOR, SET_SELECTED_CAPS, SET_PICK, COMPLETE_SECTION, RESET
- Custom hook: `useAssessmentState()` returning `[state, dispatch]`
- localStorage persistence: subscribe to state changes, write to `loremex_assessment_state` key (with version)
- Hydration on mount: read localStorage if present
- Migrate-or-clear strategy if schema version mismatch

**Done when**:
- [ ] Submitting email persists across refresh
- [ ] Filling NRR Calculator persists across refresh
- [ ] localStorage version bump correctly invalidates old state

---

### S3.3 — Capability Selection page

**What**: The selection page where users pick which blocks to assess.

**Tasks**:
- Read capability metadata from rubric.json (name, tagline, estimatedMinutes, recommendedDefault)
- Render 4 checkbox cards (NRR Reporting first, then Retention, Expansion, Pricing)
- Default all 4 checked; "Recommended (foundational)" label on NRR Reporting
- Dynamic time estimate updates as boxes toggle
- Continue button: disabled until ≥ 1 checked
- If user unchecks NRR Reporting + keeps action cap: show recommendation note
- Track event: `capabilities_selected` with `{ capabilities, scope, estimated_minutes }`
- On submit: store in state; advance to first selected section (placeholder route — section pages are Sprint 2)

**Done when**:
- [ ] All checkboxes default to checked on first visit
- [ ] Time estimate updates dynamically
- [ ] Continue is disabled until ≥ 1 box is checked
- [ ] Unchecking NRR Reporting + keeping action cap shows the soft warning
- [ ] Selection persists in state across refresh
- [ ] Posthog event fires with correct properties

**STOP for Sprint 1 close**: Full pre-assessment flow works end-to-end. Laura demos: Landing → Email Gate (creates HubSpot contact) → Calculator (live math) → Capability Selection (picks 2 caps) → placeholder section. Then merge `staging` → `main` with explicit approval.

## Definition of done (sprint-level)

- [ ] All 11 stories closed
- [ ] All STOPs reviewed by Laura
- [ ] `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` all green
- [ ] Reference math test cases pass in `client/src/lib/scoring.test.ts`
- [ ] Vercel preview URL exists for `staging` and is reviewable
- [ ] HubSpot test contact exists with all custom properties populated
- [ ] Posthog dashboard shows the Sprint 1 funnel
- [ ] No console errors or warnings in browser
- [ ] Sprint 1 retro doc in `docs/sprints/sprint_1_retro.md`

## What's NOT in Sprint 1

(For clarity — don't drift into these.)

- Any assessment section (measurement or action) — Sprint 2
- Scorecard, heatmaps, recommendation block — Sprint 3
- PDF export — Sprint 4
- Resend transactional email — Sprint 4
- Mobile polish + accessibility audit — Sprint 5
- Production deploy + monitoring — Sprint 5

## Risks for Sprint 1

| Risk | Mitigation |
|---|---|
| HubSpot Contacts API quirks (custom property validation, dedup behavior) | Use HubSpot sandbox account; test with real `assessment@loremex.ai` test emails first |
| Tailwind + Vite SSG config compatibility | Defer SSG concern to Sprint 5; develop in standard Vite SPA mode for now |
| Posthog SDK quotas / dev-vs-prod env separation | Use separate Posthog projects for dev and prod; gate with env vars |
| Brand visual divergence from loremex.ai | Capture screenshots of loremex.ai key pages and pin in the repo as visual reference |
