import { useState } from 'react'
import { useAssessmentState, type ActionCapKey } from '../../lib/state'
import { getCapability, getLevelColor, getRubric } from '../../lib/rubric'
import { track } from '../../lib/analytics'
import { ConfirmModal } from '../shared/ConfirmModal'
import type { ActionCapability } from '../../lib/rubric-schema'

interface ActionCapabilitySectionProps {
  capabilityKey: ActionCapKey
  onComplete: () => void
}

const DIMS = ['People', 'Process', 'Technology', 'Data'] as const
type DimKey = (typeof DIMS)[number]

const ChevronDown = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const CheckIcon = () => (
  <svg aria-hidden="true" className="h-3.5 w-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

export function ActionCapabilitySection({ capabilityKey, onComplete }: ActionCapabilitySectionProps) {
  const [state, dispatch] = useAssessmentState()
  const [showModal, setShowModal] = useState(false)
  const [startTime] = useState(() => Date.now())

  const cap = getCapability(capabilityKey) as ActionCapability
  const levers = cap.levers
  const themes = getRubric().themes
  const capPicks = state.picks[capabilityKey]

  // Count total answered (lever × dim) pairs
  const pickedCount = levers.reduce((sum, lever) => {
    return sum + DIMS.filter((dim) => capPicks[lever.id]?.[dim] != null).length
  }, 0)
  const totalCount = levers.length * DIMS.length // 7 × 4 = 28
  const allComplete = pickedCount === totalCount
  const isSkip = pickedCount === 0

  const buttonLabel = isSkip
    ? 'Skip section'
    : allComplete
      ? 'Continue'
      : `Continue (${pickedCount} of ${totalCount} answered)`

  function handleContinue() {
    if (allComplete) {
      advance()
    } else {
      setShowModal(true)
    }
  }

  function advance() {
    const secs = Math.round((Date.now() - startTime) / 1000)
    track({
      name: 'assessment_section_completed',
      props: {
        section_name: capabilityKey,
        time_on_section_seconds: secs,
        picks_count: pickedCount,
      },
    })
    onComplete()
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
          {capabilityKey.charAt(0).toUpperCase() + capabilityKey.slice(1)}
        </p>
        <h2 className="font-display text-2xl font-bold text-navy mb-2">{cap.name}</h2>
        <p className="text-text-dark text-sm leading-relaxed max-w-2xl">{cap.tagline}</p>
      </div>

      {/* Dimension legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {DIMS.map((dim) => (
          <span key={dim} className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {dim}
          </span>
        ))}
        <span className="text-xs text-slate-400 self-center">
          Rate each dimension for every lever below
        </span>
      </div>

      <div className="space-y-5 mb-8">
        {levers.map((lever) => {
          const leverPicks = capPicks[lever.id] ?? {}
          const answeredDims = DIMS.filter((dim) => leverPicks[dim] != null).length
          const theme = themes[lever.theme]

          // Use the highest answered level for the card accent (or first answered)
          const answeredLevels = DIMS.map((dim) => leverPicks[dim]).filter((v): v is number => v != null)
          const avgLevel = answeredLevels.length > 0
            ? Math.round(answeredLevels.reduce((a, b) => a + b, 0) / answeredLevels.length)
            : null
          const accentColor = avgLevel != null ? getLevelColor(avgLevel).fill : '#E2E8F0'

          return (
            <div
              key={lever.id}
              className="bg-white rounded-xl border border-slate-200 p-5"
              style={{ borderLeft: `4px solid ${accentColor}` }}
            >
              {/* Lever header */}
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {lever.id}
                  </span>
                  {theme && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: theme.color, color: '#374151' }}
                    >
                      {theme.label}
                    </span>
                  )}
                  <h3 className="font-display text-base font-bold text-navy">{lever.name}</h3>
                </div>
                {answeredDims > 0 && (
                  <span className="text-xs text-slate-500 shrink-0">
                    {answeredDims}/{DIMS.length} dims
                  </span>
                )}
              </div>

              <p className="text-sm text-text-dark leading-relaxed mb-4">{lever.question}</p>

              {/* 2×2 dimension grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DIMS.map((dim) => {
                  const dimLevel = leverPicks[dim] ?? null
                  const isAnswered = dimLevel != null
                  const dimAnswers = (lever.dimensions[dim as DimKey] ?? []) as Array<{ level: number; text: string }>

                  return (
                    <div key={dim}>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                        {isAnswered && <CheckIcon />}
                        <span>{dim}</span>
                      </label>
                      <div className="relative">
                        <select
                          value={dimLevel != null ? String(dimLevel) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            const newLevel = val === '' ? null : parseInt(val, 10)
                            dispatch({
                              type: 'SET_PICK_ACTION',
                              capKey: capabilityKey,
                              leverId: lever.id,
                              dim,
                              level: newLevel,
                            })
                            if (newLevel !== null) {
                              track({
                                name: 'pick_made',
                                props: {
                                  lever_or_category_id: lever.id,
                                  dimension: dim,
                                  level: newLevel,
                                },
                              })
                            }
                          }}
                          aria-label={`${lever.name} — ${dim}`}
                          className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent cursor-pointer"
                        >
                          <option value="">Select…</option>
                          {dimAnswers.map((a) => (
                            <option key={a.level} value={String(a.level)}>
                              L{a.level} — {a.text}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                          <ChevronDown />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <p className="text-sm text-slate-500">
          {pickedCount === 0 ? (
            'No answers yet — fill any dimension to begin'
          ) : (
            <>
              <span className="font-semibold text-navy">{pickedCount}</span> of {totalCount} answered
            </>
          )}
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full sm:w-auto bg-navy text-white font-semibold px-8 py-3 rounded-lg transition-all hover:bg-slate-800 active:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          {buttonLabel} →
        </button>
      </div>

      <ConfirmModal
        open={showModal}
        title={isSkip ? 'Skip this section?' : 'Continue with partial answers?'}
        body={
          isSkip
            ? `You haven't answered anything in ${cap.name}. Skipping means this capability won't appear in your scorecard.`
            : `You've answered ${pickedCount} of ${totalCount} items in ${cap.name}. Your scorecard will note the unanswered ones.`
        }
        primaryLabel={isSkip ? 'Skip section' : 'Continue anyway'}
        secondaryLabel="Go back"
        onPrimary={() => {
          setShowModal(false)
          advance()
        }}
        onSecondary={() => setShowModal(false)}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
