import { getCapability } from './rubric'
import type { ActionCapKey, CapKey } from './state'
import {
  getV2CapabilityOverall,
  getMeasurementOverall,
  getOverallIntelligence,
  getV2WeakestCells,
  getThreeWeakestLevers,
  type AllPicks,
} from './scoring'

const CTA_URL = (import.meta.env.VITE_CALENDLY_URL as string | undefined) ?? 'https://calendly.com/loremex/intro'
const CTA_TEXT = 'Loremex helps PE-backed SaaS leaders move from L3 to L5 across these capabilities.'

export interface RecommendationResult {
  sentences: string[]
  cta: { text: string; url: string }
}

function fmt(n: number | null): string {
  return n !== null ? n.toFixed(2) : '—'
}

function patternC(measOverall: number, weakestMName: string): string[] {
  return [
    `Your NRR Reporting maturity is ${fmt(measOverall)}/5. Before investing heavily in action capabilities, address ${weakestMName} — without reliable measurement, you can't tell whether your action investments are working.`,
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

function patternD(overallIntelligence: number, strongestCapName: string, strongestScore: number): string[] {
  return [
    `Your Overall Intelligence is ${fmt(overallIntelligence)}/5, ahead of most B2B SaaS at your stage. The growth opportunity is the L4–L5 transition: ${strongestCapName} is strongest at ${fmt(strongestScore)}, and the next move is from accountability to prediction.`,
  ]
}

export function composeRecommendation(
  selectedCapabilities: CapKey[],
  picks: AllPicks,
): RecommendationResult {
  const selectedActionCaps = selectedCapabilities.filter((k): k is ActionCapKey => k !== 'measurement')
  const hasMeasurement = selectedCapabilities.includes('measurement')

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

  if (selectedActionCaps.length === 0) {
    return { sentences: [], cta: { text: CTA_TEXT, url: CTA_URL } }
  }

  const actionOveralls = Object.fromEntries(
    selectedActionCaps.map((k) => [k, getV2CapabilityOverall(k, picks)]),
  ) as Record<ActionCapKey, number | null>

  const overallIntelligence = getOverallIntelligence(selectedActionCaps, picks)
  const measOverall = hasMeasurement ? getMeasurementOverall(picks.measurement) : null

  type PatternEntry = { priority: number; sentences: string[] }
  const eligible: PatternEntry[] = []

  // Pattern C
  if (hasMeasurement && measOverall !== null && measOverall < 3.0) {
    const weakestM = getThreeWeakestLevers('measurement', picks)[0]
    eligible.push({ priority: 1, sentences: patternC(measOverall, weakestM?.name ?? 'measurement quality') })
  }

  // Pattern A — always fires if >=1 action cap
  const capsWithScores = selectedActionCaps
    .map((k) => ({ key: k, overall: actionOveralls[k] }))
    .filter((c): c is { key: ActionCapKey; overall: number } => c.overall !== null)
  const weakestCapEntry = capsWithScores.reduce(
    (min, c) => (c.overall < min.overall ? c : min),
    capsWithScores[0] ?? { key: selectedActionCaps[0], overall: 0 },
  )
  const weakestCapInfo = getCapability(weakestCapEntry.key)!
  const weakestCells = getV2WeakestCells([weakestCapEntry.key], picks).slice(0, 3)
  const leverLabels: Record<string, string> = {
    impact: 'Impact',
    whitespace: 'Whitespace',
    accountability: 'Accountability',
    playbook: 'Playbook',
    execution: 'Execution',
    governance: 'Governance',
  }
  eligible.push({
    priority: 3,
    sentences: patternA(
      weakestCapInfo.name,
      weakestCapEntry.overall,
      weakestCells.map((c) => leverLabels[c.lever] ?? c.lever),
    ),
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

  // Pattern D
  if (overallIntelligence !== null && overallIntelligence > 3.5) {
    const strongest = capsWithScores.reduce(
      (max, c) => (c.overall > max.overall ? c : max),
      capsWithScores[0] ?? { key: selectedActionCaps[0], overall: 0 },
    )
    const strongestCap = getCapability(strongest.key)!
    eligible.push({
      priority: 6,
      sentences: patternD(overallIntelligence, strongestCap.name, strongest.overall),
    })
  }

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
