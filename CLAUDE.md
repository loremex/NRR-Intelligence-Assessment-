# CLAUDE.md — NRR Intelligence Assessment

This is the project context Claude Code reads at the start of every session. Keep it current.

## What this is

The NRR Intelligence Assessment is Loremex's standalone, free, web-based self-diagnostic that scores a B2B SaaS company on the intelligence of how it measures NRR and acts on the three capabilities that move it: Retention, Expansion, and Pricing Optimization. It's the top-of-funnel entry point into LoremexOne.

Source spec: `docs/NRR_Intelligence_Assessment_PRD_v1.2.docx` (canonical — read this first).
Source content: `client/src/content/rubric.json` (all assessment questions, descriptors, weights).

## Stack

- **Frontend**: React 18 + Vite 5 + TypeScript 5
- **Backend**: Express 4 (Node 20)
- **Styling**: Tailwind CSS v3 + a small set of brand tokens (see `client/src/styles/tokens.css`)
- **State**: React Context + Reducer; localStorage persistence via custom hook
- **PDF**: jsPDF (client-side)
- **CRM**: HubSpot Forms API + Contacts API
- **Email**: Resend
- **Hosting**: Vercel (frontend SSG + serverless functions)
- **Analytics**: Vercel Analytics + Posthog
- **Repo layout**: monorepo with `client/` and `server/` workspaces

## Resolved CTO decisions

These are NOT open — proceed as specified:

1. **Email gate placement**: At the very beginning. The user must provide email + consent on the landing page before accessing the NRR Calculator or any assessment content. The full flow is: Landing → Email Gate → NRR Calculator → Capability Selection → Assessment Sections → Scorecard → PDF.
2. **Routing**: Hybrid — Landing page is SSG (Vite SSG mode) for SEO and fast first paint; assessment flow is client-side SPA for transitions and localStorage state.
3. **PDF generation**: Client-side jsPDF only. No Puppeteer.
4. **Section gating**: No forced gating. The Capability Selection page (§6.2b) lets users pick any combination; first selected section is the entry point.
5. **NRR Calculator**: Optional with confirmation modal on skip. Scorecard shows "Not calculated" if skipped.
6. **Localization**: English only at MVP.

## Brand and visual system

