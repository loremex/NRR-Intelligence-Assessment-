import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type ActionCapKey, type CapKey } from '../lib/state'
import { getCapability } from '../lib/rubric'
import { getCapabilityOverall, getThreeWeakestLevers, scoreToColor, type AllPicks } from '../lib/scoring'
import { track } from '../lib/analytics'
import { HeadlineTiles } from '../components/scorecard/HeadlineTiles'
import { CrossCapDimView } from '../components/scorecard/CrossCapDimView'
import { MeasurementHeatmap } from '../components/scorecard/MeasurementHeatmap'
import { ActionHeatmap } from '../components/scorecard/ActionHeatmap'
import { ThreeWeakest } from '../components/scorecard/ThreeWeakest'
import { RecommendationBlock } from '../components/scorecard/RecommendationBlock'

const CAP_ORDER: CapKey[] = ['measurement', 'retention', 'expansion', 'pricing']

function toPicks(state: ReturnType<typeof useAssessmentState>[0]): AllPicks {
  return {
    measurement: state.picks.measurement,
    retention: state.picks.retention,
    expansion: state.picks.expansion,
    pricing: state.picks.pricing,
  }
}

function Scorecard() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()

  const sections = CAP_ORDER.filter((k) => state.selectedCapabilities.includes(k))
  const allSectionsComplete =
    sections.length > 0 && sections.every((s) => state.completedSections.includes(s))

  const picks = toPicks(state)
  const actionCaps = sections.filter((k): k is ActionCapKey => k !== 'measurement')
  const overallIntelligence =
    actionCaps.length > 0
      ? actionCaps.reduce((sum, k) => {
          const o = getCapabilityOverall(k, picks)
          return sum + (o ?? 0)
        }, 0) / actionCaps.length
      : null

  const weakestCap = (() => {
    if (actionCaps.length === 0) return null
    const scored = actionCaps
      .map((k) => ({ key: k, score: getCapabilityOverall(k, picks) }))
      .filter((c): c is { key: ActionCapKey; score: number } => c.score !== null)
    if (scored.length === 0) return null
    return scored.reduce((min, c) => (c.score < min.score ? c : min)).key
  })()

  const weakestLeverName = weakestCap
    ? (getThreeWeakestLevers(weakestCap, picks)[0]?.name ?? null)
    : null

  useEffect(() => {
    if (!allSectionsComplete) return
    track({
      name: 'scorecard_viewed',
      props: {
        capabilities_selected: sections,
        overall_intelligence: overallIntelligence,
        weakest_capability: weakestLeverName,
      },
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
          <span className="text-slate-400 text-sm">NRR Intelligence Assessment</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
            Your Results
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy">
            NRR Intelligence Scorecard
          </h1>
        </div>

        {/* Headline tiles */}
        <HeadlineTiles />

        {/* Cross-cap dimension view (only if ≥2 action caps) */}
        <CrossCapDimView />

        {/* Per-capability heatmaps */}
        {sections.map((capKey) => {
          const cap = getCapability(capKey)
          if (!cap) return null
          const overall = getCapabilityOverall(capKey, picks)

          return (
            <section key={capKey} className="mb-12">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-display text-xl font-bold text-navy">{cap.name}</h2>
                {overall !== null && (
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: scoreToColor(overall),
                      color: '#1E293B',
                    }}
                  >
                    {overall.toFixed(2)} / 5
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-4">{cap.tagline}</p>

              {cap.type === 'measurement' ? (
                <MeasurementHeatmap picks={state.picks.measurement} />
              ) : (
                <ActionHeatmap
                  capabilityKey={capKey as ActionCapKey}
                  picks={state.picks[capKey as ActionCapKey]}
                />
              )}

              <ThreeWeakest capabilityKey={capKey} picks={picks} />
            </section>
          )
        })}

        {/* Recommendation block */}
        <RecommendationBlock />

        {/* Restart */}
        <div className="text-center mt-4">
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
