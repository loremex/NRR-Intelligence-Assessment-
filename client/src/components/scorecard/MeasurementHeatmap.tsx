import { getCapability } from '../../lib/rubric'
import type { MeasurementCapability } from '../../lib/rubric-schema'

// Monochromatic navy ramp — matches the action capability heatmap palette
function navyBg(v: number | null): string {
  if (v === null) return '#F4F6F9'
  const ramp: Record<number, string> = { 1: '#EAEEF3', 2: '#D2DBE4', 3: '#AABBCC', 4: '#6E8AA6', 5: '#3E5C7C' }
  return ramp[Math.round(v)] ?? '#D2DBE4'
}

function navyFg(v: number | null): string {
  if (v === null) return '#C2CAD3'
  return Math.round(v) >= 4 ? '#FFFFFF' : '#243B52'
}

interface MeasurementHeatmapProps {
  picks: Record<string, number | null>
}

export function MeasurementHeatmap({ picks }: MeasurementHeatmapProps) {
  const cap = getCapability('measurement') as MeasurementCapability
  if (!cap) return null

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm border-collapse bg-white" aria-label="NRR Reporting category scores">
          <caption className="sr-only">NRR Reporting assessment scores by category, showing Score (1–5) and Gap to L5.</caption>
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[180px]">
                Category
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                Score
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                Gap to L5
              </th>
            </tr>
          </thead>
          <tbody>
            {cap.levers.map((lever) => {
              const score = picks[lever.id] ?? null
              const gap = score !== null ? 5 - score : null
              return (
                <tr key={lever.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-navy">
                    <span className="text-xs font-mono text-slate-400 mr-2">{lever.id}</span>
                    {lever.name}
                  </td>
                  <td
                    className="px-3 py-2 text-center font-medium tabular-nums"
                    style={{ backgroundColor: navyBg(score), color: navyFg(score) }}
                  >
                    {score ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500 tabular-nums bg-slate-50">
                    {gap !== null ? gap.toFixed(0) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-slate-400 text-right sm:hidden" aria-hidden="true">← scroll to see all columns →</p>
    </div>
  )
}
