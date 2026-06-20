import type { CapKey } from './state'

export type AllPicks = {
  reporting: Record<string, number | null>
  retention: Record<string, number | null>
  expansion: Record<string, number | null>
  pricing: Record<string, number | null>
}

const Q_IDS = ['q1', 'q2', 'q3'] as const

function simpleMean(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && isFinite(v))
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

// ─── Score → color bucket ─────────────────────────────────────────────────────

export function scoreToColor(score: number | null): string {
  if (score === null) return '#F1F5F9'
  if (score < 1.5) return '#FECACA'
  if (score < 2.5) return '#FED7AA'
  if (score < 3.5) return '#BFDBFE'
  if (score < 4.5) return '#A7F3D0'
  return '#6EE7B7'
}

// ─── V3 scoring ───────────────────────────────────────────────────────────────

export function getCellScore(capKey: CapKey, qId: string, picks: AllPicks): number | null {
  const idx = picks[capKey][qId]
  if (idx === null || idx === undefined) return null
  return idx + 1
}

export function getCapabilityScore(capKey: CapKey, picks: AllPicks): number | null {
  return simpleMean(Q_IDS.map((q) => getCellScore(capKey, q, picks)))
}

export function getOverallMaturity(selectedCaps: CapKey[], picks: AllPicks): number | null {
  if (selectedCaps.length === 0) return null
  return simpleMean(selectedCaps.map((k) => getCapabilityScore(k, picks)))
}

export function getMaturityStage(score: number | null): string {
  if (score === null) return 'Not assessed'
  if (score < 1.5) return 'Reactive'
  if (score < 2.5) return 'Diagnostic'
  if (score < 3.5) return 'Operational'
  if (score < 4.5) return 'Optimized'
  return 'Intelligent'
}

export interface WeakestCell {
  capKey: CapKey
  qId: string
  score: number
  gapToL5: number
}

export function getWeakestCells(selectedCaps: CapKey[], picks: AllPicks): WeakestCell[] {
  const cells: WeakestCell[] = []
  for (const capKey of selectedCaps) {
    for (const qId of Q_IDS) {
      const score = getCellScore(capKey, qId, picks)
      if (score !== null) {
        cells.push({ capKey, qId, score, gapToL5: 5 - score })
      }
    }
  }
  return cells.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    const aCapScore = getCapabilityScore(a.capKey, picks) ?? 5
    const bCapScore = getCapabilityScore(b.capKey, picks) ?? 5
    return aCapScore - bCapScore
  })
}

// ─── Aliases kept for compatibility with api.ts / Scorecard ──────────────────

export function getCapabilityOverall(capKey: CapKey, picks: AllPicks): number | null {
  return getCapabilityScore(capKey, picks)
}

export function getOverallIntelligence(selectedCaps: CapKey[], picks: AllPicks): number | null {
  return getOverallMaturity(selectedCaps, picks)
}

export function getDistanceToL5(overall: number | null): number | null {
  return overall !== null ? 5 - overall : null
}
