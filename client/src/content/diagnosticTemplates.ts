import type { DiagnosticAnswers, DiagnosticPriority } from '../lib/state'

// ─── Block definitions ────────────────────────────────────────────────────────

export type DiagnosticBlock = 'reporting' | 'retention' | 'expansion' | 'pricing'

export const BLOCK_LABELS: Record<DiagnosticBlock, string> = {
  reporting: 'NRR REPORTING',
  retention: 'RETENTION',
  expansion: 'EXPANSION',
  pricing: 'PRICING',
}

// Tiebreaker priority order (lower index wins on ties)
export const BLOCK_PRIORITY: DiagnosticBlock[] = ['reporting', 'retention', 'expansion', 'pricing']

// ─── Question definitions ─────────────────────────────────────────────────────

export interface DiagnosticOption {
  score: 1 | 2 | 3 | 4
  text: string
}

export interface DiagnosticQuestion {
  block: DiagnosticBlock
  question: string
  contextLine: string
  options: [DiagnosticOption, DiagnosticOption, DiagnosticOption, DiagnosticOption]
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    block: 'reporting',
    question: 'How reliable is your NRR number — could CS, Finance, and RevOps each produce the same figure right now?',
    contextLine: 'If three teams would give three different answers, you can\'t trust the number enough to act on it.',
    options: [
      { score: 1, text: 'No — we\'d get different numbers from each team. There\'s no shared definition or single source of truth.' },
      { score: 2, text: 'Roughly — we have an agreed number, but it takes several days to produce and isn\'t always reconciled.' },
      { score: 3, text: 'Yes — one agreed definition, calculated consistently, though it lags 2–4 weeks and distribution is limited.' },
      { score: 4, text: 'Yes — NRR is automated, reconciled, and distributed to leadership at least weekly with clear variance commentary.' },
    ],
  },
  {
    block: 'retention',
    question: 'How does your team identify customers at risk of churning before the renewal conversation?',
    contextLine: 'If you\'re finding out about churn risk in the renewal meeting, you\'re already too late to save most of those accounts.',
    options: [
      { score: 1, text: 'We don\'t — we find out when a customer tells us they\'re cancelling or stops responding at renewal.' },
      { score: 2, text: 'CS has gut-feel flags and relationship signals, but there\'s no structured system or shared at-risk list.' },
      { score: 3, text: 'We have a health score and track usage/engagement, but it\'s manually updated and sometimes stale by the time CS acts.' },
      { score: 4, text: 'Automated health score feeds a tiered at-risk queue; CS runs a weekly review and has a defined save playbook per tier.' },
    ],
  },
  {
    block: 'expansion',
    question: 'How does your team identify and convert expansion opportunities within existing accounts?',
    contextLine: 'Most expansion revenue goes uncaptured not from bad relationships, but because nobody is systematically watching for the trigger.',
    options: [
      { score: 1, text: 'We don\'t — expansion happens when customers raise their hand or a CS rep mentions it in a quarterly check-in.' },
      { score: 2, text: 'CS flags expansion ad hoc, but there\'s no formal pipeline, trigger criteria, or handoff process to Sales.' },
      { score: 3, text: 'We have expansion criteria and CS creates opportunities, but follow-through is inconsistent and pipeline visibility is poor.' },
      { score: 4, text: 'Automated triggers (usage, seats, milestones) feed a tracked expansion pipeline with defined CS-to-Sales handoffs and quota accountability.' },
    ],
  },
  {
    block: 'pricing',
    question: 'When did your team last revisit your pricing — and was it driven by data or by competitive pressure?',
    contextLine: 'Companies that haven\'t reviewed pricing in 12+ months are typically leaving 5–15% of NRR on the table through under-pricing or uncontrolled discounting.',
    options: [
      { score: 1, text: 'We haven\'t changed pricing in 2+ years — it only comes up when we lose a deal or a customer pushes back at renewal.' },
      { score: 2, text: 'We\'ve adjusted pricing, but it was driven by competitive pressure or a bad quarter rather than systematic analysis.' },
      { score: 3, text: 'We revisit pricing annually, have a process for value-based increases, and have basic discounting controls — but testing is minimal.' },
      { score: 4, text: 'We have an active pricing process: regular willingness-to-pay research, indexed annual increases, and hard discounting approval gates.' },
    ],
  },
]

// ─── Q5 Priority options ──────────────────────────────────────────────────────

