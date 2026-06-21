import type { CapKey } from '../lib/state'

export const CAP_ORDER: CapKey[] = ['reporting', 'retention', 'expansion', 'pricing']

// Capability-specific level descriptions. null = fall back to the generic LEVEL_DESCS in CapabilitySummary.
// Index matches level number (0 unused, 1–5 active).
export const CAP_LEVEL_DESCS: Partial<Record<CapKey, (string | null)[]>> = {
  retention: [
    null,
    null,
    null,
    null,
    "The impact each customer is getting — and whether it's still outrunning price — surfaces on its own and drives action before the outcome slips, not dependent on who's watching.",
    null,
  ],
  expansion: [
    null,
    'Expansion is pure push — reps chase whatever they happen to spot, with no read on whether the account is actually ready.',
    "You know expansion needs health, surplus, and headroom, but it still runs on reps pushing their own accounts. No portfolio view of who's ready.",
    'Readiness can be assembled per account, but only by hand — so expansion is still pushed on a quota clock, not pulled by signal.',
    'Readiness and unsold value surface on their own and point to the right accounts — push becomes targeted, driven by signal rather than territory.',
    'Readiness and headroom are sensed continuously, so expansion pulls itself to the accounts already ready — the motion flips from selling to being drawn.',
  ],
  pricing: [
    null,
    'Pricing is a one-time decision — set by seats, cost-plus, or market rate, then frozen. Nothing senses whether it still fits cost or impact.',
    'You know price should track cost and impact, but pricing is still an event — packaging and negotiation, revisited only when a deal comes up.',
    "You can audit where price has drifted from cost-to-serve and delivered impact, but only periodically, by hand — pricing isn't yet a running function.",
    'Price drift surfaces on its own as it opens, so over- and under-priced accounts are visible as the relationship runs — pricing starts operating, not just resetting at renewal.',
    'Pricing runs as a live capability — drift from cost and impact is sensed continuously and captured systematically at every renewal, so price tracks reality instead of being defended once a year.',
  ],
}

export interface V3Scenario {
  text: string
}

export interface V3QuestionContent {
  id: 'q1' | 'q2' | 'q3'
  title: string
  question: string
  scenarios: [V3Scenario, V3Scenario, V3Scenario, V3Scenario, V3Scenario]
}

export interface V3CapabilityContent {
  key: CapKey
  name: string
  estimatedMinutes: number
  intro: {
    foundation: string
    aiNative: string
  }
  questions: [V3QuestionContent, V3QuestionContent, V3QuestionContent]
}

