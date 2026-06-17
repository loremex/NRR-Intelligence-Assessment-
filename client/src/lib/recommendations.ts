import { getCapability } from './rubric'
import type { ActionCapKey, CapKey } from './state'
import {
  getActionCapabilityOverall,
  getMeasurementOverall,
  getOverallIntelligence,
  getActionDimAvg,
  getCrossCapDimAvg,
  getThreeWeakestLevers,
  getThemeLeverAvg,
  DIMS,
  type AllPicks,
} from './scoring'

const CTA_URL = 'https://calendly.com/loremex/intro'
const CTA_TEXT = 'Loremex helps PE-backed SaaS leaders move from L3 to L5 across these capabilities.'

export interface RecommendationResult {
  sentences: string[]
  cta: { text: string; url: string }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function fmt(n: number | null): string {
  return n !== null ? n.toFixed(2) : '—'
}

// ─── Pattern builders (each returns 1-2 sentences) ────────────────────────────

function patternC(measOverall: number, weakestMName: string): string[] {
  return [
    `Your NRR Reporting maturity is ${fmt(measOverall)}/5. Before investing heavily in action capabilities, address ${weakestMName} — without reliable measurement, you can't tell whether your action investments are working.`,
  ]
}

function patternB(weakestDim: string, crossCapAvg: number): string[] {
  return [
    `Your ${weakestDim} dimension is weak across your selected action capabilities (cross-cap average ${fmt(crossCapAvg)}/5). This suggests ${weakestDim} is your structural constraint — investing here will lift all capabilities simultaneously, rather than fixing one at a time.`,
  ]
}

function patternA(capName: string, capOverall: number, leverNames: string[]): string[] {
  const leversStr = leverNames.length > 0 ? leverNames.join(', ') : 'your highest-weight levers'
  return [
    `Your weakest action capability is ${capName} with overall maturity at ${fmt(capOverall)}/5.`,
    `The three highest-impact levers to address are ${leversStr} — investment here will have the most direct effect on your NRR trajectory.`,
  ]
}

function patternF(
  pricingOverall: number,
  otherCaps: Array<{ name: string; overall: number }>,
): string[] {
  const others = otherCaps.map((c) => `${c.name} (${fmt(c.overall)})`).join(' and ')
  return [
    `Your Pricing Optimization scores ${fmt(pricingOverall)}/5, lower than your ${others}. Pricing is the silent NRR killer — even strong retention and expansion can be undermined by pricing leakage.`,
  ]
}

function patternE(proveAvg: number, sellAvg: number): string[] {
  const direction =
    proveAvg > sellAvg
      ? "You're proving value but not selling it through."
      : "You're running motions without the proof to anchor them."
  return [
    `Your PROVE levers (L1, L2) average ${fmt(proveAvg)} while your SELL levers (L3–L5) average ${fmt(sellAvg)}. ${direction}`,
  ]
}

function patternD(overallIntelligence: number, strongestDim: string, strongestScore: number): string[] {
  return [
    `Your Overall Intelligence is ${fmt(overallIntelligence)}/5, ahead of most B2B SaaS at your stage. The growth opportunity is the L4–L5 transition: ${strongestDim} is strongest at ${fmt(strongestScore)}, and the next move is from accountability to prediction.`,
  ]
}

// ─── Main composition function ────────────────────────────────────────────────

export function composeRecommendation(
  selectedCapabilities: CapKey[],
  picks: AllPicks,
): RecommendationResult {
  const selectedActionCaps = selectedCapabilities.filter((k): k is ActionCapKey => k !== 'measurement')
  const hasMeasurement = selectedCapabilities.includes('measurement')

  // ── Special case: only NRR Reporting selected ─────────────────────────────

  if (selectedActionCaps.length === 0 && hasMeasurement) {
    const measOverall = getMeasurementOverall(picks.measurement)
    const weakest = getThreeWeakestLevers('measurement', picks)[0]
    const scoreStr = fmt(measOverall)
    const weakestName = weakest?.name ?? 'measurement quality'
    return {
      sentences: [
        `Your NRR Reporting maturity is ${scoreStr}/5; the weakest category is ${weakestName}. Strengthening this is the foundation for any future action capability investment.`,
      ],
      cta: { text: CTA_TEXT, url: CTA_URL },
    }
  }

  // ── Nothing to score ──────────────────────────────────────────────────────

  if (selectedActionCaps.length === 0) {
    return { sentences: [], cta: { text: CTA_TEXT, url: CTA_URL } }
  }

  // ── Compute scores needed by patterns ─────────────────────────────────────

  const actionOveralls = Object.fromEntries(
    selectedActionCaps.map((k) => [k, getActionCapabilityOverall(k, picks[k])]),
  ) as Record<ActionCapKey, number | null>

  const overallIntelligence = getOverallIntelligence(selectedActionCaps, picks)
  const measOverall = hasMeasurement ? getMeasurementOverall(picks.measurement) : null

  // ── Evaluate each pattern (priority: C=1, B=2, A=3, F=4, E=5, D=6) ────────

  type PatternEntry = { priority: number; sentences: string[] }
  const eligible: PatternEntry[] = []

  // Pattern C
  if (hasMeasurement && measOverall !== null && measOverall < 3.0) {
    const weakestM = getThreeWeakestLevers('measurement', picks)[0]
    eligible.push({ priority: 1, sentences: patternC(measOverall, weakestM?.name ?? 'measurement quality') })
  }

  // Pattern B
  if (selectedActionCaps.length >= 2) {
    const crossAvgs = DIMS.map((d) => ({ dim: d as string, avg: getCrossCapDimAvg(selectedActionCaps, d, picks) }))
    const valid = crossAvgs.filter((x): x is { dim: string; avg: number } => x.avg !== null)
    if (valid.length > 0) {
      const avgs = valid.map((x) => x.avg)
      const minAvg = Math.min(...avgs)
      const maxAvg = Math.max(...avgs)
      if (minAvg < 2.5 || maxAvg - minAvg > 1.0) {
        const weakest = valid.reduce((a, b) => (a.avg <= b.avg ? a : b))
        eligible.push({ priority: 2, sentences: patternB(weakest.dim, weakest.avg) })
      }
    }
  }

  // Pattern A — always fires if ≥1 action cap
  const capsWithScores = selectedActionCaps
    .map((k) => ({ key: k, overall: actionOveralls[k] }))
    .filter((c): c is { key: ActionCapKey; overall: number } => c.overall !== null)
  const weakestCapEntry = capsWithScores.reduce(
    (min, c) => (c.overall < min.overall ? c : min),
    capsWithScores[0] ?? { key: selectedActionCaps[0], overall: 0 },
  )
  const weakestCapInfo = getCapability(weakestCapEntry.key)!
  const weakestLevers = getThreeWeakestLevers(weakestCapEntry.key, picks)
    .filter((l) => l.score !== null)
    .slice(0, 3)
  eligible.push({
    priority: 3,
    sentences: patternA(weakestCapInfo.name, weakestCapEntry.overall, weakestLevers.map((l) => l.name)),
  })

  // Pattern F
  if (selectedCapabilities.includes('pricing') && selectedActionCaps.length >= 2) {
    const pricingOverall = actionOveralls['pricing']
    const otherCaps = selectedActionCaps.filter((k) => k !== 'pricing')
    const otherWithScores = otherCaps
      .filter((k) => actionOveralls[k] !== null)
      .map((k) => ({ name: getCapability(k)!.name, overall: actionOveralls[k]! }))
    if (pricingOverall !== null && otherWithScores.length > 0) {
      const otherAvg = otherWithScores.reduce((s, c) => s + c.overall, 0) / otherWithScores.length
      if (pricingOverall < otherAvg - 0.5) {
        eligible.push({ priority: 4, sentences: patternF(pricingOverall, otherWithScores) })
      }
    }
  }

  // Pattern E
  if (selectedActionCaps.length >= 2) {
    const proveAvgs = selectedActionCaps.map((k) => getThemeLeverAvg(k, 'PROVE', picks[k]))
    const sellAvgs = selectedActionCaps.map((k) => getThemeLeverAvg(k, 'SELL', picks[k]))
    const proveAvg = proveAvgs.filter((v): v is number => v !== null).reduce((a, b) => a + b, 0) /
      proveAvgs.filter((v) => v !== null).length
    const sellAvg = sellAvgs.filter((v): v is number => v !== null).reduce((a, b) => a + b, 0) /
      sellAvgs.filter((v) => v !== null).length
    if (isFinite(proveAvg) && isFinite(sellAvg) && Math.abs(proveAvg - sellAvg) > 0.7) {
      eligible.push({ priority: 5, sentences: patternE(proveAvg, sellAvg) })
    }
  }

  // Pattern D
  if (overallIntelligence !== null && overallIntelligence > 3.5) {
    let strongestDim = 'People'
    let strongestScore = -Infinity
    for (const dim of DIMS) {
      const avg =
        selectedActionCaps.length >= 2
          ? getCrossCapDimAvg(selectedActionCaps, dim, picks)
          : getActionDimAvg(selectedActionCaps[0], dim, picks[selectedActionCaps[0]])
      if (avg !== null && avg > strongestScore) {
        strongestScore = avg
        strongestDim = dim
      }
    }
    eligible.push({
      priority: 6,
      sentences: patternD(overallIntelligence, strongestDim, strongestScore > 0 ? strongestScore : overallIntelligence),
    })
  }

  // ── Compose: CTA takes 1 slot, patterns fill the rest (budget = 3) ─────────

  eligible.sort((a, b) => a.priority - b.priority)

  const sentences: string[] = []
  const MAX_PATTERN_SENTENCES = 3

  for (const entry of eligible) {
    if (sentences.length + entry.sentences.length <= MAX_PATTERN_SENTENCES) {
      sentences.push(...entry.sentences)
    }
  }

  return { sentences, cta: { text: CTA_TEXT, url: CTA_URL } }
}
