# CTO Decisions — NRR Intelligence Assessment

Resolved decisions from PRD §14. These are NOT open. If reversed later, the cost column tells you what to expect.

| # | Decision | Resolution | Rationale | Reversal cost |
|---|---|---|---|---|
| 1 | Email gate placement | **At the start, before any assessment access** | Maximum lead capture. Top-of-funnel intent is to convert every visitor to a known lead before they explore the product. Reinforces the value-exchange framing: "Give me your email, get a structured diagnostic + PDF + insight tailored to you." | Low — moving the gate later is a single-page reroute. Decision tracked in §6.1 of PRD. |
| 2 | Routing architecture | **Hybrid: SSG landing + SPA assessment** | Landing page needs SEO (organic traffic, Rogue Penguin links, PE network referrals) and fast first paint — favors SSG. Assessment needs instant transitions, persistent localStorage state, and no full-page reloads — favors SPA. Vite supports both modes in a single build. | Medium — full SSR would require a Next.js migration. SSG-only would lose SPA state behavior. |
| 3 | PDF generation | **Client-side jsPDF only** | Consistent with existing NRR Uplift Calculator. No server cost, no PDF service to manage, instant generation. Accept the tradeoff that formatting is less rich than Puppeteer; design the PDF layout for what jsPDF can do well. | Low-Medium — switching to Puppeteer is a new server route + Chrome dependency on Vercel functions. Doable but adds infrastructure. |
| 4 | Forced NRR Reporting before action sections | **No gate — selection-driven** | Capability Selection (§6.2b) gives the user control. NRR Reporting is recommended-default with a soft note if unchecked, but never forced. Forcing it would conflict with the selection model and add friction for users who specifically want Pricing or Retention only. | Low — adding a forced gate is a single conditional in the assessment router. |
| 5 | NRR Calculator optional | **Yes, optional with confirmation modal** | Some leaders won't have the 4 inputs at hand. Letting them skip with a confirmation keeps them in the flow. Scorecard handles "Not calculated" gracefully. | Low — making it required is a one-line change to remove the skip CTA. |
| 6 | Localization | **English only at MVP** | No validated demand. Adds 2-3 weeks of translation + i18n infrastructure. Phase 2 candidate after launch traction. | High if added later as a retrofit; Medium if planned from start. Defer until demand surfaces. |

## Decision authority

- **Laura (CEO)**: All product, scope, content, and brand decisions.
- **CTO**: All architecture and infrastructure decisions — has standing override on any tech decision in this doc if engineering reality demands it. Notify Laura before reversing.

## Open items deferred to first sprint

These do not block start of build but should be answered in Sprint 1:

| Topic | Owner | Target |
|---|---|---|
| Exact HubSpot custom property names (case, prefix convention) | CTO + RevOps | Story S6.1 |
| Posthog vs alternate analytics tool decision | Laura | Sprint 1 close |
| Whether Posthog event volume warrants the paid tier | CTO | After Sprint 1 |
| Email design (transactional results email) — Resend template structure | Laura | Story S5.3 |
| Privacy policy URL / GDPR consent wording | Laura + Legal | Before launch |
| Domain choice (assessment.loremex.ai vs loremex.ai/assessment) | Laura + CTO | Story S8.5 |

## Document control

- v1 — June 2026. Initial decision log.
