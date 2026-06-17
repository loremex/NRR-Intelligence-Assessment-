import type { CapKey } from '../lib/state'

export interface DiagnosticTemplate {
  verdictTitle: string
  verdictDescription: string
  recommendations: [string, string, string]
  preSelectedCapabilities: CapKey[]
}

// Q2 options (biggest NRR challenge)
export const Q2_OPTIONS = [
  { value: 'churn',      label: 'Churn is higher than we\'d like' },
  { value: 'expansion',  label: 'We\'re not capturing enough expansion revenue' },
  { value: 'pricing',    label: 'Customers push back on pricing at renewal' },
  { value: 'visibility', label: 'We lack visibility into what\'s driving our NRR' },
] as const

// Q3 options (data maturity)
export const Q3_OPTIONS = [
  { value: 'spreadsheets',   label: 'Mostly spreadsheets — manual and time-consuming' },
  { value: 'basic_systems',  label: 'Basic systems — we have the data but it\'s hard to analyze' },
  { value: 'good_data',      label: 'Good data — we track NRR consistently but interpretation is hard' },
  { value: 'sophisticated',  label: 'Sophisticated — automated dashboards and proactive alerts' },
] as const

// Q4 options (team structure)
export const Q4_OPTIONS = [
  { value: 'no_owner',       label: 'No dedicated owner — it\'s split across CS, Sales, and Finance' },
  { value: 'cs_owns',        label: 'CS owns it — customer success drives retention and expansion' },
  { value: 'dedicated_team', label: 'Dedicated retention or expansion team' },
  { value: 'just_building',  label: 'We\'re just starting to build this capability' },
] as const

// Q5 options (strategic priority)
export const Q5_OPTIONS = [
  { value: 'reduce_churn',       label: 'Reduce churn and protect existing revenue' },
  { value: 'grow_expansion',     label: 'Accelerate expansion revenue from existing customers' },
  { value: 'improve_pricing',    label: 'Improve pricing discipline and packaging' },
  { value: 'build_measurement',  label: 'Build better NRR measurement and reporting' },
] as const

// Q6 options (current ARR)
export const Q6_OPTIONS = [
  { value: 'under_5m',    label: 'Under $5M' },
  { value: '5m_20m',      label: '$5M–$20M' },
  { value: '20m_50m',     label: '$20M–$50M' },
  { value: '50m_100m',    label: '$50M–$100M' },
  { value: 'over_100m',   label: 'Over $100M' },
] as const

// ─── 16-cell Q2 × Q5 verdict matrix ──────────────────────────────────────────

