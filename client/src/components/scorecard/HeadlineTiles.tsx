import { useAssessmentState } from '../../lib/state'
import { computeNRR } from '../../lib/nrr'
import {
  getOverallIntelligence,
  getDistanceToL5,
  getMeasurementOverall,
  scoreToColor,
  type AllPicks,
} from '../../lib/scoring'
import { HeadlineTile } from './HeadlineTile'

function fmt(n: number | null, pct = false): string {
  if (n === null) return '—'
  return pct ? `${(n * 100).toFixed(1)}%` : n.toFixed(2)
}

function toPicks(state: ReturnType<typeof useAssessmentState>[0]): AllPicks {
  return {
    measurement: state.picks.measurement,
    retention: state.picks.retention,
    expansion: state.picks.expansion,
    pricing: state.picks.pricing,
  }
}

export function HeadlineTiles() {
  const [state] = useAssessmentState()
  const picks = toPicks(state)

  const actionCaps = state.selectedCapabilities.filter(
    (k): k is 'retention' | 'expansion' | 'pricing' => k !== 'measurement',
  )
  const hasMeasurement = state.selectedCapabilities.includes('measurement')

  const nrrResult = state.nrrInputs && !state.nrrCalculatorSkipped
    ? computeNRR(state.nrrInputs)
    : null

  const nrrVal = nrrResult?.nrr ?? null
  const grrVal = nrrResult?.grr ?? null
  const measOverall = hasMeasurement ? getMeasurementOverall(picks.measurement) : null
  const overallIntelligence = getOverallIntelligence(actionCaps, picks)
  const distanceToL5 = getDistanceToL5(overallIntelligence)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
      <HeadlineTile
        label="NRR"
        value={fmt(nrrVal, true)}
        color={nrrVal !== null ? (nrrVal >= 1.0 ? '#059669' : '#DC2626') : undefined}
        tooltip="Net Revenue Retention from your NRR Calculator inputs"
      />
      <HeadlineTile
        label="GRR"
        value={fmt(grrVal, true)}
        color={grrVal !== null ? (grrVal >= 0.9 ? '#059669' : '#D97706') : undefined}
        tooltip="Gross Revenue Retention (excludes expansion)"
      />
      <HeadlineTile
        label="Reporting Maturity"
        value={measOverall !== null ? `${measOverall.toFixed(2)}/5` : '—'}
        color={scoreToColor(measOverall)}
        tooltip="NRR Reporting capability overall score"
      />
      <HeadlineTile
        label="Overall Intelligence"
        value={overallIntelligence !== null ? `${overallIntelligence.toFixed(2)}/5` : '—'}
        color={scoreToColor(overallIntelligence)}
        tooltip="Mean of selected action capability scores"
      />
      <HeadlineTile
        label="Distance to L5"
        value={distanceToL5 !== null ? distanceToL5.toFixed(2) : '—'}
        tooltip="How far your Overall Intelligence is from the maximum (5.0)"
      />
    </div>
  )
}
