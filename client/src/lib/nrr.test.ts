import { describe, it, expect } from 'vitest'
import { computeNRR, formatCurrency, formatPercent } from './nrr'

// ─── Reference tests ──────────────────────────────────────────────────────────

describe('computeNRR — dollar mode reference', () => {
  it('$1M / $180K expansion / $40K contraction / $60K churn → NRR 108%, GRR 90%, net +$80K +8%', () => {
    const result = computeNRR({
      mode: 'dollars',
      startingMRR: 1_000_000,
      expansion: 180_000,
      contraction: 40_000,
      churn: 60_000,
    })
    expect(result.nrr).toBeCloseTo(1.08)
    expect(result.grr).toBeCloseTo(0.90)
    expect(result.netMovementDollars).toBe(80_000)
    expect(result.netMovementPct).toBeCloseTo(0.08)
    expect(result.band?.label).toBe('Net positive')
  })
})

describe('computeNRR — percentage mode reference (must be identical to $ reference)', () => {
  it('$1M / 18% / 4% / 6% → identical results to dollar reference', () => {
    const result = computeNRR({
      mode: 'percentages',
      startingMRR: 1_000_000,
      expansion: 18,
      contraction: 4,
      churn: 6,
    })
    expect(result.nrr).toBeCloseTo(1.08)
    expect(result.grr).toBeCloseTo(0.90)
    expect(result.netMovementDollars).toBeCloseTo(80_000)
    expect(result.netMovementPct).toBeCloseTo(0.08)
    expect(result.band?.label).toBe('Net positive')
  })
})

// ─── Cross-mode consistency ───────────────────────────────────────────────────

describe('cross-mode consistency — dollar ↔ percentage produce identical NRR for all 5 bands', () => {
  const cases: Array<{ band: string; startingMRR: number; expansion: number; contraction: number; churn: number }> = [
    { band: 'World-class', startingMRR: 1_000_000, expansion: 250_000, contraction: 0, churn: 0 },
    { band: 'Strong',      startingMRR: 1_000_000, expansion: 150_000, contraction: 0, churn: 0 },
    { band: 'Net positive', startingMRR: 1_000_000, expansion: 50_000, contraction: 0, churn: 0 },
    { band: 'Eroding',     startingMRR: 1_000_000, expansion: 0, contraction: 30_000, churn: 20_000 },
    { band: 'Declining',   startingMRR: 1_000_000, expansion: 0, contraction: 50_000, churn: 100_000 },
  ]

  for (const c of cases) {
    it(`${c.band}: dollar and % modes produce equal NRR`, () => {
      const dollarResult = computeNRR({
        mode: 'dollars',
        startingMRR: c.startingMRR,
        expansion: c.expansion,
        contraction: c.contraction,
        churn: c.churn,
      })
      const expansionPct = (c.expansion / c.startingMRR) * 100
      const contractionPct = (c.contraction / c.startingMRR) * 100
      const churnPct = (c.churn / c.startingMRR) * 100
      const pctResult = computeNRR({
        mode: 'percentages',
        startingMRR: c.startingMRR,
        expansion: expansionPct,
        contraction: contractionPct,
        churn: churnPct,
      })
      expect(pctResult.nrr).toBeCloseTo(dollarResult.nrr!)
      expect(pctResult.grr).toBeCloseTo(dollarResult.grr!)
      expect(pctResult.netMovementDollars).toBeCloseTo(dollarResult.netMovementDollars!)
      expect(pctResult.band?.label).toBe(dollarResult.band?.label)
    })
  }
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('computeNRR — edge cases', () => {
  it('startingMRR null → all nulls', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: null, expansion: 0, contraction: 0, churn: 0 })
    expect(result.nrr).toBeNull()
    expect(result.grr).toBeNull()
    expect(result.netMovementDollars).toBeNull()
    expect(result.band).toBeNull()
  })

  it('startingMRR 0 → all nulls', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 0, expansion: 0, contraction: 0, churn: 0 })
    expect(result.nrr).toBeNull()
  })

  it('startingMRR negative → all nulls', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: -100, expansion: 0, contraction: 0, churn: 0 })
    expect(result.nrr).toBeNull()
  })

  it('expansion null → all nulls', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 1_000_000, expansion: null, contraction: 0, churn: 0 })
    expect(result.nrr).toBeNull()
  })

  it('contraction null → all nulls', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 1_000_000, expansion: 0, contraction: null, churn: 0 })
    expect(result.nrr).toBeNull()
  })

  it('churn null → all nulls', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 1_000_000, expansion: 0, contraction: 0, churn: null })
    expect(result.nrr).toBeNull()
  })

  it('all components 0 → NRR 100%, GRR 100%, net $0', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 500_000, expansion: 0, contraction: 0, churn: 0 })
    expect(result.nrr).toBeCloseTo(1.0)
    expect(result.grr).toBeCloseTo(1.0)
    expect(result.netMovementDollars).toBe(0)
    expect(result.netMovementPct).toBeCloseTo(0)
    expect(result.band?.label).toBe('Net positive')
  })

  it('World-class: $1M / $250K / $0 / $0 → NRR 125%', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 1_000_000, expansion: 250_000, contraction: 0, churn: 0 })
    expect(result.nrr).toBeCloseTo(1.25)
    expect(result.band?.label).toBe('World-class')
  })

  it('Declining: $1M / $0 / $50K / $100K → NRR 85%', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 1_000_000, expansion: 0, contraction: 50_000, churn: 100_000 })
    expect(result.nrr).toBeCloseTo(0.85)
    expect(result.band?.label).toBe('Declining')
  })

  it('huge churn → NRR below zero → still resolves to Declining', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 100_000, expansion: 0, contraction: 0, churn: 200_000 })
    expect(result.nrr).toBeLessThan(0)
    expect(result.band?.label).toBe('Declining')
  })
})

// ─── Band thresholds ──────────────────────────────────────────────────────────

describe('band thresholds', () => {
  it('NRR ≥125% → World-class', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 100, expansion: 25, contraction: 0, churn: 0 })
    expect(result.band?.label).toBe('World-class')
  })

  it('NRR ≥115% <125% → Strong', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 100, expansion: 15, contraction: 0, churn: 0 })
    expect(result.band?.label).toBe('Strong')
  })

  it('NRR ≥100% <115% → Net positive', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 100, expansion: 5, contraction: 0, churn: 0 })
    expect(result.band?.label).toBe('Net positive')
  })

  it('NRR <100% ≥85% → Eroding', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 100, expansion: 0, contraction: 3, churn: 2 })
    expect(result.band?.label).toBe('Eroding')
  })

  it('NRR <85% → Declining', () => {
    const result = computeNRR({ mode: 'dollars', startingMRR: 100, expansion: 0, contraction: 5, churn: 10 })
    expect(result.band?.label).toBe('Declining')
  })
})

// ─── Formatters ───────────────────────────────────────────────────────────────

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
