import type { CapKey } from './state'
import {
  getCapabilityScore,
  getOverallIntelligence,
  getWeakestCells,
  type AllPicks,
} from './scoring'
import { V3_ASSESSMENT_CONTENT } from '../content/assessmentContent'

const CTA_URL = (import.meta.env.VITE_CALENDLY_URL as string | undefined) ?? 'https://calendly.com/loremex/intro'
const CTA_TEXT = 'Loremex helps PE-backed SaaS leaders move from L3 to L5 across these capabilities.'

export interface RecommendationResult {
  sentences: string[]
  cta: { text: string; url: string }
}

function fmt(n: number | null): string {
  return n !== null ? n.toFixed(2) : '—'
}

function capName(capKey: CapKey): string {
  return V3_ASSESSMENT_CONTENT.find((c) => c.key === capKey)?.name ?? capKey
}

function patternC(reportingScore: number, weakestQTitle: string): string[] {
  return [
    `Your NRR Reporting maturity is ${fmt(reportingScore)}/5. Before investing heavily in action capabilities, address ${weakestQTitle} — without reliable measurement, you can't tell whether your action investments are working.`,
  ]
}

function patternA(wCapName: string, wCapScore: number, questionTitles: string[]): string[] {
  const qs = questionTitles.length > 0 ? questionTitles.join(', ') : 'your lowest-scoring areas'
  return [
    `Your weakest capability is ${wCapName} with overall maturity at ${fmt(wCapScore)}/5.`,
    `The three highest-impact areas to address are ${qs} — investment here will have the most direct effect on your NRR trajectory.`,
  ]
}

function patternF(_pricingScore: number, _otherCaps: Array<{ name: string; score: number }>): string[] {
  return [
    `Pricing is the silent NRR killer — even strong retention and expansion can be undermined by pricing leakage.`,
  ]
}

function patternD(overallScore: number, strongestName: string, strongestScore: number): string[] {
  return [
    `Your Overall Intelligence is ${fmt(overallScore)}/5, ahead of most B2B SaaS at your stage. The growth opportunity is the L4–L5 transition: ${strongestName} is strongest at ${fmt(strongestScore)}, and the next move is from accountability to prediction.`,
  ]
}

export function composeRecommendation(
  selectedCapabilities: CapKey[],
  picks: AllPicks,
): RecommendationResult {
  if (selectedCapabilities.length === 0) {
    return { sentences: [], cta: { text: CTA_TEXT, url: CTA_URL } }
  }

  const capScores = Object.fromEntries(
    selectedCapabilities.map((k) => [k, getCapabilityScore(k, picks)]),
  ) as Record<CapKey, number | null>

  const overallScore = getOverallIntelligence(selectedCapabilities, picks)
  const hasReporting = selectedCapabilities.includes('reporting')

  type PatternEntry = { priority: number; sentences: string[] }
  const eligible: PatternEntry[] = []

  // Pattern C — reporting gap
  if (hasReporting && capScores['reporting'] !== null && capScores['reporting'] < 3.0) {
    const weakestReportingCell = getWeakestCells(['reporting'], picks)[0]
    const cap = V3_ASSESSMENT_CONTENT.find((c) => c.key === 'reporting')
    const qTitle = cap?.questions.find((q) => q.id === weakestReportingCell?.qId)?.title ?? 'measurement quality'
    eligible.push({ priority: 1, sentences: patternC(capScores['reporting'], qTitle) })
  }

  // Pattern A — weakest capability
  const capsWithScores = selectedCapabilities
    .map((k) => ({ key: k, score: capScores[k] }))
    .filter((c): c is { key: CapKey; score: number } => c.score !== null)

  if (capsWithScores.length > 0) {
    const weakest = capsWithScores.reduce((min, c) => (c.score < min.score ? c : min))
    const weakestCells = getWeakestCells([weakest.key], picks).slice(0, 3)
    const cap = V3_ASSESSMENT_CONTENT.find((c) => c.key === weakest.key)
    const qTitles = weakestCells.map((cell) => {
      return cap?.questions.find((q) => q.id === cell.qId)?.title ?? cell.qId
    })
    eligible.push({ priority: 3, sentences: patternA(capName(weakest.key), weakest.score, qTitles) })
  }

  // Pattern F — pricing gap
  if (selectedCapabilities.includes('pricing') && selectedCapabilities.length >= 2) {
    const pricingScore = capScores['pricing']
    const others = selectedCapabilities
      .filter((k) => k !== 'pricing' && capScores[k] !== null)
      .map((k) => ({ name: capName(k), score: capScores[k]! }))
    if (pricingScore !== null && others.length > 0) {
      const otherAvg = others.reduce((s, c) => s + c.score, 0) / others.length
      if (pricingScore < otherAvg - 0.5) {
        eligible.push({ priority: 4, sentences: patternF(pricingScore, others) })
      }
    }
  }

  // Pattern D — strong baseline
  if (overallScore !== null && overallScore > 3.5 && capsWithScores.length > 0) {
    const strongest = capsWithScores.reduce((max, c) => (c.score > max.score ? c : max))
    eligible.push({ priority: 6, sentences: patternD(overallScore, capName(strongest.key), strongest.score) })
  }

  eligible.sort((a, b) => a.priority - b.priority)

  const sentences: string[] = []
  for (const entry of eligible) {
    if (sentences.length + entry.sentences.length <= 3) {
      sentences.push(...entry.sentences)
    }
  }

  return { sentences, cta: { text: CTA_TEXT, url: CTA_URL } }
}
