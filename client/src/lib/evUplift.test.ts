import { describe, it, expect } from 'vitest'
import { computeEVUplift, getTier, formatEVUplift } from './evUplift'

describe('getTier', () => {
  it('returns Declining for NRR < 90%', () => {
    expect(getTier(0.88).label).toBe('Declining')
    expect(getTier(0.88).multiplier).toBe(0.30)
    expect(getTier(0.00).label).toBe('Declining')
  })

  it('returns Eroding for 90% <= NRR < 100%', () => {
    expect(getTier(0.90).label).toBe('Eroding')
    expect(getTier(0.95).multiplier).toBe(0.50)
    expect(getTier(0.999).label).toBe('Eroding')
  })

  it('returns Net positive for 100% <= NRR < 110%', () => {
    expect(getTier(1.00).label).toBe('Net positive')
    expect(getTier(1.08).multiplier).toBe(0.75)
  })

  it('returns Strong for 110% <= NRR < 120%', () => {
    expect(getTier(1.10).label).toBe('Strong')
    expect(getTier(1.15).multiplier).toBe(1.00)
  })

  it('returns World-class for NRR >= 120%', () => {
    expect(getTier(1.20).label).toBe('World-class')
    expect(getTier(1.35).multiplier).toBe(1.25)
  })
})

describe('formatEVUplift', () => {
  it('formats millions with 1 decimal when needed', () => {
    expect(formatEVUplift(18_000_000)).toBe('+$18M')
    expect(formatEVUplift(1_200_000)).toBe('+$1.2M')
    expect(formatEVUplift(21_600_000)).toBe('+$21.6M')
    expect(formatEVUplift(108_000_000)).toBe('+$108M')
  })

  it('formats hundreds of thousands as K with no decimal', () => {
    expect(formatEVUplift(120_000)).toBe('+$120K')
    expect(formatEVUplift(500_000)).toBe('+$500K')
  })

  it('formats values under $100K as full dollar amount', () => {
    expect(formatEVUplift(50_000)).toBe('+$50,000')
  })
})

