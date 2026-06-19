import { describe, it, expect } from 'vitest'
import {
  getMeasurementOverall,
  getCapabilityOverall,
  getOverallIntelligence,
  getDistanceToL5,
  getV2CapabilityOverall,
  getV2OverallMaturity,
  getV2WeakestCells,
  getV2CellScore,
  scoreToColor,
  type AllPicks,
} from './scoring'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeV2Picks(
  capKey: 'retention' | 'expansion' | 'pricing',
  scenarioIndices: Partial<Record<'impact'|'whitespace'|'accountability'|'playbook'|'execution'|'governance', number | null>>,
): AllPicks {
  return { measurement: {}, retention: {}, expansion: {}, pricing: {}, [capKey]: scenarioIndices }
}

function makeAllScenario(scenarioIndex: number): AllPicks {
  const cap: Record<string, number | null> = {}
  for (const lever of ['impact', 'whitespace', 'accountability', 'playbook', 'execution', 'governance']) {
    cap[lever] = scenarioIndex
  }
  const mIds = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']
  const mPicks: Record<string, number | null> = {}
  mIds.forEach((id) => { mPicks[id] = scenarioIndex + 1 })
  return {
    measurement: mPicks,
    retention: { ...cap },
    expansion: { ...cap },
    pricing: { ...cap },
  }
}

// ─── Test 2: Measurement reference case (UNCHANGED) ───────────────────────────

describe('Test 2 — Measurement rollup', () => {
  it('Capability Overall = 2.02', () => {
    const mPicks = { M1: 2, M2: 3, M3: 2, M4: 1, M5: 3, M6: 2, M7: 1 }
    expect(getMeasurementOverall(mPicks)).toBeCloseTo(2.02, 2)
  })
})

// ─── Test 3: All scenario 4 (L5) ──────────────────────────────────────────────

describe('Test 3 — All L5 (scenario index 4)', () => {
  const picks = makeAllScenario(4)

  it('Retention capability overall = 5.0', () => {
    expect(getV2CapabilityOverall('retention', picks)).toBeCloseTo(5.0, 4)
  })

  it('Overall intelligence = 5.0', () => {
    expect(getV2OverallMaturity(['retention', 'expansion', 'pricing'], picks)).toBeCloseTo(5.0, 4)
  })

  it('Distance to L5 = 0', () => {
    expect(getDistanceToL5(5.0)).toBeCloseTo(0, 4)
  })
})

// ─── Test 4: All scenario 0 (L1) ──────────────────────────────────────────────

describe('Test 4 — All L1 (scenario index 0)', () => {
  const picks = makeAllScenario(0)

  it('Retention capability overall = 1.0', () => {
    expect(getV2CapabilityOverall('retention', picks)).toBeCloseTo(1.0, 4)
  })

  it('Overall intelligence = 1.0', () => {
    expect(getV2OverallMaturity(['retention', 'expansion', 'pricing'], picks)).toBeCloseTo(1.0, 4)
  })

  it('Distance to L5 = 4', () => {
    expect(getDistanceToL5(1.0)).toBeCloseTo(4.0, 4)
  })
})

// ─── V2 reference case ────────────────────────────────────────────────────────

describe('V2 reference case — mixed scores', () => {
  it('capability score = mean of 6 lever scores', () => {
    const picks = makeV2Picks('retention', {
      impact: 2,        // L3
      whitespace: 1,    // L2
      accountability: 3, // L4
      playbook: 2,      // L3
      execution: 3,     // L4
      governance: 2,    // L3
    })
    // cell scores: 3, 2, 4, 3, 4, 3 → mean = 19/6 ≈ 3.1667
    expect(getV2CapabilityOverall('retention', picks)).toBeCloseTo(19 / 6, 3)
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('returns null for blank action cap picks', () => {
    const picks: AllPicks = { measurement: {}, retention: {}, expansion: {}, pricing: {} }
    expect(getV2CapabilityOverall('retention', picks)).toBeNull()
    expect(getV2CellScore('retention', 'impact', picks)).toBeNull()
  })

  it('returns null for blank measurement picks', () => {
    expect(getMeasurementOverall({})).toBeNull()
  })

  it('0 action caps → Overall Intelligence null', () => {
    const picks = makeAllScenario(3)
    expect(getV2OverallMaturity([], picks)).toBeNull()
  })

  it('getCapabilityOverall dispatches to measurement for measurement key', () => {
    const picks: AllPicks = { measurement: { M1: 2, M2: 3, M3: 2, M4: 1, M5: 3, M6: 2, M7: 1 }, retention: {}, expansion: {}, pricing: {} }
    expect(getCapabilityOverall('measurement', picks)).toBeCloseTo(2.02, 2)
  })

  it('getV2WeakestCells returns sorted ascending by score', () => {
    const picks: AllPicks = {
      measurement: {},
      retention: { impact: 4, whitespace: 0, accountability: 2, playbook: 1, execution: 3, governance: 2 },
      expansion: {},
      pricing: {},
    }
    const cells = getV2WeakestCells(['retention'], picks)
    expect(cells.length).toBeGreaterThan(0)
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i - 1].score).toBeLessThanOrEqual(cells[i].score)
    }
  })

  it('scoreToColor maps score ranges correctly', () => {
    expect(scoreToColor(null)).toBe('#F1F5F9')
    expect(scoreToColor(1.0)).toBe('#FECACA')
    expect(scoreToColor(1.5)).toBe('#FED7AA')
    expect(scoreToColor(2.84)).toBe('#BFDBFE')
    expect(scoreToColor(4.0)).toBe('#A7F3D0')
    expect(scoreToColor(4.5)).toBe('#6EE7B7')
  })

  it('getOverallIntelligence returns null for 0 action caps', () => {
    const picks = makeAllScenario(3)
    expect(getOverallIntelligence([], picks)).toBeNull()
  })
})
