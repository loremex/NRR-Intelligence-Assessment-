import { describe, it, expect } from 'vitest'
import {
  getLeverAvg,
  getActionDimAvg,
  getActionCapabilityOverall,
  getMeasurementOverall,
  getCapabilityOverall,
  getOverallIntelligence,
  getDistanceToL5,
  getCrossCapDimAvg,
  getThreeWeakestLevers,
  scoreToColor,
  type AllPicks,
} from './scoring'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build AllPicks for a single action cap with explicit [People, Process, Tech, Data] per lever */
function makeActionPicks(
  capKey: 'retention' | 'expansion' | 'pricing',
  scores: Array<[number | null, number | null, number | null, number | null]>,
): AllPicks {
  const leverIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
  const dims = ['People', 'Process', 'Technology', 'Data']
  const capPicks: Record<string, Record<string, number | null>> = {}
  leverIds.forEach((id, i) => {
    capPicks[id] = {
      People: scores[i]?.[0] ?? null,
      Process: scores[i]?.[1] ?? null,
      Technology: scores[i]?.[2] ?? null,
      Data: scores[i]?.[3] ?? null,
    }
    void dims
  })
  return { measurement: {}, retention: {}, expansion: {}, pricing: {}, [capKey]: capPicks }
}

function makeAllL(level: number): AllPicks {
  const dims = ['People', 'Process', 'Technology', 'Data']
  const leverIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
  const mIds = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

  const actionCap: Record<string, Record<string, number | null>> = {}
  leverIds.forEach((id) => {
    actionCap[id] = Object.fromEntries(dims.map((d) => [d, level]))
  })

  const mPicks: Record<string, number | null> = {}
  mIds.forEach((id) => { mPicks[id] = level })

  return {
    measurement: mPicks,
    retention: structuredClone(actionCap),
    expansion: structuredClone(actionCap),
    pricing: structuredClone(actionCap),
  }
}

// ─── Test 1: Retention reference case ─────────────────────────────────────────

describe('Test 1 — Retention rollup', () => {
  const scores: Array<[number, number, number, number]> = [
    [3, 3, 2, 2], // L1
    [3, 3, 2, 2], // L2
    [3, 3, 3, 2], // L3
    [3, 3, 2, 2], // L4
    [4, 4, 3, 3], // L5
    [3, 3, 3, 3], // L6
    [3, 3, 3, 3], // L7
  ]
  const picks = makeActionPicks('retention', scores)
  const capPicks = picks.retention

  it('computes lever averages correctly', () => {
    expect(getLeverAvg(capPicks['L1'])).toBeCloseTo(2.5, 4)
    expect(getLeverAvg(capPicks['L2'])).toBeCloseTo(2.5, 4)
    expect(getLeverAvg(capPicks['L3'])).toBeCloseTo(2.75, 4)
    expect(getLeverAvg(capPicks['L4'])).toBeCloseTo(2.5, 4)
    expect(getLeverAvg(capPicks['L5'])).toBeCloseTo(3.5, 4)
    expect(getLeverAvg(capPicks['L6'])).toBeCloseTo(3.0, 4)
    expect(getLeverAvg(capPicks['L7'])).toBeCloseTo(3.0, 4)
  })

  it('Capability Overall = 2.84', () => {
    expect(getActionCapabilityOverall('retention', capPicks)).toBeCloseTo(2.84, 2)
  })

  it('Dim Avg People = 3.15', () => {
    expect(getActionDimAvg('retention', 'People', capPicks)).toBeCloseTo(3.15, 2)
  })

  it('Dim Avg Process = 3.15', () => {
    expect(getActionDimAvg('retention', 'Process', capPicks)).toBeCloseTo(3.15, 2)
  })

  it('Dim Avg Technology = 2.58', () => {
    expect(getActionDimAvg('retention', 'Technology', capPicks)).toBeCloseTo(2.58, 2)
  })

  it('Dim Avg Data = 2.48', () => {
    expect(getActionDimAvg('retention', 'Data', capPicks)).toBeCloseTo(2.48, 2)
  })
})

// ─── Test 2: Measurement reference case ───────────────────────────────────────

describe('Test 2 — Measurement rollup', () => {
  it('Capability Overall = 2.02', () => {
    const mPicks = { M1: 2, M2: 3, M3: 2, M4: 1, M5: 3, M6: 2, M7: 1 }
    expect(getMeasurementOverall(mPicks)).toBeCloseTo(2.02, 2)
  })
})

// ─── Test 3: All L5 ───────────────────────────────────────────────────────────