describe('computeEVUplift', () => {
  it('Test 1: $1M MRR, 108% NRR → Net positive tier, 3 relative scenarios', () => {
    const result = computeEVUplift(1_000_000, 1.08)
    expect(result).not.toBeNull()
    expect(result!.arrBase).toBe(12_000_000)
    expect(result!.multiplier).toBe(0.75)
    expect(result!.evPerPP).toBe(9_000_000)
    expect(result!.topOfMarketMessage).toBeNull()
    expect(result!.scenarios).toHaveLength(3)

    const [s1, s2, s3] = result!.scenarios
    // relative targets: 1.08 + 0.05/0.10/0.20
    expect(s1!.targetNRR).toBeCloseTo(1.13)
    expect(s1!.ppDelta).toBe(5)
    expect(s1!.evUplift).toBe(45_000_000)
    expect(s1!.ppCapped).toBe(false)
    expect(s1!.label).toBe('Move to Strong')

    expect(s2!.targetNRR).toBeCloseTo(1.18)
    expect(s2!.ppDelta).toBe(10)
    expect(s2!.evUplift).toBe(90_000_000)
    expect(s2!.label).toBe('Mid-Strong')

    expect(s3!.targetNRR).toBeCloseTo(1.28)
    expect(s3!.ppDelta).toBe(20)
    expect(s3!.evUplift).toBe(180_000_000)
    expect(s3!.ppCapped).toBe(false)
    expect(s3!.label).toBe('Reach World-class')
  })

  it('Test 2: $1M MRR, 88% NRR → Declining tier, 3rd scenario capped at 30pp', () => {
    const result = computeEVUplift(1_000_000, 0.88)
    expect(result).not.toBeNull()
    expect(result!.arrBase).toBe(12_000_000)
    expect(result!.multiplier).toBe(0.30)
    expect(result!.evPerPP).toBe(3_600_000)
    expect(result!.scenarios).toHaveLength(3)

    const [s1, s2, s3] = result!.scenarios
    expect(s1!.ppDelta).toBe(12)
    expect(s1!.evUplift).toBe(43_200_000)
    expect(s1!.ppCapped).toBe(false)

    expect(s2!.ppDelta).toBe(22)
    expect(s2!.evUplift).toBe(79_200_000)
    expect(s2!.ppCapped).toBe(false)

    // 120% target: raw 32pp → capped to 30
    expect(s3!.ppDelta).toBe(30)
    expect(s3!.evUplift).toBe(108_000_000)
    expect(s3!.ppCapped).toBe(true)
    expect(s3!.label).toBe('Reach World-class')
  })

  it('Test 3: $1M MRR, 125% NRR → lower World-class, only 2 scenarios', () => {
    const result = computeEVUplift(1_000_000, 1.25)
    expect(result).not.toBeNull()
    expect(result!.topOfMarketMessage).toBeNull()
    expect(result!.scenarios).toHaveLength(2)
    expect(result!.scenarios[0]!.label).toBe('Top decile — elite')
    expect(result!.scenarios[1]!.label).toBe('Best-in-class')
  })

  it('Test 4: $1M MRR, 135% NRR → top of market, single maintain scenario', () => {
    const result = computeEVUplift(1_000_000, 1.35)
    expect(result).not.toBeNull()
    expect(result!.topOfMarketMessage).toBeTruthy()
    expect(result!.scenarios).toHaveLength(1)

    const maintain = result!.scenarios[0]!
    expect(maintain.label).toBe('Maintain through 2x scale')
    expect(maintain.ppDelta).toBe(0)
    // arrBase * 2 * multiplier = $12M * 2 * 1.25 = $30M
    expect(maintain.evUplift).toBe(30_000_000)
    expect(maintain.ppCapped).toBe(false)
  })

  it('Test 5: edge cases return null', () => {
    expect(computeEVUplift(null, 1.08)).toBeNull()
    expect(computeEVUplift(1_000_000, null)).toBeNull()
    expect(computeEVUplift(null, null)).toBeNull()
    expect(computeEVUplift(0, 1.08)).toBeNull()
    expect(computeEVUplift(-1, 1.08)).toBeNull()
    expect(computeEVUplift(700_000, 1.08)).toBeNull()
    expect(computeEVUplift(799_999, 1.08)).toBeNull()
  })

  it('$800K MRR boundary → valid result (arrBase $9.6M, evPerPP $7.2M)', () => {
    const result = computeEVUplift(800_000, 1.08)
    expect(result).not.toBeNull()
    expect(result!.arrBase).toBe(9_600_000)
    expect(result!.multiplier).toBe(0.75)
    expect(result!.evPerPP).toBe(7_200_000)
    expect(result!.scenarios).toHaveLength(3)

    const [s1, s2, s3] = result!.scenarios
    expect(s1!.ppDelta).toBe(5)
    expect(s1!.evUplift).toBe(36_000_000)
    expect(s2!.ppDelta).toBe(10)
    expect(s2!.evUplift).toBe(72_000_000)
    expect(s3!.ppDelta).toBe(20)
    expect(s3!.evUplift).toBe(144_000_000)
  })

  it('$1M MRR, exactly 100% NRR → Net positive tier, 3 relative scenarios', () => {
    const result = computeEVUplift(1_000_000, 1.00)
    expect(result).not.toBeNull()
    expect(result!.multiplier).toBe(0.75)
    expect(result!.evPerPP).toBe(9_000_000)
    expect(result!.scenarios).toHaveLength(3)

    const [s1, s2, s3] = result!.scenarios
    // relative: 1.00 + 0.05/0.10/0.20
    expect(s1!.targetNRR).toBeCloseTo(1.05)
    expect(s1!.ppDelta).toBe(5)
    expect(s1!.evUplift).toBe(45_000_000)
    expect(s1!.label).toBe('Move to Strong')

    expect(s2!.targetNRR).toBeCloseTo(1.10)
    expect(s2!.ppDelta).toBe(10)
    expect(s2!.evUplift).toBe(90_000_000)
    expect(s2!.label).toBe('Mid-Strong')

    expect(s3!.targetNRR).toBeCloseTo(1.20)
    expect(s3!.ppDelta).toBe(20)
    expect(s3!.evUplift).toBe(180_000_000)
    expect(s3!.label).toBe('Reach World-class')
  })

  it('Eroding band: 95% NRR shows 3 scenarios toward Net positive, Strong, World-class', () => {
    const result = computeEVUplift(1_000_000, 0.95)
    expect(result!.multiplier).toBe(0.50)
    expect(result!.scenarios).toHaveLength(3)
    expect(result!.scenarios[0]!.label).toBe('Cross into Net positive')
    expect(result!.scenarios[0]!.ppDelta).toBe(5)
  })

  it('Strong band: 115% NRR shows 3 scenarios toward World-class and beyond', () => {
    const result = computeEVUplift(1_000_000, 1.15)
    expect(result!.multiplier).toBe(1.00)
    expect(result!.scenarios).toHaveLength(3)
    expect(result!.scenarios[0]!.label).toBe('Reach World-class')
    expect(result!.scenarios[0]!.ppDelta).toBe(5)
  })

  it('exactly 130% NRR triggers top-of-market path', () => {
    const result = computeEVUplift(1_000_000, 1.30)
    expect(result!.topOfMarketMessage).toBeTruthy()
    expect(result!.scenarios).toHaveLength(1)
  })
})
