import { getNRRBands, type NRRBand } from './rubric'

export type { NRRBand }

export interface NRRInputs {
  startingMRR?: number | null
  expansionPct: number | null
  contractionPct: number | null
  churnPct: number | null
}

export interface NRRResult {
  nrr: number | null
  grr: number | null
  netMovement: number | null  // decimal fraction, e.g. 0.08 = +8%
  band: NRRBand | null
}

const bands = getNRRBands()

export function computeNRR(inputs: NRRInputs): NRRResult {
  const { expansionPct, contractionPct, churnPct } = inputs

  if (expansionPct === null && contractionPct === null && churnPct === null) {
    return { nrr: null, grr: null, netMovement: null, band: null }
  }

  const exp = expansionPct ?? 0
  const con = contractionPct ?? 0
  const churn = churnPct ?? 0

  const nrr = 1 + (exp - con - churn) / 100
  const grr = 1 - (con + churn) / 100
  const netMovement = (exp - con - churn) / 100

  const band = bands.find((b) => nrr >= b.threshold) ?? bands[bands.length - 1] ?? null

  return { nrr, grr, netMovement, band }
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}
