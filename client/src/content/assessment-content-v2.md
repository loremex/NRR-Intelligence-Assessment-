# NRR Intelligence Assessment — Question Content (v2)

This is the single source of truth for all four capability blocks:
NRR Reporting, Revenue Retention, Revenue Expansion, Pricing Optimization.

## Framework

- 4 capabilities: NRR Reporting, Revenue Retention, Revenue Expansion, Pricing Optimization
- 3 questions per capability (12 total), each built on a ground-truth necessity for that capability
- Each question presents 5 unlabeled scenarios; user picks one
- Each scenario maps to an L-value 1–5
- That L-value IS the score for that capability × question cell
- All four capabilities carry EQUAL weight

No People/Process/Tech/Data dimensions. No six-lever framework. They are removed entirely.
The previous NRR Reporting question set is REPLACED by the three questions below.

## The maturity ladder (applies to every question)

- L1 — Blind. The real driver isn't measured. Runs on proxies, judgment, instinct.
- L2 — Named, not measured. The driver is recognized but lives in heads; no reliable number.
- L3 — Measured, not live. The driver is quantified but pulled, interpreted, and acted on after the fact.
- L4 — Surfaced and steering. The signal surfaces on its own and drives decisions, fast and consistent.
- L5 — Continuous and self-correcting. Sensed, predicted, and acted on continuously, no lag.

## Scoring

- Cell score = L-value of scenario picked (scenarioIndex + 1, so 1–5)
- Capability score = average of the 3 question L-values for that capability (1.00–5.00)
- Overall maturity = average of all 12 cells across the 4 capabilities (equal weight)
- Stage mapping:
  - 1.0–1.49 Reactive
  - 1.5–2.49 Diagnostic
  - 2.5–3.49 Operational
  - 3.5–4.49 Optimized
  - 4.5–5.0 Intelligent

---

# CAPABILITY 1: NRR REPORTING
Ground truth: a number that's true, decomposable, and live.

## Intro (shown before the questions)
**Foundation.** Your NRR is only as good as your ability to trust it, break it apart, and see it now. Most companies treat it as a quarterly finance output — one blended figure, assembled after the close, quietly disputed between teams.

**What AI-native changes.** NRR stops being a number you produce once a quarter and becomes one you operate on continuously — current, decomposable to its drivers, and the same everywhere. You're no longer reporting the past; you're steering on the present.

## Q1 — Truth and confidence
**Question:** If the board asked for your NRR right now, how confident are you it's correct — that it would survive an audit, and that two teams pulling it would land on the same number?

- L1 — We'd produce a number, but it's assembled and caveated. Different teams would likely get different figures.
- L2 — We have a number we report, but we know it papers over definitional gaps and source disagreements.
- L3 — The number is solid and reconciled, but getting there takes manual assembly each time.
- L4 — NRR is consistently calculated from agreed definitions and sources — the same number everywhere, on demand.
- L5 — NRR is continuously computed from a single source of truth — always current, always reconciled, never in dispute.

## Q2 — Decomposition
**Question:** Can you break NRR into its real drivers — new, expansion, contraction, churn — across product, segment, and cohort? Or is it one blended company-level number?

- L1 — We have a top-line NRR. Breaking it into drivers isn't something we can readily do.
- L2 — We can split it into the basic components, but cutting by product, segment, or cohort is a heavy lift.
- L3 — We can decompose it across most dimensions, but only by pulling and assembling it manually.
- L4 — NRR decomposes on demand — by driver and by any cut — so we can see exactly what's moving the number.
- L5 — The full decomposition is live and self-updating, so the drivers behind every movement are always visible the moment they shift.

## Q3 — Liveness
**Question:** Is your NRR a current signal you can see and act on today — or a backward-looking figure you assemble after the quarter closes?

- L1 — We see NRR after the quarter closes. It describes what already happened.
- L2 — We get it monthly or so, but it lags — by the time we act, the picture has moved.
- L3 — We can pull a current view when we need it, but it's a manual exercise, not a standing signal.
- L4 — NRR is available live and watched continuously, so we're acting on where it is now, not where it was.
- L5 — NRR is a continuous, predictive signal — we see where it's heading and act before the number moves, not after.

