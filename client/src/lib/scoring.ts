import { getCapability } from './rubric'
import type { ActionCapKey, CapKey } from './state'
import type { ActionCapability, MeasurementCapability } from './rubric-schema'

export const DIMS = ['People', 'Process', 'Technology', 'Data'] as const
export type DimKey = (typeof DIMS)[number]

// Picks shape mirrors AssessmentState['picks'] — kept local so this lib has no React deps.
export type AllPicks = {
  measurement: Record<string, number | null>
  retention: Record<string, Record<string, number | null>>
  expansion: Record<string, Record<string, number | null>>
  pricing: Record<string, Record<string, number | null>>
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

// ─── Lever avg (action caps) ──────────────────────────────────────────────────

export function getLeverAvg(dimPicks: Record<string, number | null>): number | null {
  return simpleMean(DIMS.map((d) => dimPicks[d] ?? null))
}

// ─── Dim avg (weighted, action caps) ─────────────────────────────────────────

export function getActionDimAvg(
  capabilityKey: ActionCapKey,
  dimension: string,
  capPicks: Record<string, Record<string, number | null>>,
): number | null {
  const cap = getCapability(capabilityKey) as ActionCapability
  return weightedAvg(
    cap.levers.map((l) => capPicks[l.id]?.[dimension] ?? null),
    cap.levers.map((l) => l.weight),
  )
}

// ─── Capability overalls ──────────────────────────────────────────────────────

export function getActionCapabilityOverall(
  capabilityKey: ActionCapKey,
  capPicks: Record<string, Record<string, number | null>>,
): number | null {
  const cap = getCapability(capabilityKey) as ActionCapability
  return weightedAvg(
    cap.levers.map((l) => getLeverAvg(capPicks[l.id] ?? {})),
    cap.levers.map((l) => l.weight),
  )
}

export function getMeasurementOverall(measurementPicks: Record<string, number | null>): number | null {
  const cap = getCapability('measurement') as MeasurementCapability
  return weightedAvg(
    cap.levers.map((l) => measurementPicks[l.id] ?? null),
    cap.levers.map((l) => l.weight),
  )
}

export function getCapabilityOverall(capabilityKey: CapKey, picks: AllPicks): number | null {
  if (capabilityKey === 'measurement') return getMeasurementOverall(picks.measurement)
  return getActionCapabilityOverall(capabilityKey, picks[capabilityKey])
}

// ─── Overall intelligence + distance ─────────────────────────────────────────

export function getOverallIntelligence(
  selectedActionCaps: ActionCapKey[],
  picks: AllPicks,
): number | null {
  if (selectedActionCaps.length === 0) return null
  return simpleMean(selectedActionCaps.map((k) => getActionCapabilityOverall(k, picks[k])))
}

export function getDistanceToL5(overall: number | null): number | null {
  return overall !== null ? 5 - overall : null
}

// ─── Cross-cap dim avg ────────────────────────────────────────────────────────

export function getCrossCapDimAvg(
  selectedActionCaps: ActionCapKey[],
  dimension: string,
  picks: AllPicks,
): number | null {
  if (selectedActionCaps.length < 2) return null
  return simpleMean(selectedActionCaps.map((k) => getActionDimAvg(k, dimension, picks[k])))
}

// ─── Three weakest levers ─────────────────────────────────────────────────────

export interface WeakestLeverInfo {
  id: string
  name: string
  score: number | null
  gapToL5: number | null
}

export function getThreeWeakestLevers(capabilityKey: CapKey, picks: AllPicks): WeakestLeverInfo[] {
  const cap = getCapability(capabilityKey)
  if (!cap) return []

  if (cap.type === 'measurement') {
    const mCap = cap as MeasurementCapability
    const rows = mCap.levers.map((l) => {
      const score = picks.measurement[l.id] ?? null
      return { id: l.id, name: l.name, score, gapToL5: score !== null ? 5 - score : null }
    })
    return [...rows.filter((r) => r.score !== null).sort((a, b) => a.score! - b.score!),
            ...rows.filter((r) => r.score === null)].slice(0, 3)
  }

  const aCap = cap as ActionCapability
  const capPicks = picks[capabilityKey as ActionCapKey]
  const rows = aCap.levers.map((l) => {
    const score = getLeverAvg(capPicks[l.id] ?? {})
    return { id: l.id, name: l.name, score, gapToL5: score !== null ? 5 - score : null }
  })
  return [...rows.filter((r) => r.score !== null).sort((a, b) => a.score! - b.score!),
          ...rows.filter((r) => r.score === null)].slice(0, 3)
}

// ─── Theme lever avgs (for Pattern E) ────────────────────────────────────────

export function getThemeLeverAvg(
  capabilityKey: ActionCapKey,
  theme: string,
  capPicks: Record<string, Record<string, number | null>>,
): number | null {
  const cap = getCapability(capabilityKey) as ActionCapability
  const themeLevers = cap.levers.filter((l) => l.theme === theme)
  return simpleMean(themeLevers.map((l) => getLeverAvg(capPicks[l.id] ?? {})))
}