export interface PriorityOption {
  value: DiagnosticPriority
  text: string
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'retention',   text: 'Stop the churn — protect existing revenue first' },
  { value: 'expansion',   text: 'Unlock expansion — we\'re leaving money on the table with existing customers' },
  { value: 'pricing',     text: 'Fix pricing — we\'re under-monetizing and losing margin' },
  { value: 'reporting',   text: 'Build the foundation — we need reliable NRR reporting before anything else' },
]

// ─── Maturity scoring ─────────────────────────────────────────────────────────

export type MaturityStage = 'Reactive' | 'Diagnostic' | 'Operational' | 'Optimized'

export const MATURITY_LABELS: Record<1 | 2 | 3 | 4, MaturityStage> = {
  1: 'Reactive',
  2: 'Diagnostic',
  3: 'Operational',
  4: 'Optimized',
}

export const MATURITY_STAGE_DESCRIPTIONS: Record<MaturityStage, string> = {
  Reactive:    'Your NRR practice is largely informal — things happen reactively rather than by design, and visibility across the team is low.',
  Diagnostic:  'You have structure in place but it\'s inconsistent — you can see problems but aren\'t yet systematically preventing them.',
  Operational: 'Your team has solid processes across most areas — the focus now is making them more predictive and less dependent on manual effort.',
  Optimized:   'Your NRR practice is mature and data-driven — the opportunity is compounding the edges and staying ahead of the market.',
}

export function getMaturityStageFromAvg(avg: number): MaturityStage {
  if (avg <= 1.75) return 'Reactive'
  if (avg <= 2.5)  return 'Diagnostic'
  if (avg <= 3.25) return 'Operational'
  return 'Optimized'
}

export function getMaturityLabelFromScore(score: 1 | 2 | 3 | 4): MaturityStage {
  return MATURITY_LABELS[score]
}

export const MATURITY_COLORS: Record<1 | 2 | 3 | 4, { bg: string; text: string; bar: string }> = {
  1: { bg: 'bg-red-100',    text: 'text-red-700',    bar: 'bg-red-400' },
  2: { bg: 'bg-amber-100',  text: 'text-amber-700',  bar: 'bg-amber-400' },
  3: { bg: 'bg-green-100',  text: 'text-green-700',  bar: 'bg-green-400' },
  4: { bg: 'bg-emerald-100',text: 'text-emerald-700',bar: 'bg-emerald-500' },
}

// ─── Score computation ────────────────────────────────────────────────────────

export interface DiagnosticScores {
  blockScores: Record<DiagnosticBlock, 1 | 2 | 3 | 4>
  weakestBlock: DiagnosticBlock
  strongestBlock: DiagnosticBlock
  overallAvg: number
  maturityStage: MaturityStage
}

export function computeDiagnosticScores(answers: DiagnosticAnswers): DiagnosticScores | null {
  const q1 = answers.q1_reporting.choice
  const q2 = answers.q2_retention.choice
  const q3 = answers.q3_expansion.choice
  const q4 = answers.q4_pricing.choice

  if (!q1 || !q2 || !q3 || !q4) return null

  const blockScores: Record<DiagnosticBlock, 1 | 2 | 3 | 4> = {
    reporting: q1,
    retention: q2,
    expansion: q3,
    pricing:   q4,
  }

  const overallAvg = (q1 + q2 + q3 + q4) / 4
  const maturityStage = getMaturityStageFromAvg(overallAvg)

  // Weakest: lowest score; ties broken by BLOCK_PRIORITY order
  const weakestBlock = BLOCK_PRIORITY.reduce((weakest, block) => {
    const ws = blockScores[weakest]
    const bs = blockScores[block]
    if (bs < ws) return block
    if (bs === ws && BLOCK_PRIORITY.indexOf(block) < BLOCK_PRIORITY.indexOf(weakest)) return block
    return weakest
  })

  // Strongest: highest score; ties broken by reverse BLOCK_PRIORITY (pricing first in reverse)
  const strongestBlock = BLOCK_PRIORITY.reduce((strongest, block) => {
    const ss = blockScores[strongest]
    const bs = blockScores[block]
    if (bs > ss) return block
    return strongest
  })

  return { blockScores, weakestBlock, strongestBlock, overallAvg, maturityStage }
}

// ─── Template definitions ─────────────────────────────────────────────────────

export interface DiagnosticTemplate {
  description: string
  recommendations: [string, string, string]
}

