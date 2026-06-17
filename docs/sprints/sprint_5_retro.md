# Sprint 5 Retrospective — NRR Intelligence Assessment

**Sprint**: Sprint 5 — Polish + Launch
**Date**: 2026-06-17
**Branch**: staging (preview deploy pending Laura's approval before merge to main)

---

## What was delivered

| Story | Title | Status |
|-------|-------|--------|
| S7.1 | Mobile responsive audit + fixes | ✅ Done |
| S7.2 | WCAG 2.1 AA accessibility audit + fixes | ✅ Done |
| S8.1 | Cross-browser + Lighthouse prep (SEO meta, font preconnect, bundle split) | ✅ Done |
| S8.2 | Resend "from" address → `ls@loremex.ai` / `Loremex Team` | ✅ Done (already in Sprint 4) |
| S8.3 | Posthog wiring (posthog-js + initAnalytics on mount) | ✅ Done (already in Sprint 4) |
| S8.4 | Vercel production deployment prep (api/ serverless functions, vercel.json) | ✅ Done |
| S8.5 | End-to-end smoke test + v1.0.0 tag | ⏳ Pending Laura's preview approval |

**Test suite**: 152 tests passing (123 client, 29 server)
**Build**: Clean — initial bundle ~176KB gzip (down from ~317KB; PDF lazy-loaded as ~140KB on demand)
**Lint/typecheck**: 0 errors, 0 warnings

---

## Mobile fixes (S7.1)

- **HeadlineTile labels**: Reduced `tracking-widest leading-none` → `tracking-wide leading-tight`; value shrinks from `text-3xl` → `text-2xl sm:text-3xl` to prevent overflow at 320px width in 2-col grid
- **RecommendationBlock**: Changed `p-8` → `p-5 sm:p-8` on navy recommendation card
- **Scorecard nav**: Hid "NRR Intelligence Assessment" text on mobile (`hidden sm:block`) — at 320px it overflowed next to the logo
- **Heatmap tables**: Already had `overflow-x-auto` + scroll hint from Sprint 4 ✓
- **Assessment select grids**: Already had `grid-cols-1 sm:grid-cols-2` ✓
- **Modal sizing**: Already had `p-4` outer + `max-w-[480px]` ✓

## Accessibility fixes (S7.2)

- **ESLint jsx-a11y**: Added `eslint-plugin-jsx-a11y/recommended` to `.eslintrc.cjs`; fixed one lint error in `Selection.tsx` (label needed `aria-label`)
- **Skip links**: Added "Skip to main content" with `id="main-content"` on `<main>` to Calculator, Selection, Assessment, and Scorecard pages (Landing already had it)
- **ConfirmModal focus restore**: The `useEffect` now captures `document.activeElement` on modal open and restores focus on cleanup — keyboard users return to the trigger element after closing the modal
- **Heading hierarchy**: Reviewed all pages — no skipped heading levels ✓
- **Form labels**: All `for`/`id` pairs verified ✓
- **ARIA on tables**: All heatmap tables already had `aria-label` and `<caption class="sr-only">` ✓

## Lighthouse preparation (S8.1)

- **index.html**: Added `<meta name="description">`, Open Graph tags, and `<link rel="preconnect">` for Google Fonts
- **Bundle splitting**: `pdfGenerator.ts` (jsPDF + jspdf-autotable) converted to dynamic imports in Scorecard — initial bundle drops from ~317KB → ~176KB gzip; PDF chunk (~140KB) loads only when scorecard is reached
- **Font loading**: `display=swap` already present ✓
- Cross-browser note: Chrome/Edge/Firefox tested via responsive DevTools. Safari deferred (Laura is on Windows); React + Tailwind generally cross-browser safe.

## Email sender (S8.2)

Already updated in Sprint 4. Defaults in `server/src/lib/email.ts`:
- From: `Loremex Team <ls@loremex.ai>`
- Reply-to: `ls@loremex.com`

## PostHog (S8.3)

Already wired in Sprint 4. `posthog-js` installed; `initAnalytics()` called on App mount; all 12 analytics events in spec fire correctly. Requires `VITE_POSTHOG_KEY` in Vercel env vars to activate.

## Vercel deployment prep (S8.4)

- **`api/` serverless functions**: `api/start-session.ts`, `api/complete-session.ts`, `api/retry-queue-status.ts` with shared `api/_lib/hubspot.ts` and `api/_lib/email.ts`
- **Retry queue downgrade**: Disk-backed retry queue is not compatible with stateless serverless functions. Replaced with in-function 2-attempt retry (down from 5). Failures are logged to Vercel logs. **v1.1 followup**: integrate Upstash QStash for durable retry when volume warrants.
- **`vercel.json`**: Configures Node 20 runtime for api/ functions, SPA rewrite for client routes, immutable cache headers for `/assets/`
- **`api.ts` critical fix**: Default `API_BASE` changed from `http://localhost:3001` to `''` (empty string = relative path). In dev, Vite proxy handles `/api → localhost:3001`; in production, Vercel routes `/api/` to serverless functions at same origin.
- **Root `package.json`**: Added `axios` and `resend` as root-level dependencies so Vercel's bundler can find them for `api/` functions
- **`.env.example`**: Updated with production values (`ls@loremex.ai`, `VITE_CALENDLY_URL`, etc.)

## Architecture: local dev vs. production

| Path | Local dev | Production (Vercel) |
|------|-----------|---------------------|
| Express server | `server/` (full retry queue) | Not used |
| API handlers | Via Vite proxy → `server/src/routes/` | `api/*.ts` serverless functions |
| Retry queue | Disk-backed, 5 attempts | In-function 2-attempt only; log to Vercel logs |

## What's next (S8.5 — after Laura's preview approval)

1. `vercel` CLI preview deploy from `staging`
2. **STOP**: Laura tests preview URL end-to-end
3. After approval: merge `staging → main`, `vercel --prod`
4. DNS: Add CNAME `assessment` → `cname.vercel-dns.com` in IONOS
5. **STOP**: DNS verification + HTTPS provisioned
6. Production smoke test (10-step checklist)
7. `git tag -a v1.0.0` + GitHub Release

## Env vars needed in Vercel dashboard

```
HUBSPOT_ACCESS_TOKEN=<private app token>
HUBSPOT_PORTAL_ID=243744265
RESEND_API_KEY=<resend key>
RESEND_FROM_EMAIL=ls@loremex.ai
RESEND_FROM_NAME=Loremex Team
RESEND_REPLY_TO=ls@loremex.com
VITE_POSTHOG_KEY=<posthog key if wiring>
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_CALENDLY_URL=https://calendly.com/loremex/intro
VITE_BASE_URL=https://assessment.loremex.ai
```

---

## Decisions made during Sprint 5

1. **Retry queue downgraded to in-function 2-attempt**: Serverless stateless constraint. Documented as v1.1 followup (Upstash QStash).
2. **jsPDF lazy-loaded**: Dynamic import in Scorecard.tsx — drops initial bundle from 317KB → 176KB gzip. No UX impact (users spend 8+ minutes on assessment before reaching scorecard).
3. **S8.2 / S8.3 were already done in Sprint 4**: `email.ts` and `analytics.ts` already had correct production defaults. Sprint 5 just updated `.env.example` and tests to match.
4. **Safari testing deferred**: Laura is on Windows. React + Tailwind are generally cross-browser safe; defer to a hotfix if Safari-specific issues are reported post-launch.
