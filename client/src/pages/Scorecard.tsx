import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type CapKey, type ActionCapKey } from '../lib/state'
import { getCapability } from '../lib/rubric'
import { track } from '../lib/analytics'

const CAP_ORDER: CapKey[] = ['measurement', 'retention', 'expansion', 'pricing']
const DIMS = ['People', 'Process', 'Technology', 'Data'] as const

function countMeasurementPicks(picks: Record<string, number | null>, leverCount: number) {
  const answered = Object.values(picks).filter((v) => v != null).length
  return { answered, total: leverCount }
}

function countActionPicks(picks: Record<string, Record<string, number | null>>, leverCount: number) {
  let answered = 0
  for (const leverPicks of Object.values(picks)) {
    for (const dim of DIMS) {
      if (leverPicks[dim] != null) answered++
    }
  }
  return { answered, total: leverCount * DIMS.length }
}

function Scorecard() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()

  const sections = CAP_ORDER.filter((k) => state.selectedCapabilities.includes(k))
  const allSectionsComplete = sections.length > 0 && sections.every((s) => state.completedSections.includes(s))

  useEffect(() => {
    if (!allSectionsComplete) return
    track({
      name: 'assessment_completed',
      props: { capabilities_selected: sections, overall_intelligence: null },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!state.email) return <Navigate to="/" replace />
  if (state.selectedCapabilities.length === 0) return <Navigate to="/" replace />
  if (!allSectionsComplete) return <Navigate to="/assessment" replace />

  function handleRestart() {
    dispatch({ type: 'RESET_ALL' })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-light font-body">
      {/* Nav */}
      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="text-slate-400 text-sm">Step 5 of 5</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Sprint 3 placeholder banner */}
        <div className="text-center mb-12">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
            Coming in Sprint 3
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy mb-4">
            All sections complete — scorecard coming in Sprint 3
          </h1>
          <p className="text-text-dark text-base max-w-xl mx-auto leading-relaxed">
            Your answers have been saved. The full scorecard — with intelligence scores, heatmaps,
            and your prioritised recommendation — arrives in Sprint 3.
          </p>
        </div>

        {/* Capability breakdown */}
        <div className="space-y-4 mb-12">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
            Your assessment summary
          </p>

          {sections.map((capKey) => {
            const cap = getCapability(capKey)
            if (!cap) return null

            const { answered, total } =
              cap.type === 'measurement'
                ? countMeasurementPicks(state.picks.measurement, cap.levers.length)
                : countActionPicks(
                    state.picks[capKey as ActionCapKey],
                    cap.levers.length,
                  )

            const pct = total > 0 ? Math.round((answered / total) * 100) : 0
            const isFullyAnswered = answered === total

            return (
              <div
                key={capKey}
                className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-navy text-sm">{cap.name}</h3>
                    {isFullyAnswered && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {answered} of {total} items answered
                  </p>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-blue rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-navy tabular-nums shrink-0">{pct}%</span>
              </div>
            )
          })}
        </div>

        {/* Restart */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleRestart}
            className="text-sm text-slate-500 hover:text-text-dark underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded transition-colors"
          >
            Restart Assessment
          </button>
        </div>
      </main>
    </div>
  )
}

export default Scorecard