// Key: `${weakestBlock}_${q5Priority}`
const TEMPLATES: Record<string, DiagnosticTemplate> = {

  // ── REPORTING as weakest ─────────────────────────────────────────────────────

  'reporting_reporting': {
    description: 'You\'ve named reporting as both your biggest gap and your top priority — that alignment puts you in a strong position to move fast. Lock in a single source-of-truth NRR number first; everything else you want to fix gets easier once the number is trusted.',
    recommendations: [
      'Pick one NRR definition — right now — and have Finance, CS, and RevOps sign off on it in writing. Put it in a shared doc. No more negotiating the number in meetings.',
      'Automate the NRR pull from your billing system into a dashboard that refreshes at least weekly. If the number takes days to produce, no one checks it.',
      'Put NRR on the agenda of every leadership meeting for 90 days straight. The discipline of reviewing it weekly will surface every assumption you\'ve been hiding.',
    ],
  },

  'reporting_retention': {
    description: 'You want to fix churn — good instinct — but your reporting gap means you can\'t reliably tell which customers are at risk or why they\'re actually leaving. Any retention program you run without clean NRR data is targeting guesses, not signals.',
    recommendations: [
      'Before building retention programs, reconcile your churn definition: are logo churn, revenue churn, and contraction all tracked consistently in the same report?',
      'Stand up a weekly NRR snapshot — even a spreadsheet works as a bridge — so CS knows each week who moved, not just at quarter-end.',
      'Once you have reliable data, identify your three highest-churn cohorts (by segment, ACV, or tenure). That\'s where your first retention program should point.',
    ],
  },

  'reporting_expansion': {
    description: 'Expansion is the right growth instinct, but without reliable NRR reporting you can\'t tell whether expansion is netting out against contraction and churn. You may be growing the top line while the base quietly erodes.',
    recommendations: [
      'Split your NRR report into its four components — expansion, contraction, churn, and starting base — so you can see whether expansion is genuinely additive or just masking losses.',
      'Separate expansion MRR from new logo MRR in your CRM so you can accurately attribute growth to existing customers instead of conflating the two.',
      'Set a 90-day target to have NRR reported consistently and distributed to CS and Sales before investing in any expansion program.',
    ],
  },

  'reporting_pricing': {
    description: 'Pricing changes without clean NRR reporting are hard to evaluate — you won\'t know whether a price increase drove churn or whether contraction was already happening for other reasons. Measurement is the prerequisite for any safe pricing experiment.',
    recommendations: [
      'Tag price increases and discounts in your CRM so you can connect pricing events to expansion and churn outcomes in the NRR report.',
      'Build a basic renewal-rate-by-tier view before touching pricing: which tier retains best, which churns most? That\'s your pricing starting point.',
      'Once you have 90 days of clean tagged data, your first pricing decision will be grounded in evidence instead of instinct.',
    ],
  },

  // ── RETENTION as weakest ─────────────────────────────────────────────────────

  'retention_reporting': {
    description: 'Reporting is a reasonable foundation goal, but your biggest gap is retention — real revenue is walking out the door right now. A reporting project can run in parallel, but don\'t let it delay the early-warning work that keeps customers from churning.',
    recommendations: [
      'Build a tiered at-risk customer list this week using signals you already have: lowest product usage, lowest NPS, most support tickets. That\'s your starting point before any tooling.',
      'Define what "at-risk" means at your company: pick two or three signals that best predict churn 60 days out, and get CS aligned on them in a 30-minute meeting.',
      'Assign an explicit save owner to your top 10 at-risk accounts this quarter. Don\'t wait for a health score system — manual tracking gets the first cohort done.',
    ],
  },

  'retention_retention': {
    description: 'You\'ve correctly identified retention as both your gap and your priority. Most companies at this stage lose customers they could have saved if they\'d seen the signal earlier — the fix is building the early-warning system that makes at-risk accounts visible before the renewal conversation.',
    recommendations: [
      'Define a health score using three signals you already have — even last login date, support ticket volume, and NPS is enough to start. Ship it before you overthink it.',
      'Run a weekly at-risk review with CS: which accounts are in the red, who owns them, and what\'s the 30-day action? This meeting alone will surface things your health score misses.',
      'Analyze your last 10 churned accounts and find the common pattern in the 90 days before they left. That pattern is your first retention playbook.',
    ],
  },

  'retention_expansion': {
    description: 'Expansion is appealing because it\'s additive, but if retention is your weak point, every expansion dollar you win gets partially offset by the churn on the other side of the ledger. Stabilizing the base first gives your expansion motion something to compound on.',
    recommendations: [
      'Before scaling expansion, identify your highest-churn customer segments — those same segments will drag down your expansion NRR math the fastest.',
      'Make it a rule: CS earns expansion quota credit only on accounts with a health score above a threshold. This aligns retention and expansion incentives in one move.',
      'Set a concrete target: reduce gross revenue churn by 2pp before end of quarter. That 2pp flows through to NRR faster than most expansion campaigns.',
    ],
  },

  'retention_pricing': {
    description: 'Pricing improvements are real, but if retention is weak, price increases will accelerate churn in your most fragile accounts. Fix retention before you test price — customers who aren\'t seeing value won\'t pay more for it.',
    recommendations: [
      'Before any pricing change, segment your book by health score quartile. Customers in the bottom quartile are not pricing candidates — they\'re churn risks.',
      'Run a price-increase pilot only on your healthiest cohort: high NPS, high usage, multi-year tenure. Protect vulnerable accounts from pricing pressure while you stabilize them.',
      'Add a required "reason for churn" field to every cancellation record and tag pricing mentions separately from value/fit/competitive. This tells you whether pricing is driving churn or being used as an excuse.',
    ],
  },

  // ── EXPANSION as weakest ─────────────────────────────────────────────────────

  'expansion_reporting': {
    description: 'Better reporting is a solid foundation goal, but your biggest gap is expansion — you\'re likely sitting on customer growth that nobody is systematically capturing. A reporting project can run in parallel, but expansion gets you results faster.',
    recommendations: [
      'Build an expansion pipeline stage in your CRM today — even a single "expansion opportunity" stage creates visibility and accountability where there currently is none.',
      'Define your three expansion triggers: events that reliably predict a customer is ready to buy more (hitting a usage cap, adding a team, reaching a milestone). Have CS flag them when they occur.',
      'Track expansion revenue by CS rep. Just making it visible by rep tends to double the number of expansion conversations that actually get started.',
    ],
  },

  'expansion_retention': {
    description: 'Retention is where your attention is, but expansion is where you\'re losing NRR potential. Strong retention without expansion means your NRR ceiling is 100% — you\'re treading water, not growing.',
    recommendations: [
      'Add an expansion check to your QBR template: is this account at a milestone where expansion makes sense? If yes, has CS started a conversation? Embed it into the existing retention motion.',
      'Identify your top 20 accounts by ARR and map each one\'s expansion potential against their current package. That list is your expansion pipeline seed — start there this quarter.',
      'Set an expansion NRR target separately from gross NRR. Seeing the two numbers side-by-side makes the expansion gap visible in leadership reviews and creates accountability.',
    ],
  },

  'expansion_expansion': {
    description: 'You\'ve named expansion as both your gap and your priority. The companies that grow expansion NRR fastest are the ones who build a systematic motion — triggers, pipeline, and accountability — rather than relying on CS relationships and good timing.',
    recommendations: [
      'Build an expansion playbook this quarter: list your five most common expansion scenarios and write a three-slide mini-pitch for each that CS can pull up in any conversation.',
      'Instrument your product for expansion signals: which usage events historically precede an upsell? Build a CRM flag or Slack alert for those events so CS gets notified when a customer is ready.',
      'Create an expansion quota for your CS team — even 10% of variable comp tied to expansion ARR is enough to change where they spend their time each week.',
    ],
  },

  'expansion_pricing': {
    description: 'Pricing and expansion are closely linked — better packaging creates natural upgrade paths that make expansion easier to sell. But the faster win is usually a systematic expansion motion; packaging redesigns take longer to test and ship.',
    recommendations: [
      'Audit your current packaging: is there a logical next tier that customers can grow into, or does every expansion require a custom deal? If it requires a custom deal, that\'s the bottleneck.',
      'Identify the top three reasons expansion conversations stall. Is it pricing clarity, internal approval process, or the customer not seeing the value yet? The answer tells you whether pricing or process is the real lever.',
      'Before redesigning packages, run 10 expansion conversations with your highest-potential accounts and document what objections come up. That\'s your packaging brief.',
    ],
  },

  // ── PRICING as weakest ───────────────────────────────────────────────────────

  'pricing_reporting': {
    description: 'Reporting is a reasonable foundation priority, but pricing is where you\'re likely losing real margin right now — under-priced renewals and uncontrolled discounting are silent revenue drags that compound every quarter.',
    recommendations: [
      'Pull a discounting report this week: average discount by deal size, segment, and rep. If you don\'t have this data, that\'s your first reporting priority — and it directly informs the pricing work.',
      'Implement a discount approval threshold immediately. Deals above 15% (or your equivalent) require manager sign-off. This single change typically improves NRR by 1–3pp within two quarters.',
      'Review your last 20 renewals and flag every account where pricing wasn\'t discussed. That\'s unearned churn risk sitting quietly in your book.',
    ],
  },

  'pricing_retention': {
    description: 'Retention is the right instinct, but pricing friction is often what converts retention risk into actual churn at renewal. An account that feels overcharged doesn\'t just push back on price — they start evaluating alternatives.',
    recommendations: [
      'Add "pricing/value concern" as an explicit input to your health score, weighted alongside usage and NPS. If you\'re not tracking price sensitivity, you\'re missing a leading churn indicator.',
      'For every at-risk account, run a value audit before the renewal conversation: what ROI has this customer realized, and can you quantify it? A clear value story neutralizes most pricing objections.',
      'Test a "right-size before churn" save playbook: for accounts signaling price friction, offer a structured downgrade path rather than losing them entirely. Managed contraction beats churn.',
    ],
  },

  'pricing_expansion': {
    description: 'Expansion is hard to accelerate when your pricing architecture doesn\'t have clear upgrade paths. If every expansion conversation requires custom negotiation, you\'re adding friction that slows the motion no matter how good your CS team is.',
    recommendations: [
      'Map your current expansion scenarios to your pricing tiers: is there a logical per-seat, per-module, or per-tier upgrade path for each one? If not, design one — even a rough v1 doc changes conversations.',
      'Analyze your last 20 expansion deals: how long from first conversation to close, and what caused the delays? Pricing clarity issues will show up clearly in the data.',
      'Create a standard expansion price card for CS so they don\'t have to go back to RevOps for every upsell. Speed kills more expansion deals than price itself.',
    ],
  },

  'pricing_pricing': {
    description: 'You\'ve identified pricing as both your gap and your priority. The biggest pricing lever for most companies at this stage isn\'t a price increase — it\'s discounting discipline and value communication consistency. Start with controls before you touch the pricing architecture.',
    recommendations: [
      'Implement discount controls this quarter: hard approval gates at 10% and 20%, logged in your CRM with the approving manager\'s name attached. This creates accountability and slows the casual discounting that erodes margin.',
      'Build a value communication playbook for CS: a one-page ROI calculator tied to your top three customer outcomes, used consistently in QBRs and renewals. Value clarity reduces price objections more than any pricing restructure.',
      'Run a pricing benchmark against your top two competitors using publicly available data. Even a rough comparison tells you whether you\'re underpriced, overpriced, or at parity — and where you have room to push.',
    ],
  },
}

