export type NRRMode = 'dollars' | 'percentages'

export interface NRRBand {
  label: string
  threshold: number
  color: string
  description?: string
}

// NRR bands — inline since rubric.json is removed
// Labels match the original rubric.json for test compatibility
const NRR_BANDS: NRRBand[] = [
  { label: 'World-class', threshold: 1.25, color: '#6EE7B7', description: 'Your NRR is world-class. You\'re growing net revenue faster than you add new logos.' },
  { label: 'Strong', threshold: 1.15, color: '#A7F3D0', description: 'Strong NRR. Expansion is meaningfully outpacing churn and contraction.' },
  { label: 'Net positive', threshold: 1.0, color: '#BFDBFE', description: 'You\'re retaining what you win. Expansion is offsetting losses but growth is slim.' },
  { label: 'Eroding', threshold: 0.86, color: '#FED7AA', description: 'Churn and contraction are outpacing expansion. Every new logo starts in a hole.' },
  { label: 'Declining', threshold: 0, color: '#FECACA', description: 'NRR is critically low. Addressing retention and pricing urgently is essential.' },
]

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

  const band = NRR_BANDS.find((b) => nrr >= b.threshold) ?? NRR_BANDS[NRR_BANDS.length - 1] ?? null

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
