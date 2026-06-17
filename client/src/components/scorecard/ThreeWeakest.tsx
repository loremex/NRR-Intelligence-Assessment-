import { getThreeWeakestLevers, scoreToColor } from '../../lib/scoring'
import type { CapKey } from '../../lib/state'
import type { AllPicks } from '../../lib/scoring'

interface ThreeWeakestProps {
  capabilityKey: CapKey
  picks: AllPicks
}

export function ThreeWeakest({ capabilityKey, picks }: ThreeWeakestProps) {
  const levers = getThreeWeakestLevers(capabilityKey, picks).filter((l) => l.score !== null)
  if (levers.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-2">
        3 Highest-Impact Levers to Address
      </h3>
      <div className="flex flex-col gap-2">
        {levers.map((lever, i) => (
          <div
            key={lever.id}
            className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-4 py-3"
          >
            <span className="text-xs font-semibold text-slate-400 w-4 shrink-0">{i + 1}</span>
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: scoreToColor(lever.score) }}
            />
            <span className="text-sm font-medium text-navy flex-1">{lever.name}</span>
            <span
              className="text-sm font-bold tabular-nums px-2 py-0.5 rounded"
              style={{ backgroundColor: scoreToColor(lever.score), color: '#1E293B' }}
            >
              {lever.score !== null ? lever.score.toFixed(2) : '—'}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {lever.gapToL5 !== null ? `+${lever.gapToL5.toFixed(2)} to L5` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