export function getDiagnosticTemplate(
  weakestBlock: DiagnosticBlock,
  q5Priority: DiagnosticPriority,
): DiagnosticTemplate | null {
  return TEMPLATES[`${weakestBlock}_${q5Priority}`] ?? null
}

// ─── Divergence note ──────────────────────────────────────────────────────────

export function getDivergenceNote(
  weakestBlock: DiagnosticBlock,
  q5Priority: DiagnosticPriority,
): string | null {
  if (weakestBlock === q5Priority) return null
  const priorityLabel = BLOCK_LABELS[q5Priority].charAt(0) + BLOCK_LABELS[q5Priority].slice(1).toLowerCase()
  const weakestLabel  = BLOCK_LABELS[weakestBlock].charAt(0) + BLOCK_LABELS[weakestBlock].slice(1).toLowerCase()
  return `Note: You said your top priority is ${priorityLabel}, but your data shows ${weakestLabel} is your weakest area. We recommend addressing ${weakestLabel} first — it's the gap most likely to limit the results from your stated priority.`
}

// ─── Block name for display ───────────────────────────────────────────────────

export const BLOCK_DISPLAY_NAMES: Record<DiagnosticBlock, string> = {
  reporting: 'NRR Reporting',
  retention: 'Retention',
  expansion: 'Expansion',
  pricing:   'Pricing',
}
