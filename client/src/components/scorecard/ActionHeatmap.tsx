import { getCapability } from '../../lib/rubric'
import { getLeverAvg, scoreToColor, DIMS } from '../../lib/scoring'
import type { ActionCapability } from '../../lib/rubric-schema'
import type { ActionCapKey } from '../../lib/state'

interface ActionHeatmapProps {
  capabilityKey: ActionCapKey
  picks: Record<string, Record<string, number | null>>
}

function getAnswerText(
  cap: ActionCapability,
  leverId: string,
  dim: string,
  level: number | null,
): string {
  if (level === null) return 'Not answered'
  const lever = cap.levers.find((l) => l.id === leverId)
  if (!lever) return `Level ${level}`
  const dimAnswers = lever.dimensions[dim as keyof typeof lever.dimensions]
  const answer = dimAnswers?.find((a) => a.level === level)
  return answer?.text ?? `Level ${level}`
}

export function ActionHeatmap({ capabilityKey, picks }: ActionHeatmapProps) {
  const cap = getCapability(capabilityKey) as ActionCapability
  if (!cap) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm border-collapse bg-white">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[140px]">
              Lever
            </th>
            {DIMS.map((d) => (
              <th
                key={d}
                className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap"
              >
                {d}
              </th>
            ))}
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Lever Avg
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Gap to L5
            </th>
          </tr>
        </thead>
        <tbody>
          {cap.levers.map((lever) => {
            const dimPicks = picks[lever.id] ?? {}
            const avg = getLeverAvg(dimPicks)
            const gap = avg !== null ? 5 - avg : null
            return (
              <tr key={lever.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-navy">
                  <span className="text-xs font-mono text-slate-400 mr-2">{lever.id}</span>
                  <span className="text-sm">{lever.name}</span>
                </td>
                {DIMS.map((dim) => {
                  const score = dimPicks[dim] ?? null
                  const tooltip = getAnswerText(cap, lever.id, dim, score)
                  return (
                    <td
                      key={dim}
                      className="px-3 py-2 text-center font-medium tabular-nums cursor-help"
                      style={{ backgroundColor: scoreToColor(score) }}
                      title={tooltip}
                    >
                      {score ?? '—'}
                    </td>
                  )
                })}
                <td
                  className="px-3 py-2 text-center font-bold tabular-nums"
                  style={{ backgroundColor: scoreToColor(avg) }}
                >
                  {avg !== null ? avg.toFixed(2) : '—'}
                </td>
                <td className="px-3 py-2 text-center text-slate-500 tabular-nums bg-slate-50">
                  {gap !== null ? gap.toFixed(2) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
