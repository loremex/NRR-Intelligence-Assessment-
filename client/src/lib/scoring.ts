import { getCapability } from './rubric'
import type { ActionCapKey, CapKey } from './state'
import type { MeasurementCapability } from './rubric-schema'

export const V2_LEVERS = ['impact', 'whitespace', 'accountability', 'playbook', 'execution', 'governance'] as const
export type V2LeverKey = (typeof V2_LEVERS)[number]

// Picks shape mirrors AssessmentState['picks'] — kept local so this lib has no React deps.
export type AllPicks = {
  measurement: Record<string, number | null>
  retention: Record<string, number | null>
  expansion: Record<string, number | null>
  pricing: Record<string, number | null>
}

// ─── Core math ────────────────────────────────────────────────────────────────

function weightedAvg(values: (number | null)[], weights: number[]): number | null {
  let sumWV = 0
  let sumW = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v !== null && isFinite(v)) {
      sumWV += v * weights[i]
      sumW += weights[i]
    }
  }
  return sumW > 0 ? sumWV / sumW : null
}

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

// ─── V2 action cap scoring ────────────────────────────────────────────────────

export function getV2CellScore(capKey: ActionCapKey, lever: string, picks: AllPicks): number | null {
  const idx = picks[capKey][lever]
  if (idx === null || idx === undefined) return null
  return idx + 1
}

export function getV2CapabilityOverall(capKey: ActionCapKey, picks: AllPicks): number | null {
  const scores = V2_LEVERS.map((lever) => getV2CellScore(capKey, lever, picks))
  return simpleMean(scores)
}

export function getV2OverallMaturity(selectedCaps: ActionCapKey[], picks: AllPicks): number | null {
  if (selectedCaps.length === 0) return null
  return simpleMean(selectedCaps.map((k) => getV2CapabilityOverall(k, picks)))
}

export function getV2MaturityStage(score: number | null): string {
  if (score === null) return 'Not assessed'
  if (score < 1.5) return 'Reactive'
  if (score < 2.5) return 'Diagnostic'
  if (score < 3.5) return 'Operational'
  if (score < 4.5) return 'Optimized'
  return 'Intelligent'
}

export interface V2WeakestCell {
  capKey: ActionCapKey
  lever: V2LeverKey
  score: number
  gapToL5: number
}

export function getV2WeakestCells(selectedCaps: ActionCapKey[], picks: AllPicks): V2WeakestCell[] {
  const cells: V2WeakestCell[] = []
  for (const capKey of selectedCaps) {
    for (const lever of V2_LEVERS) {
      const score = getV2CellScore(capKey, lever, picks)
      if (score !== null) {
        cells.push({ capKey, lever, score, gapToL5: 5 - score })
      }
    }
  }
  return cells.sort((a, b) => a.score - b.score || a.gapToL5 - b.gapToL5)
}

// ─── Measurement scoring ──────────────────────────────────────────────────────

export function getMeasurementOverall(measurementPicks: Record<string, number | null>): number | null {
  const cap = getCapability('measurement') as MeasurementCapability
  return weightedAvg(
    cap.levers.map((l) => measurementPicks[l.id] ?? null),
    cap.levers.map((l) => l.weight),
  )
}

export function getCapabilityOverall(capabilityKey: CapKey, picks: AllPicks): number | null {
  if (capabilityKey === 'measurement') return getMeasurementOverall(picks.measurement)
  return getV2CapabilityOverall(capabilityKey, picks)
}

// ─── Overall intelligence + distance ─────────────────────────────────────────

export function getOverallIntelligence(
  selectedActionCaps: ActionCapKey[],
  picks: AllPicks,
): number | null {
  return getV2OverallMaturity(selectedActionCaps, picks)
}

export function getDistanceToL5(overall: number | null): number | null {
  return overall !== null ? 5 - overall : null
}

// ─── Three weakest levers (measurement only) ──────────────────────────────────

export interface WeakestLeverInfo {
  id: string
  name: string
  score: number | null
  gapToL5: number | null
}

export function getThreeWeakestLevers(capabilityKey: CapKey, picks: AllPicks): WeakestLeverInfo[] {
  if (capabilityKey === 'measurement') {
    const cap = getCapability('measurement') as MeasurementCapability
    const rows = cap.levers.map((l) => {
      const score = picks.measurement[l.id] ?? null
      return { id: l.id, name: l.name, score, gapToL5: score !== null ? 5 - score : null }
    })
    return [...rows.filter((r) => r.score !== null).sort((a, b) => a.score! - b.score!),
            ...rows.filter((r) => r.score === null)].slice(0, 3)
  }
  return []
}