- **Colors**: Navy `#002337`, Brand Blue `#2563EB`, Gray Light `#F1F5F9`, Text Dark `#1E293B`
- **Typography**: Georgia for display headings, Instrument Sans for body
- **Level palette**: L1 `#FECACA`, L2 `#FED7AA`, L3 `#BFDBFE`, L4 `#A7F3D0`, L5 `#6EE7B7`
- **Action themes**: PROVE light blue, SELL light yellow, REINFORCE light green
- **Measurement themes**: FOUNDATION light teal, RIGOR light purple, DISTRIBUTE light orange
- Visual reference: `https://www.loremex.ai` (match this site's look)

## Critical conventions

### Content is in JSON, not in code

All assessment content (questions, descriptors, weights) lives in `client/src/content/rubric.json`. NEVER hard-code descriptor text or questions in components. If you need to change content, update the Excel canonical (`NRR_Intelligence_Assessment.xlsx`), re-run `scripts/export_rubric.py`, and commit the updated `rubric.json`.

### Math constants are in rubric.json, not in components

Lever weights, NRR bands, level colors, themes, and the intelligence ladder are all in `rubric.json`. Components read them; never re-declare them in code.

### Score extraction

Every dropdown option starts with `"<level> — "` (em-dash). To get the score from a picked answer: `parseInt(text.charAt(0))`. The leading digit IS the score.

### Reference test cases (validate math against these)

- **Test 1 — Retention**: scores `L1=[3,3,2,2], L2=[3,3,2,2], L3=[3,3,3,2], L4=[3,3,2,2], L5=[4,4,3,3], L6=[3,3,3,3], L7=[3,3,3,3]` → Capability Overall = `2.84`, Dim Avgs = `People 3.15, Process 3.15, Tech 2.58, Data 2.48`.
- **Test 2 — Measurement**: scores `M1=2, M2=3, M3=2, M4=1, M5=3, M6=2, M7=1` → Capability Overall = `2.02`.
- **Test 3 — All L5**: every cell L5 → all rollups = `5.0`, Distance to L5 = `0`.
- **Test 4 — All L1**: every cell L1 → all rollups = `1.0`, Distance to L5 = `4`.

Add unit tests in `client/src/lib/scoring.test.ts` covering these.

### Math rollup formulas

```ts
// Lever Avg (action capabilities only) — mean of 4 dim scores, skip blanks
leverAvg(scores) = mean(scores.filter(isFinite))

// Dim Avg (action capabilities only) — weighted avg of 7 lever scores in a dim
dimAvg(leverScoresForDim, leverWeights) = 
  sum(score_i * weight_i for populated cells) / sum(weight_i for populated cells)

// Capability Overall — weighted avg of Lever Avgs (action) or Category Scores (measurement)
capabilityOverall(leverAvgs, leverWeights) = same weighted formula

// Overall Intelligence — adapts to capability selection
overallIntelligence(selectedActionCapabilityOveralls) = 
  mean(selectedActionCapabilityOveralls)  // 1, 2, or 3 values
  // If 0 action caps selected: not computed; show "—"

// Distance to L5 = 5 - overallIntelligence

// Cross-Cap Dim Avg = mean of dim weighted scores across selected action caps
// Shown only if >= 2 action caps selected
```

### Recommendation block firing rules

Six patterns (see PRD §6.5b). Firing rules depend on what was selected:
- **A** (weakest cap) — needs >= 1 action cap selected
- **B** (cross-cap dim weakness) — needs >= 2 action caps
- **C** (measurement gap) — needs NRR Reporting selected
- **D** (strong baseline) — needs >= 1 action cap + Overall > 3.5
- **E** (theme imbalance) — needs >= 2 action caps
- **F** (pricing gap) — needs Pricing + >= 1 other action cap

Special-case: only NRR Reporting selected → fire a specialized Pattern C variant only.

3-4 sentence cap; priority order: C → B → A → F → E → D. Always end with the soft CTA.

## File structure

```
loremex-assessment/
├── client/                              # Vite + React + TS
│   ├── public/
│   ├── src/
│   │   ├── content/
│   │   │   └── rubric.json              # CANONICAL ASSESSMENT CONTENT
│   │   ├── components/
│   │   │   ├── landing/
│   │   │   ├── calculator/
│   │   │   ├── selection/
│   │   │   ├── assessment/
│   │   │   │   ├── MeasurementSection.tsx
│   │   │   │   └── ActionCapabilitySection.tsx
│   │   │   ├── scorecard/
│   │   │   │   ├── HeadlineTiles.tsx
│   │   │   │   ├── CrossCapDimView.tsx
│   │   │   │   ├── PerCapHeatmap.tsx
│   │   │   │   ├── ThreeWeakest.tsx
│   │   │   │   └── RecommendationBlock.tsx
│   │   │   └── shared/
│   │   ├── lib/
│   │   │   ├── scoring.ts               # ALL ROLLUP MATH
│   │   │   ├── scoring.test.ts          # Reference test cases
│   │   │   ├── pdf.ts                   # jsPDF generation
│   │   │   ├── state.tsx                # Context + reducer + localStorage
│   │   │   └── api.ts                   # Calls to /api/start-session etc
│   │   ├── pages/                       # Route components
│   │   │   ├── Landing.tsx
│   │   │   ├── Calculator.tsx
│   │   │   ├── EmailGate.tsx
│   │   │   ├── Selection.tsx
│   │   │   ├── Assessment.tsx           # Wraps measurement + action sections
│   │   │   └── Scorecard.tsx
│   │   ├── styles/
│   │   │   ├── tokens.css
│   │   │   └── global.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── server/                              # Express + serverless functions
│   ├── src/
│   │   ├── routes/
│   │   │   ├── start-session.ts
│   │   │   └── complete-session.ts
│   │   ├── lib/
│   │   │   ├── hubspot.ts               # HubSpot client + retry logic
│   │   │   └── resend.ts                # Email sender
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
├── scripts/
│   └── export_rubric.py                 # Re-runs when Excel content changes
├── docs/
│   ├── NRR_Intelligence_Assessment_PRD_v1.2.docx
│   ├── CLAUDE.md                        # This file
│   ├── CTO_Decisions.md
│   └── Sprint_1_Plan.md
├── .env.example
├── .gitignore
├── README.md
└── package.json                         # npm workspaces root
```

## Git workflow (same rule as the Loremex Website)

- **Default branch**: `main`
- **Working branch**: `staging`
- **Never push to `main` without explicit approval from Laura.**
- **Always run `npm run build` before commit and ensure it passes.**
- **Subagent for file edits and git ops**: Freya (same as the website repo).

## Sprint 1 entry point

Start with epic E1 (Landing + Lead Capture) and E2 (NRR Calculator). See `docs/Sprint_1_Plan.md` for the concrete story breakdown.

Run order for first session:
1. Read this file and `docs/NRR_Intelligence_Assessment_PRD_v1.2.docx`
2. Verify `client/src/content/rubric.json` is present and valid
3. Scaffold the monorepo (if not already) per `README.md`
4. Implement S1.1 (landing page hero + scorecard sample)
5. Implement S1.2 (email capture with consent)
6. STOP — get Laura's review before continuing to S1.3 (HubSpot integration)

## What NOT to do

- Do NOT hard-code questions or descriptors in components. Read from `rubric.json`.
- Do NOT add libraries beyond the stack above without asking Laura.
- Do NOT push to `main`. Always work in `staging` and ask before merging.
- Do NOT add benchmarks, save/resume, AI commentary, or white-label features. These are explicitly Phase 2.
- Do NOT use Puppeteer or server-side PDF generation. Client-side jsPDF only.
- Do NOT skip the math reference tests. The Excel workbook is the math truth.

## Environment variables (`.env.local`)

```
VITE_HUBSPOT_PORTAL_ID=
VITE_HUBSPOT_FORM_ID=
HUBSPOT_API_KEY=                # server-side only
RESEND_API_KEY=                 # server-side only
VITE_POSTHOG_KEY=               # optional, for event tracking
VITE_BASE_URL=http://localhost:5173
```

NEVER commit `.env.local`. The `.env.example` ships sanitized.

## Test before commit

```
npm run lint
npm run typecheck
npm run test           # unit tests for scoring math
npm run build          # MUST pass
```
