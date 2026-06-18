// Enterprise Value Uplift calculations.
// evPerPP = arrBase × tieredMultiplier
// evUplift per scenario = evPerPP × ppDelta (capped at 30pp for label and value)

export interface EVTier {
  minNRR: number     // inclusive, decimal (e.g. 0.90)
  maxNRR: number     // exclusive, decimal (Infinity for last tier)
  multiplier: number // EV multiple applied per 1pp NRR improvement
  label: string
}

export interface EVScenario {
  targetNRR: number   // e.g. 1.10 for 110%
  ppDelta: number     // percentage points, capped at 30 when original > 30
  evUplift: number    // dollars (uses capped ppDelta)
  label: string
  ppCapped: boolean   // true when the original delta exceeded 30pp
}

export interface EVUpliftResult {
  arrBase: number
  multiplier: number
  evPerPP: number
  scenarios: EVScenario[]
  topOfMarketMessage: string | null  // non-null only when currentNRR >= 130%
}

const EV_TIERS: EVTier[] = [
  { minNRR: 0,    maxNRR: 0.90, multiplier: 0.30, label: 'Declining' },
  { minNRR: 0.90, maxNRR: 1.00, multiplier: 0.50, label: 'Eroding' },
  { minNRR: 1.00, maxNRR: 1.10, multiplier: 0.75, label: 'Net positive' },
  { minNRR: 1.10, maxNRR: 1.20, multiplier: 1.00, label: 'Strong' },
  { minNRR: 1.20, maxNRR: Infinity, multiplier: 1.25, label: 'World-class' },
]

export function getTier(nrrDecimal: number): EVTier {
  return (
    EV_TIERS.find((t) => nrrDecimal >= t.minNRR && nrrDecimal < t.maxNRR) ??
    EV_TIERS[EV_TIERS.length - 1]!
  )
}

interface ScenarioSpec {
  targetNRR: number
  label: string
}

function determineSpecs(nrr: number): ScenarioSpec[] {
  if (nrr < 0.90) {
    return [
      { targetNRR: 1.00, label: 'Stop the bleeding — recover to 100%' },
      { targetNRR: 1.10, label: 'Move to Strong territory' },
      { targetNRR: 1.20, label: 'Reach World-class' },
    ]
  }
  if (nrr < 1.00) {
    return [
      { targetNRR: 1.00, label: 'Cross into Net positive' },
      { targetNRR: 1.10, label: 'Move to Strong' },
      { targetNRR: 1.20, label: 'Reach World-class' },
    ]
  }
  if (nrr < 1.10) {
    const labels = ['Move to Strong', 'Mid-Strong', 'Reach World-class']
    return [0.05, 0.10, 0.20].map((off, i) => {
      const raw = nrr + off
      const capped = raw > 1.30
      return { targetNRR: capped ? 1.30 : raw, label: capped ? '+30pp+' : labels[i]! }
    })
  }
  if (nrr < 1.20) {
    return [
      { targetNRR: 1.20, label: 'Reach World-class' },
      { targetNRR: 1.25, label: 'Top quartile' },
      { targetNRR: 1.30, label: 'Elite — top decile' },
    ]
  }
  // 1.20 <= nrr < 1.30: lower World-class — only 2 scenarios
  return [
    { targetNRR: 1.30, label: 'Top decile — elite' },
    { targetNRR: 1.35, label: 'Best-in-class' },
  ]
}

export function formatEVUplift(value: number): string {
  if (value >= 1_000_000_000) {
    return `+$${parseFloat((value / 1_000_000_000).toFixed(1))}B`
  }
  if (value >= 10_000_000) {
    return `+$${Math.round(value / 1_000_000)}M`
  }
  if (value >= 1_000_000) {
    return `+$${parseFloat((value / 1_000_000).toFixed(1))}M`
  }
  if (value >= 100_000) {
    return `+$${Math.round(value / 1_000)}K`
  }
  return `+$${Math.round(value).toLocaleString('en-US')}`
}

const TOP_OF_MARKET_MESSAGE =
  "You're at the top of the market. EV uplift from here comes from preserving NRR through scale-ups, not pushing it higher."

export function computeEVUplift(
  startingMRR: number | null,
  currentNRR: number | null,
): EVUpliftResult | null {
  if (!startingMRR || startingMRR <= 0 || currentNRR === null) return null
  if (startingMRR < 800_000) return null

  const arrBase = startingMRR * 12
  const tier = getTier(currentNRR)
  const multiplier = tier.multiplier
  const evPerPP = arrBase * multiplier

  if (currentNRR >= 1.30) {
    // Top of market: EV preserved at 2× ARR scale maintaining current NRR
    return {
      arrBase,
      multiplier,
      evPerPP,
      scenarios: [
        {
          targetNRR: currentNRR,
          ppDelta: 0,
          evUplift: arrBase * 2 * multiplier,
          label: 'Maintain through 2x scale',
          ppCapped: false,
        },
      ],
      topOfMarketMessage: TOP_OF_MARKET_MESSAGE,
    }
  }

  const specs = determineSpecs(currentNRR)
  const scenarios: EVScenario[] = []

  for (const spec of specs) {
    const rawDelta = Math.round((spec.targetNRR - currentNRR) * 100)
    if (rawDelta <= 0) continue
    const ppCapped = rawDelta > 30
    const ppDelta = ppCapped ? 30 : rawDelta
    scenarios.push({
      targetNRR: spec.targetNRR,
      ppDelta,
      evUplift: evPerPP * ppDelta,
      label: spec.label,
      ppCapped,
    })
  }

  return { arrBase, multiplier, evPerPP, scenarios, topOfMarketMessage: null }
}