describe('Test 3 — All L5', () => {
  const picks = makeAllL(5)

  it('Retention Overall = 5.0', () => {
    expect(getActionCapabilityOverall('retention', picks.retention)).toBeCloseTo(5.0, 4)
  })

  it('Measurement Overall = 5.0', () => {
    expect(getMeasurementOverall(picks.measurement)).toBeCloseTo(5.0, 4)
  })

  it('Overall Intelligence = 5.0', () => {
    expect(getOverallIntelligence(['retention', 'expansion', 'pricing'], picks)).toBeCloseTo(5.0, 4)
  })

  it('Distance to L5 = 0', () => {
    expect(getDistanceToL5(5.0)).toBeCloseTo(0, 4)
  })

  it('All dim avgs = 5.0', () => {
    expect(getActionDimAvg('retention', 'People', picks.retention)).toBeCloseTo(5.0, 4)
    expect(getActionDimAvg('retention', 'Data', picks.retention)).toBeCloseTo(5.0, 4)
  })

  it('Cross-cap dim avg = 5.0', () => {
    expect(getCrossCapDimAvg(['retention', 'expansion'], 'People', picks)).toBeCloseTo(5.0, 4)
  })
})

// ─── Test 4: All L1 ───────────────────────────────────────────────────────────

describe('Test 4 — All L1', () => {
  const picks = makeAllL(1)

  it('Retention Overall = 1.0', () => {
    expect(getActionCapabilityOverall('retention', picks.retention)).toBeCloseTo(1.0, 4)
  })

  it('Measurement Overall = 1.0', () => {
    expect(getMeasurementOverall(picks.measurement)).toBeCloseTo(1.0, 4)
  })

  it('Overall Intelligence = 1.0', () => {
    expect(getOverallIntelligence(['retention', 'expansion', 'pricing'], picks)).toBeCloseTo(1.0, 4)
  })

  it('Distance to L5 = 4', () => {
    expect(getDistanceToL5(1.0)).toBeCloseTo(4.0, 4)
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('returns null for blank action cap picks', () => {
    const picks: AllPicks = {
      measurement: {}, retention: {}, expansion: {}, pricing: {},
    }
    expect(getActionCapabilityOverall('retention', picks.retention)).toBeNull()
    expect(getLeverAvg({})).toBeNull()
  })

  it('returns null for blank measurement picks', () => {
    expect(getMeasurementOverall({})).toBeNull()
  })

  it('0 action caps → Overall Intelligence null', () => {
    const picks = makeAllL(3)
    expect(getOverallIntelligence([], picks)).toBeNull()
  })

  it('1 action cap → Overall Intelligence = that cap only', () => {
    const picks = makeActionPicks('retention', [
      [3, 3, 2, 2], [3, 3, 2, 2], [3, 3, 3, 2], [3, 3, 2, 2],
      [4, 4, 3, 3], [3, 3, 3, 3], [3, 3, 3, 3],
    ])
    const capOverall = getActionCapabilityOverall('retention', picks.retention)
    const oi = getOverallIntelligence(['retention'], picks)
    expect(oi).toBeCloseTo(capOverall!, 4)
  })

  it('getCrossCapDimAvg returns null for <2 caps', () => {
    const picks = makeAllL(3)
    expect(getCrossCapDimAvg(['retention'], 'People', picks)).toBeNull()
  })

  it('getCapabilityOverall dispatches to measurement for measurement key', () => {
    const picks: AllPicks = { measurement: { M1: 2, M2: 3, M3: 2, M4: 1, M5: 3, M6: 2, M7: 1 }, retention: {}, expansion: {}, pricing: {} }
    expect(getCapabilityOverall('measurement', picks)).toBeCloseTo(2.02, 2)
  })

  it('getLeverAvg skips null dims', () => {
    expect(getLeverAvg({ People: 4, Process: null, Technology: 2, Data: null })).toBeCloseTo(3.0, 4)
  })

  it('scoreToColor maps score ranges correctly', () => {
    expect(scoreToColor(null)).toBe('#F1F5F9')
    expect(scoreToColor(1.0)).toBe('#FECACA')
    expect(scoreToColor(1.5)).toBe('#FED7AA')
    expect(scoreToColor(2.84)).toBe('#BFDBFE')
    expect(scoreToColor(4.0)).toBe('#A7F3D0')
    expect(scoreToColor(4.5)).toBe('#6EE7B7')
  })

  it('getThreeWeakestLevers returns sorted ascending', () => {
    const picks = makeActionPicks('retention', [
      [5, 5, 5, 5], // L1 avg 5
      [1, 1, 1, 1], // L2 avg 1
      [2, 2, 2, 2], // L3 avg 2
      [3, 3, 3, 3], // L4 avg 3
      [4, 4, 4, 4], // L5 avg 4
      [1, 1, 1, 1], // L6 avg 1 (tie with L2 → L2 first since it was encountered first)
      [2, 2, 2, 2], // L7 avg 2
    ])
    const weakest = getThreeWeakestLevers('retention', picks)
    expect(weakest).toHaveLength(3)
    expect(weakest[0].score).toBeLessThanOrEqual(weakest[1].score!)
    expect(weakest[1].score).toBeLessThanOrEqual(weakest[2].score!)
  })
})
