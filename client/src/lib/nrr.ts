import { getNRRBands, type NRRBand } from './rubric'

export type { NRRBand }

export type NRRMode = 'dollars' | 'percentages'

export interface NRRInputs {
  mode: NRRMode
  startingMRR: number | null
  expansion: number | null
  contraction: number | null
  churn: number | null
}

export interface NRRResult {
  nrr: number | null
  grr: number | null
  netMovementDollars: number | null
  netMovementPct: number | null
  band: NRRBand | null
}

const bands = getNRRBands()

function toDollars(value: number, mode: NRRMode, startingMRR: number): number {
  return mode === 'dollars' ? value : startingMRR * (value / 100)
}

export function computeNRR(inputs: NRRInputs): NRRResult {
  const { mode, startingMRR, expansion, contraction, churn } = inputs
  const nullResult: NRRResult = {
    nrr: null, grr: null, netMovementDollars: null, netMovementPct: null, band: null,
  }

  if (!startingMRR || startingMRR <= 0) return nullResult
  if (expansion === null || contraction === null || churn === null) return nullResult

  const expD = toDollars(expansion, mode, startingMRR)
  const conD = toDollars(contraction, mode, startingMRR)
  const churnD = toDollars(churn, mode, startingMRR)

  const nrr = (startingMRR + expD - conD - churnD) / startingMRR
  const grr = (startingMRR - conD - churnD) / startingMRR
  const netMovementDollars = expD - conD - churnD
  const netMovementPct = netMovementDollars / startingMRR

  const band = bands.find((b) => nrr >= b.threshold) ?? bands[bands.length - 1] ?? null

  return { nrr, grr, netMovementDollars, netMovementPct, band }
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
