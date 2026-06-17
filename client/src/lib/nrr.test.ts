import { describe, it, expect } from 'vitest'
import { computeNRR, formatCurrency, formatPercent } from './nrr'

describe('computeNRR', () => {
  it('reference case: $1M / $180k expansion / $40k contraction / $60k churn → NRR 108%, GRR 90%, Net +$80k, band Net positive', () => {
    const result = computeNRR({
      startingMRR: 1_000_000,
      expansionMRR: 180_000,
      contractionMRR: 40_000,
      churnMRR: 60_000,
    })
    expect(result.nrr).toBeCloseTo(1.08)
    expect(result.grr).toBeCloseTo(0.9)
    expect(result.netMovement).toBe(80_000)
    expect(result.band?.label).toBe('Net positive')
  })

  it('startingMRR = 0 → all nulls', () => {
    const result = computeNRR({ startingMRR: 0, expansionMRR: 100, contractionMRR: 0, churnMRR: 0 })
    expect(result.nrr).toBeNull()
    expect(result.grr).toBeNull()
    expect(result.netMovement).toBeNull()
    expect(result.band).toBeNull()
  })

  it('startingMRR = null → all nulls', () => {
    const result = computeNRR({ startingMRR: null, expansionMRR: null, contractionMRR: null, churnMRR: null })
    expect(result.nrr).toBeNull()
    expect(result.grr).toBeNull()
    expect(result.netMovement).toBeNull()
    expect(result.band).toBeNull()
  })

  it('only startingMRR set, others null → NRR 100%, GRR 100%, Net $0, band Net positive', () => {
    const result = computeNRR({
      startingMRR: 500_000,
      expansionMRR: null,
      contractionMRR: null,
      churnMRR: null,
    })
    expect(result.nrr).toBeCloseTo(1.0)
    expect(result.grr).toBeCloseTo(1.0)
    expect(result.netMovement).toBe(0)
    expect(result.band?.label).toBe('Net positive')
  })

  it('huge churn → negative NRR → still resolves to Declining band', () => {
    const result = computeNRR({
      startingMRR: 100_000,
      expansionMRR: 0,
      contractionMRR: 0,
      churnMRR: 200_000,
    })
    expect(result.nrr).toBeLessThan(0)
    expect(result.band?.label).toBe('Declining')
  })

  describe('band thresholds', () => {
    it('125% → World-class', () => {
      const result = computeNRR({ startingMRR: 100, expansionMRR: 25, contractionMRR: 0, churnMRR: 0 })
      expect(result.band?.label).toBe('World-class')
    })

    it('115% → Strong', () => {
      const result = computeNRR({ startingMRR: 100, expansionMRR: 15, contractionMRR: 0, churnMRR: 0 })
      expect(result.band?.label).toBe('Strong')
    })

    it('105% → Net positive', () => {
      const result = computeNRR({ startingMRR: 100, expansionMRR: 5, contractionMRR: 0, churnMRR: 0 })
      expect(result.band?.label).toBe('Net positive')
    })

    it('95% → Eroding', () => {
      const result = computeNRR({ startingMRR: 100, expansionMRR: 0, contractionMRR: 3, churnMRR: 2 })
      expect(result.band?.label).toBe('Eroding')
    })

    it('85% → Declining', () => {
      const result = computeNRR({ startingMRR: 100, expansionMRR: 0, contractionMRR: 5, churnMRR: 10 })
      expect(result.band?.label).toBe('Declining')
    })
  })
})

describe('formatCurrency', () => {
  it('formats positive number with commas', () => {
    expect(formatCurrency(1_000_000)).toBe('$1,000,000')
  })

  it('formats negative number', () => {
    expect(formatCurrency(-80_000)).toBe('-$80,000')
  })

  it('compact millions', () => {
    expect(formatCurrency(1_500_000, { compact: true })).toBe('$1.5M')
  })

  it('compact thousands', () => {
    expect(formatCurrency(80_000, { compact: true })).toBe('$80K')
  })

  it('compact negative', () => {
    expect(formatCurrency(-2_500_000, { compact: true })).toBe('-$2.5M')
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