const TEMPLATES: Record<string, DiagnosticTemplate> = {
  'churn_reduce_churn': {
    verdictTitle: 'Your Challenge and Priority Are Aligned: Fix Churn',
    verdictDescription: 'You\'ve correctly identified churn as both your current pain and strategic focus — that alignment is an advantage most companies don\'t have. The key question is whether you have the measurement infrastructure to distinguish preventable churn from structural churn.',
    recommendations: [
      'Map your churn cohorts by customer segment and contract vintage to find where the leakage is worst',
      'Identify the top 3 behavioral signals in the 90 days before a customer cancels',
      'Build a health score model that operationalizes those signals into CS playbooks',
    ],
    preSelectedCapabilities: ['retention', 'measurement'],
  },

  'churn_grow_expansion': {
    verdictTitle: 'Don\'t Expand on a Leaky Bucket',
    verdictDescription: 'Pursuing expansion while churn remains unchecked erodes your NRR math — every expansion dollar you win is partially offset by the revenue you\'re losing out the back door. Stabilizing gross retention first will make your expansion motion dramatically more capital-efficient.',
    recommendations: [
      'Quantify how much expansion revenue is currently being offset by churn in your NRR calculation',
      'Identify the customer segments most likely to churn before you concentrate expansion effort there',
      'Build a retention playbook for your top accounts before accelerating expansion campaigns',
    ],
    preSelectedCapabilities: ['retention', 'expansion'],
  },

  'churn_improve_pricing': {
    verdictTitle: 'Price-Value Misalignment May Be Driving Your Churn',
    verdictDescription: 'If customers are churning while your focus is pricing improvements, the two problems may be connected — customers who don\'t see value at current prices often leave at renewal rather than negotiate. Diagnosing whether churn is pricing-driven or value-driven is the critical first step.',
    recommendations: [
      'Survey churned customers on price-to-value perception to understand if pricing is the root cause',
      'Analyze churn rates by pricing tier to pinpoint where renewal friction is worst',
      'Consider whether packaging changes could reduce friction at renewal before raising prices',
    ],
    preSelectedCapabilities: ['retention', 'pricing'],
  },

  'churn_build_measurement': {
    verdictTitle: 'You Can\'t Fix What You Can\'t Measure',
    verdictDescription: 'Building measurement infrastructure when churn is your immediate pain point is actually the right call — you\'re solving the root cause, not just the symptom. Without reliable NRR data, any retention initiative risks targeting the wrong cohort with the wrong intervention.',
    recommendations: [
      'Start with a definition audit: align CS, Finance, and Sales on what counts as churn versus contraction',
      'Build a cohort-level view of gross retention before launching any retention programs',
      'Standardize your churn tracking so it\'s consistent across your CRM, billing system, and dashboards',
    ],
    preSelectedCapabilities: ['measurement', 'retention'],
  },

  'expansion_reduce_churn': {
    verdictTitle: 'Protect First, Then Expand',
    verdictDescription: 'Focusing on churn reduction when expansion is your NRR challenge is a sound sequencing decision — you need a stable retention base before expansion motions become capital-efficient. The risk is spending 12 months on retention while the most accessible expansion wins go unrealized.',
    recommendations: [
      'Identify which customer segments have both low churn risk and high expansion potential — work those first',
      'Build a prioritization framework that balances churn defense with expansion offense in your CS team',
      'Ensure your CS team has clear expansion triggers alongside their retention responsibilities',
    ],
    preSelectedCapabilities: ['retention', 'expansion'],
  },

  'expansion_grow_expansion': {
    verdictTitle: 'You\'re Ready to Systematize Expansion',
    verdictDescription: 'Your challenge and priority are aligned around expansion revenue — the question is whether your team has the motion, data, and triggers to unlock it repeatably. Most companies at this stage know they\'re leaving expansion on the table but lack the playbook to capture it consistently.',
    recommendations: [
      'Map the natural expansion moments in your customer lifecycle: milestones, usage thresholds, QBRs',
      'Build a product-qualified lead model if you have usage data to identify expansion-ready accounts',
      'Create a written expansion playbook for your top 20 highest-potential accounts this quarter',
    ],
    preSelectedCapabilities: ['expansion', 'retention'],
  },

  'expansion_improve_pricing': {
    verdictTitle: 'Pricing Architecture Is Your Expansion Lever',
    verdictDescription: 'The single most powerful lever for expansion revenue is often pricing design — if your packages don\'t have clear upgrade paths, expansion is hard regardless of how good your CS team is. Aligning your pricing to customer value milestones creates natural expansion triggers that don\'t require manual effort.',
    recommendations: [
      'Audit whether your current pricing tiers have logical upgrade paths customers can grow into organically',
      'Identify your top 3 customer value milestones and whether pricing reflects them',
      'Consider usage-based or seat-expansion components that grow automatically with customer success',
    ],
    preSelectedCapabilities: ['expansion', 'pricing'],
  },

  'expansion_build_measurement': {
    verdictTitle: 'Measure Expansion to Systematize It',
    verdictDescription: 'You can\'t build a repeatable expansion motion without knowing which expansion plays are working — measurement is the foundation of scalable expansion. Getting your expansion attribution right will tell you where to double down and where to stop investing.',
    recommendations: [
      'Track expansion revenue by motion type: upsell, cross-sell, seat expansion, and usage growth',
      'Build a cohort view of expansion rate by customer segment and time-to-first-expand',
      'Ensure expansion revenue is cleanly separated from new logo revenue in your CRM and dashboards',
    ],
    preSelectedCapabilities: ['measurement', 'expansion'],
  },

  'pricing_reduce_churn': {
    verdictTitle: 'Pricing Friction Is a Churn Risk',
    verdictDescription: 'If customers are pushing back on pricing at renewal, some of that friction will convert to churn — customers who feel overcharged are the most vulnerable when their contract comes up. Addressing price-value alignment reduces both the renewal friction and the downstream churn risk.',
    recommendations: [
      'Segment your renewal population by price-to-value satisfaction and identify your most at-risk accounts',
      'Build a save playbook for price-sensitive accounts that leads with ROI data 60 days before renewal',
      'Test whether proactive pricing conversations reduce pushback compared to bringing it up at the renewal meeting',
    ],
    preSelectedCapabilities: ['retention', 'pricing'],
  },

  'pricing_grow_expansion': {
    verdictTitle: 'Better Pricing Enables Better Expansion',
    verdictDescription: 'Customers who experience pricing friction at renewal are unlikely to expand — friction at the retention moment poisons the expansion relationship before it starts. Resolving pricing clarity and packaging before pushing expansion will significantly improve your upsell conversion rates.',
    recommendations: [
      'Map the accounts with the most pricing friction against their expansion potential score',
      'Build an upgrade path that reframes price increases as value unlocks, not cost increases',
      'Create a pricing one-pager that CS can use in expansion conversations to pre-empt sticker shock',
    ],
    preSelectedCapabilities: ['pricing', 'expansion'],
  },

  'pricing_improve_pricing': {
    verdictTitle: 'Pricing Optimization Is Your Clearest Lever',
    verdictDescription: 'You\'ve correctly identified pricing as both the source of friction and the strategic priority — that\'s a focused starting point most companies take years to reach. The key question is whether pricing friction is driven by packaging complexity, lack of value communication, or actual price-market mismatch.',
    recommendations: [
      'Run a win/loss analysis on renewals and expansions where pricing was cited as a friction factor',
      'Build a value-to-price benchmark against your top 3 competitors in your primary segment',
      'Test a pricing story framework for your CS team to use consistently in renewal and expansion conversations',
    ],
    preSelectedCapabilities: ['pricing', 'retention'],
  },

  'pricing_build_measurement': {
    verdictTitle: 'Measure Price Sensitivity Before Changing Pricing',
    verdictDescription: 'Making pricing changes without visibility into how current pricing is performing is high-risk — you may be fixing what isn\'t broken or missing the real friction point. Data should drive your pricing decisions, and right now that data foundation doesn\'t exist yet.',
    recommendations: [
      'Add price sensitivity and perceived-value questions to your NPS, CSAT, and churn exit surveys',
      'Track renewal rate by pricing tier and contract size to identify where friction is actually worst',
      'Build a dashboard that connects pricing tier, expansion rate, and churn rate in a single view before making any changes',
    ],
    preSelectedCapabilities: ['measurement', 'pricing'],
  },

  'visibility_reduce_churn': {
    verdictTitle: 'You\'re Flying Blind on Churn',
    verdictDescription: 'Trying to reduce churn without visibility into what\'s driving it is like trying to plug a leak without knowing where it is. Building your NRR measurement foundation before launching retention programs will make every initiative more targeted and eliminate the wasted effort that comes from guessing.',
    recommendations: [
      'Start with a data audit: do you have reliable cohort-level churn data broken out by segment and contract vintage?',
      'Build a single source of truth for churn by reconciling your CS, Finance, and CRM data into one view',
      'Once data is in place, run a churn driver analysis to identify the top 3 predictors specific to your customer base',
    ],
    preSelectedCapabilities: ['measurement', 'retention'],
  },

  'visibility_grow_expansion': {
    verdictTitle: 'Systematize Expansion Intelligence First',
    verdictDescription: 'Accelerating expansion without the data to know which accounts are ripe for it — or which plays are working — means scaling a motion you can\'t optimize. Building measurement infrastructure before pushing expansion will make your expansion motion significantly more efficient per CS hour spent.',
    recommendations: [
      'Build an account expansion scoring model using product usage, support history, and engagement signals',
      'Track expansion attempts, conversion rates, and average time-to-expand by customer segment',
      'Create an expansion attribution dashboard before scaling any expansion campaign or hiring for the motion',
    ],
    preSelectedCapabilities: ['measurement', 'expansion'],
  },

  'visibility_improve_pricing': {
    verdictTitle: 'Pricing Without Data Is Guessing',
    verdictDescription: 'Making pricing changes without visibility into how your current pricing is performing is a high-risk move — you may be solving the wrong problem entirely. Instrumentation should precede any material pricing architecture change so you know what you\'re actually fixing.',
    recommendations: [
      'Audit your current pricing performance: what percentage of renewals include pricing as a friction factor?',
      'Build a basic pricing analytics view: renewal rates, expansion rates, and churn rates broken out by pricing tier',
      'Use this data to form a clear hypothesis before making any pricing changes — hypothesis first, then test',
    ],
    preSelectedCapabilities: ['measurement', 'pricing'],
  },

  'visibility_build_measurement': {
    verdictTitle: 'You\'ve Found the Right Starting Point',
    verdictDescription: 'You\'re right that measurement is the foundation — everything else (retention, expansion, pricing) compounds when you have reliable NRR data to work from. Companies that get measurement right first build motions that improve quarter over quarter instead of resetting each year.',
    recommendations: [
      'Start with a definition audit: get CS, Finance, and Sales aligned on what NRR, GRR, churn, and expansion each mean',
      'Build a cohort-level NRR view that can be sliced by segment, contract size, and customer tenure',
      'Instrument your key customer lifecycle moments as data signals: onboarding completion, first value, QBR, and renewal',
    ],
    preSelectedCapabilities: ['measurement', 'retention'],
  },
}

export function getDiagnosticTemplate(q2Choice: string, q5Choice: string): DiagnosticTemplate | null {
  return TEMPLATES[`${q2Choice}_${q5Choice}`] ?? null
}

export function getQ2Label(value: string): string {
  return Q2_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function getQ3Label(value: string): string {
  return Q3_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function getQ4Label(value: string): string {
  return Q4_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function getQ5Label(value: string): string {
  return Q5_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function getQ6Label(value: string): string {
  return Q6_OPTIONS.find((o) => o.value === value)?.label ?? value
}
