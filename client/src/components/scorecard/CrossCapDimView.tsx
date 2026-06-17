import { useAssessmentState } from '../../lib/state'
import { getCapability } from '../../lib/rubric'
import {
  getCrossCapDimAvg,
  getActionDimAvg,
  getDistanceToL5,
  scoreToColor,
  DIMS,
  type AllPicks,
} from '../../lib/scoring'
import type { ActionCapKey } from '../../lib/state'

function toPicks(state: ReturnType<typeof useAssessmentState>[0]): AllPicks {
  return {
    measurement: state.picks.measurement,
    retention: state.picks.retention,
    expansion: state.picks.expansion,
    pricing: state.picks.pricing,
  }
}

function Cell({ value, bg }: { value: string; bg: string }) {
  return (
    <td
      className="px-3 py-2 text-center text-sm tabular-nums font-medium whitespace-nowrap"
      style={{ backgroundColor: bg }}
    >
      {value}
    </td>
  )
}

export function CrossCapDimView() {
  const [state] = useAssessmentState()
  const picks = toPicks(state)

  const actionCaps = state.selectedCapabilities.filter(
    (k): k is ActionCapKey => k !== 'measurement',
  )

  if (actionCaps.length < 2) return null

  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-bold text-navy mb-1">
        Cross-Capability Dimension View
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        How each dimension performs across all selected action capabilities.
      </p>
      <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm border-collapse bg-white" aria-label="Cross-capability dimension view">
          <caption className="sr-only">Dimension scores averaged across all selected action capabilities. Rows are dimensions; columns are individual capabilities, their average, and the gap to Level 5.</caption>
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                Dimension
              </th>
              {actionCaps.map((k) => (
                <th
                  key={k}
                  scope="col"
                  className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                >
                  {getCapability(k)?.name ?? k}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                Dim Avg
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                Gap to L5
              </th>
            </tr>
          </thead>
          <tbody>
            {DIMS.map((dim) => {
              const avg = getCrossCapDimAvg(actionCaps, dim, picks)
              const gap = getDistanceToL5(avg)
              return (
                <tr key={dim} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-navy whitespace-nowrap">{dim}</td>
                  {actionCaps.map((k) => {
                    const score: number | null = getActionDimAvg(k, dim, picks[k])
                    return (
                      <Cell
                        key={k}
                        value={score !== null ? score.toFixed(2) : '—'}
                        bg={scoreToColor(score)}
                      />
                    )
                  })}
                  <Cell value={avg !== null ? avg.toFixed(2) : '—'} bg={scoreToColor(avg)} />
                  <Cell value={gap !== null ? gap.toFixed(2) : '—'} bg="#F1F5F9" />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-slate-400 text-right sm:hidden" aria-hidden="true">← scroll to see all columns →</p>
      </div>
    </section>
  )
}
