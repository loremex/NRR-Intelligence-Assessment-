import { describe, it, expect } from 'vitest'
import {
  getCellScore,
  getCapabilityScore,
  getOverallMaturity,
  getOverallIntelligence,
  getDistanceToL5,
  getWeakestCells,
  getCapabilityOverall,
  scoreToColor,
  type AllPicks,
} from './scoring'

function emptyPicks(): AllPicks {
  return { reporting: {}, retention: {}, expansion: {}, pricing: {} }
}

function allScenario(idx: number): AllPicks {
  const cap: Record<string, number | null> = { q1: idx, q2: idx, q3: idx }
  return {
    reporting: { ...cap },
    retention: { ...cap },
    expansion: { ...cap },
    pricing: { ...cap },
  }
}

// ─── Cell scoring ─────────────────────────────────────────────────────────────

describe('getCellScore', () => {
  it('converts scenarioIndex 0 to score 1', () => {
    const picks: AllPicks = { ...emptyPicks(), reporting: { q1: 0 } }
    expect(getCellScore('reporting', 'q1', picks)).toBe(1)
  })
  it('converts scenarioIndex 4 to score 5', () => {
    const picks: AllPicks = { ...emptyPicks(), pricing: { q3: 4 } }
    expect(getCellScore('pricing', 'q3', picks)).toBe(5)
  })
  it('returns null for missing pick', () => {
    expect(getCellScore('retention', 'q1', emptyPicks())).toBeNull()
  })
})

// ─── Capability scoring ───────────────────────────────────────────────────────

describe('getCapabilityScore', () => {
  it('mean of 3 question scores', () => {
    const picks: AllPicks = { ...emptyPicks(), retention: { q1: 1, q2: 2, q3: 3 } }
    // scores: 2, 3, 4 → mean = 3.0
    expect(getCapabilityScore('retention', picks)).toBeCloseTo(3.0, 4)
  })
  it('returns null when no picks', () => {
    expect(getCapabilityScore('expansion', emptyPicks())).toBeNull()
  })
  it('skips null picks in mean', () => {
    const picks: AllPicks = { ...emptyPicks(), pricing: { q1: 0, q2: 4 } }
    // scores: 1, 5 → mean = 3.0 (q3 is null, skipped)
    expect(getCapabilityScore('pricing', picks)).toBeCloseTo(3.0, 4)
  })
})

// ─── All L5 (scenario index 4) ────────────────────────────────────────────────

describe('All L5', () => {
  const picks = allScenario(4)

  it('each capability scores 5.0', () => {
    expect(getCapabilityScore('reporting', picks)).toBeCloseTo(5.0, 4)
    expect(getCapabilityScore('retention', picks)).toBeCloseTo(5.0, 4)
    expect(getCapabilityScore('expansion', picks)).toBeCloseTo(5.0, 4)
    expect(getCapabilityScore('pricing', picks)).toBeCloseTo(5.0, 4)
  })

  it('overall maturity = 5.0', () => {
    expect(getOverallMaturity(['reporting', 'retention', 'expansion', 'pricing'], picks)).toBeCloseTo(5.0, 4)
  })

  it('distance to L5 = 0', () => {
    expect(getDistanceToL5(5.0)).toBeCloseTo(0, 4)
  })
})

// ─── All L1 (scenario index 0) ────────────────────────────────────────────────

describe('All L1', () => {
  const picks = allScenario(0)

  it('each capability scores 1.0', () => {
    expect(getCapabilityScore('reporting', picks)).toBeCloseTo(1.0, 4)
    expect(getCapabilityScore('retention', picks)).toBeCloseTo(1.0, 4)
  })

  it('overall maturity = 1.0', () => {
    expect(getOverallMaturity(['reporting', 'retention', 'expansion', 'pricing'], picks)).toBeCloseTo(1.0, 4)
  })

  it('distance to L5 = 4.0', () => {
    expect(getDistanceToL5(1.0)).toBeCloseTo(4.0, 4)
  })
})

// ─── Mixed reference case ─────────────────────────────────────────────────────

describe('Mixed reference case', () => {
  it('overall = mean of 4 cap scores', () => {
    // reporting: q1=1,q2=2,q3=2 → scores 2,3,3 → cap=2.667
    // retention: q1=3,q2=3,q3=4 → scores 4,4,5 → cap=4.333
    // expansion: q1=0,q2=1,q3=2 → scores 1,2,3 → cap=2.0
    // pricing:   q1=2,q2=2,q3=2 → scores 3,3,3 → cap=3.0
    // overall = mean(2.667, 4.333, 2.0, 3.0) = 12.0/4 = 3.0
    const picks: AllPicks = {
      reporting: { q1: 1, q2: 2, q3: 2 },
      retention: { q1: 3, q2: 3, q3: 4 },
      expansion: { q1: 0, q2: 1, q3: 2 },
      pricing:   { q1: 2, q2: 2, q3: 2 },
    }
    expect(getOverallMaturity(['reporting', 'retention', 'expansion', 'pricing'], picks)).toBeCloseTo(3.0, 3)
  })

  it('partial selection — 2 caps', () => {
    const picks: AllPicks = {
      ...emptyPicks(),
      reporting: { q1: 1, q2: 1, q3: 1 }, // scores 2,2,2 → cap=2.0
      retention: { q1: 3, q2: 3, q3: 3 }, // scores 4,4,4 → cap=4.0
    }
    expect(getOverallMaturity(['reporting', 'retention'], picks)).toBeCloseTo(3.0, 4)
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('0 caps → null', () => {
    expect(getOverallMaturity([], allScenario(3))).toBeNull()
  })

  it('getCapabilityOverall alias works', () => {
    const picks: AllPicks = { ...emptyPicks(), pricing: { q1: 2, q2: 2, q3: 2 } }
    expect(getCapabilityOverall('pricing', picks)).toBeCloseTo(3.0, 4)
  })

  it('getOverallIntelligence alias works', () => {
    const picks = allScenario(2) // all scenario 2 → score 3
    expect(getOverallIntelligence(['retention'], picks)).toBeCloseTo(3.0, 4)
  })

  it('getWeakestCells sorts by score ascending', () => {
    const picks: AllPicks = {
      ...emptyPicks(),
      retention: { q1: 4, q2: 0, q3: 2 }, // scores: 5, 1, 3
    }
    const cells = getWeakestCells(['retention'], picks)
    expect(cells.length).toBe(3)
    expect(cells[0].score).toBe(1)
    expect(cells[1].score).toBe(3)
    expect(cells[2].score).toBe(5)
  })

  it('scoreToColor maps correctly', () => {
    expect(scoreToColor(null)).toBe('#F1F5F9')
    expect(scoreToColor(1.0)).toBe('#FECACA')
    expect(scoreToColor(1.5)).toBe('#FED7AA')
    expect(scoreToColor(3.0)).toBe('#BFDBFE')
    expect(scoreToColor(4.0)).toBe('#A7F3D0')
    expect(scoreToColor(4.5)).toBe('#6EE7B7')
  })
})
