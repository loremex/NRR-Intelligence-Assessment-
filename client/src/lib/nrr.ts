import { getNRRBands, type NRRBand } from './rubric'

export type { NRRBand }

export interface NRRInputs {
  startingMRR: number | null
  expansionMRR: number | null
  contractionMRR: number | null
  churnMRR: number | null
}

export interface NRRResult {
  nrr: number | null
  grr: number | null
  netMovement: number | null
  band: NRRBand | null
}

const bands = getNRRBands()

export function computeNRR(inputs: NRRInputs): NRRResult {
  const { startingMRR, expansionMRR, contractionMRR, churnMRR } = inputs

  if (!startingMRR || startingMRR <= 0) {
    return { nrr: null, grr: null, netMovement: null, band: null }
  }

  const expansion = expansionMRR ?? 0
  const contraction = contractionMRR ?? 0
  const churn = churnMRR ?? 0

  const nrr = (startingMRR + expansion - contraction - churn) / startingMRR
  const grr = (startingMRR - contraction - churn) / startingMRR
  const netMovement = expansion - contraction - churn

  // Bands are ordered highest-to-lowest threshold; first match wins.
  // Fall back to last band (Declining) for NRR below zero.
  const band = bands.find((b) => nrr >= b.threshold) ?? bands[bands.length - 1] ?? null

  return { nrr, grr, netMovement, band }
}

export function formatCurrency(n: number, opts?: { compact?: boolean }): string {
  const abs = Math.abs(n)
  const prefix = n < 0 ? '-$' : '$'
  if (opts?.compact) {
    if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(0)}K`
    return `${prefix}${abs.toFixed(0)}`
  }
  return `${prefix}${abs.toLocaleString('en-US')}`
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}