---

# CAPABILITY 2: REVENUE RETENTION
Ground truth: impact greater than price, and the gap widening over time.

## Intro (shown before the questions)
**Foundation.** Customers stay when impact clearly outweighs price — and the gap keeps widening. Save plays and health scores just protect that truth after the fact.

**What AI-native changes.** This used to be invisible — inferred from usage, reviewed quarterly. Now time-to-impact, compounding, and value-vs-price can be sensed per account, continuously, and corrected before drift shows. Retention stops being a save motion and becomes a condition you hold automatically.

## Q1 — Time to impact
**Question:** How quickly does a new customer reach the point where what they're getting clearly outweighs what they're paying — and do you actually know that moment per customer?

- L1 — We don't think about it that way. We assume value builds over time and check in at renewal.
- L2 — We have a rough sense of onboarding speed, but "time to impact" isn't something we measure.
- L3 — We measure time-to-value, but we see it after the fact — in retrospect, customer by customer.
- L4 — Time-to-impact is tracked as it happens, and a slow start triggers action before it becomes risk.
- L5 — Time-to-impact is monitored continuously and optimized — the system flags and corrects a slow ramp before anyone asks.

## Q2 — Impact compounding
**Question:** Over the life of a customer, does the impact you deliver keep growing — or does it flatten after the first year? And can you see which is happening, per account?

- L1 — We assume mature customers are getting steady value. We don't track whether impact is still growing.
- L2 — We sense some accounts plateau, but it's anecdotal — usually obvious only once they're at risk.
- L3 — We can show whether impact is growing or flat per account, but only by pulling and reviewing it.
- L4 — Compounding (or flattening) impact surfaces on its own, and flat accounts get acted on early.
- L5 — Impact trajectory is tracked continuously per account; the system intervenes when compounding stalls, before the customer feels it.

## Q3 — Price-to-value over time
**Question:** As a customer matures and you raise price, does the value they get grow faster than the price — so the deal feels better to them every year, not worse?

- L1 — We raise price at renewal where we can. Whether value outpaced it isn't something we quantify.
- L2 — We believe value grows faster than price, but we can't show it — it's a story, not a number.
- L3 — We can reconstruct the value-to-price ratio per account, but only retrospectively at renewal time.
- L4 — The value-to-price ratio is visible as it moves, so we know which accounts are getting a worse deal before they push back.
- L5 — The ratio is monitored continuously and kept improving by design — price and delivered value stay correctly coupled without manual review.

---

# CAPABILITY 3: REVENUE EXPANSION
Ground truth: a healthy account, sitting on a value surplus, with somewhere to grow.

## Intro (shown before the questions)
**Foundation.** Expansion is earned, not sold. It needs three things true at once: the account is healthy, it's already getting more than it pays for, and there's room left to grow. Push without them and you accelerate churn.

**What AI-native changes.** Health used to be a gut call, surplus a story, whitespace whatever a rep spotted — so expansion got pushed on a quota clock. Now readiness is visible across the whole base, and expansion surfaces itself instead of being chased.

## Q4 — Expansion readiness (retention health first)
**Question:** Before you pursue expansion in an account, do you actually know it's healthy — getting value, low-risk, on solid ground — or could you be selling more into an account that's quietly slipping?

- L1 — We pursue expansion where we see opportunity. Whether the account is truly healthy underneath isn't part of the decision.
- L2 — We have a general feel for which accounts are solid, but it's relationship-based, not something we verify before expanding.
- L3 — We can check an account's health before expanding, but it's a manual look — and not always done.
- L4 — Account health gates expansion automatically — we only push where the foundation is genuinely strong, and weak accounts get fixed first.
- L5 — Expansion readiness is continuously scored from real health signals, so we expand exactly the accounts that are ready and never the ones that aren't.

## Q5 — Value surplus
**Question:** Is the customer already getting visibly more than they pay for — a surplus they can feel — so that more of what you do is obviously worth more to them?