export const V3_ASSESSMENT_CONTENT: V3CapabilityContent[] = [
  {
    key: 'reporting',
    name: 'NRR Reporting',
    estimatedMinutes: 3,
    intro: {
      foundation: "Your NRR is only as good as your ability to trust it, break it apart, and see it now. Most companies treat it as a quarterly finance output — one blended figure, assembled after the close, quietly disputed between teams.",
      aiNative: "NRR stops being a quarterly number you report and becomes a live signal you steer by — current, decomposable to its drivers, and predictive. You see where it's heading and act before it moves, not after the quarter closes.",
    },
    questions: [
      {
        id: 'q1',
        title: 'Confidence Score',
        question: "If the board asked for your NRR right now, how confident are you it's correct — that it would survive an audit, and that two teams pulling it would land on the same number?",
        scenarios: [
          { text: "We'd produce a number, but it's assembled and caveated. Different teams would likely get different figures." },
          { text: "We have a number we report, but we know it papers over definitional gaps and source disagreements." },
          { text: "The number is solid and reconciled, but getting there takes manual assembly each time." },
          { text: "NRR is consistently calculated from agreed definitions and sources — the same number everywhere, on demand." },
          { text: "NRR is continuously computed from a single source of truth — always current, always reconciled, never in dispute." },
        ],
      },
      {
        id: 'q2',
        title: 'Decomposition',
        question: "Can you break NRR into its real drivers — new, expansion, contraction, churn — across product, segment, and cohort? Or is it one blended company-level number?",
        scenarios: [
          { text: "We have a top-line NRR. Breaking it into drivers isn't something we can readily do." },
          { text: "We can split it into the basic components, but cutting by product, segment, or cohort is a heavy lift." },
          { text: "We can decompose it across most dimensions, but only by pulling and assembling it manually." },
          { text: "NRR decomposes on demand — by driver and by any cut — so we can see exactly what's moving the number." },
          { text: "The full decomposition is live and self-updating, so the drivers behind every movement are always visible the moment they shift." },
        ],
      },
      {
        id: 'q3',
        title: 'NRR Signal',
        question: "Is your NRR a current signal you can see and act on today — or a backward-looking figure you assemble after the quarter closes?",
        scenarios: [
          { text: "We see NRR after the quarter closes. It describes what already happened." },
          { text: "We get it monthly or so, but it lags — by the time we act, the picture has moved." },
          { text: "We can pull a current view when we need it, but it's a manual exercise, not a standing signal." },
          { text: "NRR is available live and watched continuously, so we're acting on where it is now, not where it was." },
          { text: "NRR is a continuous, predictive signal — we see where it's heading and act before the number moves, not after." },
        ],
      },
    ],
  },
  {
    key: 'retention',
    name: 'Revenue Retention',
    estimatedMinutes: 3,
    intro: {
      foundation: "Customers stay when impact clearly outweighs price — and the gap keeps widening. Save plays and health scores just protect that truth after the fact.",
      aiNative: "Whether impact still outweighs price used to be a guess, reviewed at renewal. Now it's sensed continuously — impact, value-vs-price, and sentiment — so drift is corrected before the customer feels it.",
    },
    questions: [
      {
        id: 'q1',
        title: 'Time-To-Impact',
        question: "How quickly does your solution deliver a clear outcome — impact the customer can feel — and do you know when that lands, per account?",
        scenarios: [
          { text: "We don't think about it that way. We assume impact builds over time and check in at renewal." },
          { text: 'We have a rough sense of onboarding speed, but "time to impact" isn\'t something we measure.' },
          { text: "We measure time-to-impact, but we see it after the fact — in retrospect, customer by customer." },
          { text: "Time-to-impact is tracked as it happens, and a slow start triggers action before it becomes risk." },
          { text: "Time-to-impact is monitored continuously and optimized — the system flags and corrects a slow ramp before anyone asks." },
        ],
      },
      {
        id: 'q2',
        title: 'Impact-Over-Time',
        question: "Over the life of a customer, does the impact you deliver keep growing — or does it flatten after the first year? And can you see which is happening, per account?",
        scenarios: [
          { text: "We assume mature customers are getting steady impact. We don't track whether it's still growing." },
          { text: "We sense some accounts plateau, but it's anecdotal — usually obvious only once they're at risk." },
          { text: "We can show whether impact is growing or flat per account, but only by pulling and reviewing it." },
          { text: "Compounding (or flattening) impact surfaces on its own, and flat accounts get acted on early." },
          { text: "Impact trajectory is tracked continuously per account; the system intervenes when compounding stalls, before the customer feels it." },
        ],
      },
      {
        id: 'q3',
        title: 'Impact Measurement',
        question: "Can you sense the impact each customer is actually getting, as it happens — or is impact a guess until renewal?",
        scenarios: [
          { text: "We don't really measure impact. We assume it's there if the customer isn't complaining." },
          { text: "We have a sense of which accounts are getting value, but it's anecdotal — not a number we can show." },
          { text: "We can measure impact per account, but only by pulling it together after the fact." },
          { text: "Impact is measured as it happens and surfaces on its own, so we see who's getting value and who isn't." },
          { text: "Impact is sensed continuously per account — we always know, in real time, the impact each customer is actually getting." },
        ],
      },
    ],
  },
  {
    key: 'expansion',
    name: 'Revenue Expansion',
    estimatedMinutes: 3,
    intro: {
      foundation: "Expansion is earned, not sold. It needs three things true at once: the account is healthy, it's already getting more than it pays for, and there's room left to grow. Push without them and you accelerate churn.",
      aiNative: "Expansion used to ride on a rep's read of the room. Now it's sensed where value will outgrow price before the customer asks, surfaced inside their workflow — so it pulls itself from the accounts already ready, instead of being sold.",
    },
    questions: [
      {
        id: 'q1',
        title: 'Expansion Readiness',
        question: "Before you pursue expansion in an account, do you actually know it's healthy — getting value, low-risk, on solid ground — or could you be selling more into an account that's quietly slipping?",
        scenarios: [
          { text: "We pursue expansion where we see opportunity. Whether the account is truly healthy underneath isn't part of the decision." },
          { text: "We have a general feel for which accounts are solid, but it's relationship-based, not something we verify before expanding." },
          { text: "We can check an account's health before expanding, but it's a manual look — and not always done." },
          { text: "Account health gates expansion automatically — we only push where the foundation is genuinely strong, and weak accounts get fixed first." },
          { text: "Expansion readiness is continuously scored from real health signals, so we expand exactly the accounts that are ready and never the ones that aren't." },
        ],
      },
      {
        id: 'q2',
        title: 'Value Surplus',
        question: "Is the customer already getting visibly more than they pay for — a surplus they can feel — so that more of what you do is obviously worth more to them?",
        scenarios: [
          { text: "We don't know if they're in surplus. We assume the value is there if they're not complaining." },
          { text: "We believe most customers come out ahead, but we couldn't show the surplus or know who's actually underwater." },
          { text: "We can establish whether a customer is in surplus, but only by working it out after the fact, account by account." },
          { text: "The surplus (or deficit) is visible per account as it stands, so we know exactly who has room to expand and who doesn't." },
          { text: "Surplus is tracked continuously and the customer sees it too — expansion conversations open from a gap they already feel." },
        ],
      },
      {
        id: 'q3',
        title: 'Room-To-Grow',
        question: "For each customer, do you know specifically what they don't have yet that would deliver them more value — the products, capacity, or use cases they haven't bought — or is expansion just whatever a rep happens to spot?",
        scenarios: [
          { text: "We don't map this. Expansion is whatever opportunity a rep notices in the moment." },
          { text: "Reps know their own accounts' gaps, but there's no clear view across the base of what's unsold and where." },
          { text: "We can work out what each account is missing, but it takes a manual exercise to map it." },
          { text: "What each customer doesn't have yet — and what it's worth to them — is mapped per account and ready to act on." },
          { text: "The unsold value in every account is surfaced continuously, so the next right expansion for each customer is always visible." },
        ],
      },
    ],
  },
  {
    key: 'pricing',
    name: 'Pricing Optimization',
    estimatedMinutes: 3,
    intro: {
      foundation: "Price is right only when it tracks both what it costs you to deliver and the impact the customer gets. Most pricing tracks neither — set once, frozen till renewal, leaking margin or value the whole time.",
      aiNative: "Price used to be set once and frozen till renewal, leaking margin the whole time. Now unit price tracks cost-to-deliver and delivered impact continuously across the customer's life — margin protected as it moves, not recovered after it's gone.",
    },
    questions: [
      {
        id: 'q1',
        title: 'Unit Economics',
        question: "As the cost to deliver your solution changes — compute, infrastructure, the economics of running it — does your pricing adjust to protect unit economics, or is price set independently of what it actually costs you to deliver?",
        scenarios: [
          { text: "Price is set without much reference to delivery cost. If our cost to serve moves, pricing doesn't respond." },
          { text: "We know our delivery costs shift, but pricing only catches up occasionally, well after the fact." },
          { text: "We can analyze cost-to-deliver against price per segment, but it's a periodic review, not built into how we price." },
          { text: "Pricing reflects current cost-to-deliver, so margin is protected as delivery economics move." },
          { text: "Pricing re-optimizes as cost-to-deliver changes — unit economics stay healthy without anyone resetting the model." },
        ],
      },
      {
        id: 'q2',
        title: 'Price-To-Impact',
        question: "As the impact you deliver to a customer grows or shifts, does their price keep pace — or is it tied to seats and tiers and left until renewal?",
        scenarios: [
          { text: "Price is set by seats, tiers, or market rates. It isn't connected to the impact a given customer actually gets, and it holds until the next renewal." },
          { text: "We'd like price to reflect impact, but in practice it tracks packaging and negotiation — and we only revisit it when a deal comes up." },
          { text: "We can see whether price and impact are aligned per customer, but only when we go looking — it's a periodic, manual check." },
          { text: "Price is set against delivered impact and the gap surfaces as it opens, so over- and under-priced customers are visible as the relationship runs." },
          { text: "Price stays aligned to delivered impact as the relationship runs — what a customer pays reflects the impact they actually get, kept current rather than set once." },
        ],
      },
      {
        id: 'q3',
        title: 'Live Repricing',
        question: "Does your pricing sense when it's drifted from cost and impact and correct as the relationship runs — or is it set once and frozen until the next renewal?",
        scenarios: [
          { text: "Price is set at the deal and frozen. Nothing senses whether it's still right; it doesn't move until renewal." },
          { text: "We know price drifts from reality between renewals, but we've no way to see it — we only revisit price when the contract comes up." },
          { text: "We can work out where price has drifted from cost and impact, but only as a manual review — pricing doesn't sense or correct on its own." },
          { text: "Drift surfaces as it opens, so mispriced accounts are visible while the relationship runs — and we capture the correction at renewal." },
          { text: "Pricing senses drift from cost and impact continuously and corrects toward it, captured systematically at renewal — price tracks reality instead of being defended once a year." },
        ],
      },
    ],
  },
]
