import { describe, it, expect } from 'vitest'
import { computeNRR, formatPercent } from './nrr'

describe('computeNRR', () => {
  it('reference: expansion 18%, contraction 4%, churn 6% → NRR 108%, GRR 90%, netMovement +0.08, band Net positive', () => {
    const result = computeNRR({ expansionPct: 18, contractionPct: 4, churnPct: 6 })
    expect(result.nrr).toBeCloseTo(1.08)
    expect(result.grr).toBeCloseTo(0.90)
    expect(result.netMovement).toBeCloseTo(0.08)
    expect(result.band?.label).toBe('Net positive')
  })

  it('all nulls → all nulls', () => {
    const result = computeNRR({ expansionPct: null, contractionPct: null, churnPct: null })
    expect(result.nrr).toBeNull()
    expect(result.grr).toBeNull()
    expect(result.netMovement).toBeNull()
    expect(result.band).toBeNull()
  })

  it('all zeros → NRR 100%, GRR 100%, netMovement 0, band Net positive', () => {
    const result = computeNRR({ expansionPct: 0, contractionPct: 0, churnPct: 0 })
    expect(result.nrr).toBeCloseTo(1.0)
    expect(result.grr).toBeCloseTo(1.0)
    expect(result.netMovement).toBeCloseTo(0)
    expect(result.band?.label).toBe('Net positive')
  })

  it('null pct fields default to 0 for partial entry', () => {
    const result = computeNRR({ expansionPct: 18, contractionPct: null, churnPct: null })
    expect(result.nrr).toBeCloseTo(1.18)
    expect(result.grr).toBeCloseTo(1.0)
    expect(result.netMovement).toBeCloseTo(0.18)
    expect(result.band?.label).toBe('Strong')  // 118% is Strong (≥115%), not World-class (≥125%)
  })

  it('high churn → NRR below zero → Declining band', () => {
    const result = computeNRR({ expansionPct: 0, contractionPct: 0, churnPct: 200 })
    expect(result.nrr).toBeLessThan(0)
    expect(result.band?.label).toBe('Declining')
  })

  it('startingMRR is ignored in computation', () => {
    const withMRR = computeNRR({ startingMRR: 1_000_000, expansionPct: 18, contractionPct: 4, churnPct: 6 })
    const withoutMRR = computeNRR({ expansionPct: 18, contractionPct: 4, churnPct: 6 })
    expect(withMRR.nrr).toBeCloseTo(withoutMRR.nrr!)
    expect(withMRR.grr).toBeCloseTo(withoutMRR.grr!)
    expect(withMRR.netMovement).toBeCloseTo(withoutMRR.netMovement!)
  })

  describe('band thresholds', () => {
    it('expansion 25% → NRR 125% → World-class', () => {
      const result = computeNRR({ expansionPct: 25, contractionPct: 0, churnPct: 0 })
      expect(result.band?.label).toBe('World-class')
    })

    it('expansion 15% → NRR 115% → Strong', () => {
      const result = computeNRR({ expansionPct: 15, contractionPct: 0, churnPct: 0 })
      expect(result.band?.label).toBe('Strong')
    })

    it('expansion 5% → NRR 105% → Net positive', () => {
      const result = computeNRR({ expansionPct: 5, contractionPct: 0, churnPct: 0 })
      expect(result.band?.label).toBe('Net positive')
    })

    it('contraction 3% + churn 2% → NRR 95% → Eroding', () => {
      const result = computeNRR({ expansionPct: 0, contractionPct: 3, churnPct: 2 })
      expect(result.band?.label).toBe('Eroding')
    })

    it('contraction 5% + churn 10% → NRR 85% → Declining', () => {
      const result = computeNRR({ expansionPct: 0, contractionPct: 5, churnPct: 10 })
      expect(result.band?.label).toBe('Declining')
    })
  })
})

describe('formatPercent', () => {
  it('formats 1.08 as 108.0%', () => {
    expect(formatPercent(1.08)).toBe('108.0%')
  })

  it('formats 0.9 as 90.0%', () => {
    expect(formatPercent(0.9)).toBe('90.0%')
  })

  it('formats 1.0 as 100.0%', () => {
    expect(formatPercent(1.0)).toBe('100.0%')
  })
})