- L1 — We don't know if they're in surplus. We assume the value is there if they're not complaining.
- L2 — We believe most customers come out ahead, but we couldn't show the surplus or know who's actually underwater.
- L3 — We can establish whether a customer is in surplus, but only by working it out after the fact, account by account.
- L4 — The surplus (or deficit) is visible per account as it stands, so we know exactly who has room to expand and who doesn't.
- L5 — Surplus is tracked continuously and the customer sees it too — expansion conversations open from a gap they already feel.

## Q6 — Room to grow
**Question:** For each customer, do you know specifically what they don't have yet that would deliver them more value — the products, capacity, or use cases they haven't bought — or is expansion just whatever a rep happens to spot?

- L1 — We don't map this. Expansion is whatever opportunity a rep notices in the moment.
- L2 — Reps know their own accounts' gaps, but there's no clear view across the base of what's unsold and where.
- L3 — We can work out what each account is missing, but it takes a manual exercise to map it.
- L4 — What each customer doesn't have yet — and what it's worth to them — is mapped per account and ready to act on.
- L5 — The unsold value in every account is surfaced continuously, so the next right expansion for each customer is always visible.

---

# CAPABILITY 4: PRICING OPTIMIZATION
Ground truth: price tracks both cost-to-deliver (margin) and impact delivered (value), kept aligned continuously, and locked in at renewal.

## Intro (shown before the questions)
**Foundation.** Price is right only when it tracks both what it costs you to deliver and the impact the customer gets. Most pricing tracks neither — set once, frozen till renewal, leaking margin or value the whole time.

**What AI-native changes.** Cost-to-deliver now moves underneath you, and delivered impact can finally be measured live. So both gaps can be caught as they open. Pricing stops being a number you defend and becomes an engine that re-optimizes as cost and value move.

## Q7 — Cost-to-deliver responsiveness
**Question:** As the cost to deliver your solution changes — compute, infrastructure, the economics of running it — does your pricing adjust to protect unit economics, or is price set independently of what it actually costs you to deliver?

- L1 — Price is set without much reference to delivery cost. If our cost to serve moves, pricing doesn't respond.
- L2 — We know our delivery costs shift, but pricing only catches up occasionally, well after the fact.
- L3 — We can analyze cost-to-deliver against price per segment, but it's a periodic review, not built into how we price.
- L4 — Pricing reflects current cost-to-deliver, so margin is protected as delivery economics move.
- L5 — The pricing engine re-optimizes automatically as cost-to-deliver changes — unit economics stay healthy without anyone resetting the model.

## Q8 — Price-to-impact correlation
**Question:** Is what a customer pays tied to the impact they receive and kept aligned as that impact shifts — or is it tied to seats, cost-plus, or whatever the market will bear, and left until renewal?

- L1 — Price is set by seats, tiers, or market rates. It isn't connected to the impact a given customer actually gets, and it holds until the next renewal.
- L2 — We'd like price to reflect value, but in practice it tracks packaging and negotiation — and we only revisit it when a deal comes up.
- L3 — We can see whether price and impact are aligned per customer, but only when we go looking — it's a periodic, manual check.
- L4 — Price is set against delivered impact and the gap surfaces as it opens, so over- and under-priced customers are visible as the relationship runs.
- L5 — Unit price is mechanically coupled to a unit of impact and stays correlated continuously — price reflects what the customer actually gets, by design.

## Q9 — Renewal lock-in
**Question:** At renewal, do you reset price to match the impact you're now delivering — capturing the value gap that's opened up — or does the old price mostly roll forward?

- L1 — Renewals roll forward at the prior price, maybe a standard uplift. The value gap that's opened isn't captured.
- L2 — We push for increases where we have leverage, but it's negotiation, not a reset to current delivered value.
- L3 — We can quantify the value gap at renewal, but acting on it depends on the deal and the rep.
- L4 — Renewal price is reset against current delivered impact as a matter of course, so the gap gets captured each cycle.
- L5 — Repricing to current impact is systematic and locked in at every renewal — the value you've built is captured automatically, not left on the table.
