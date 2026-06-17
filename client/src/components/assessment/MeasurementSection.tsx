import { useState } from 'react'
import { useAssessmentState } from '../../lib/state'
import { getCapability, getLevelColor, getRubric } from '../../lib/rubric'
import { track } from '../../lib/analytics'
import { ConfirmModal } from '../shared/ConfirmModal'
import type { MeasurementCapability } from '../../lib/rubric-schema'

interface MeasurementSectionProps {
  onComplete: () => void
}

const ChevronDown = () => (
  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

export function MeasurementSection({ onComplete }: MeasurementSectionProps) {
  const [state, dispatch] = useAssessmentState()
  const [showModal, setShowModal] = useState(false)
  const [startTime] = useState(() => Date.now())

  const cap = getCapability('measurement') as MeasurementCapability
  const levers = cap.levers
  const themes = getRubric().themes
  const picks = state.picks.measurement

  const pickedCount = levers.filter((l) => picks[l.id] != null).length
  const totalCount = levers.length
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
        section_name: 'measurement',
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
          NRR Reporting
        </p>
        <h2 className="font-display text-2xl font-bold text-navy mb-2">{cap.name}</h2>
        <p className="text-text-dark text-sm leading-relaxed max-w-2xl">{cap.tagline}</p>
      </div>

      <div className="space-y-4 mb-8">
        {levers.map((lever) => {
          const level = picks[lever.id]
          const isAnswered = level != null
          const theme = themes[lever.theme]
          const accentColor = isAnswered ? getLevelColor(level!).fill : '#E2E8F0'

          return (
            <div
              key={lever.id}
              className="bg-white rounded-xl border border-slate-200 p-5"
              style={{ borderLeft: `4px solid ${accentColor}` }}
            >
              <div className="flex items-center gap-2 flex-wrap mb-2">
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

              <p className="text-sm text-text-dark leading-relaxed mb-4">{lever.question}</p>

              <div className="relative">
                <select
                  value={level != null ? String(level) : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    const newLevel = val === '' ? null : parseInt(val, 10)
                    dispatch({ type: 'SET_PICK_MEASUREMENT', id: lever.id, level: newLevel })
                    if (newLevel !== null) {
                      track({
                        name: 'pick_made',
                        props: { lever_or_category_id: lever.id, dimension: null, level: newLevel },
                      })
                    }
                  }}
                  aria-label={`Answer for ${lever.name}`}
                  className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent cursor-pointer"
                >
                  <option value="">Select your level…</option>
                  {lever.answers.map((a) => (
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <p className="text-sm text-slate-500">
          {pickedCount === 0 ? (
            'No answers yet — answer any item to begin'
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
            ? "You haven't answered anything in NRR Reporting. Skipping means this capability won't factor into your scorecard."
            : `You've answered ${pickedCount} of ${totalCount} items. Your scorecard will note the unanswered ones — you can always return.`
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
