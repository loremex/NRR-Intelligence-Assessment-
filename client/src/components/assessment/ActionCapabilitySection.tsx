import { useState } from 'react'
import { useAssessmentState, type CapKey } from '../../lib/state'
import { V3_ASSESSMENT_CONTENT } from '../../content/assessmentContent'
import { track } from '../../lib/analytics'

interface CapabilitySectionProps {
  capabilityKey: CapKey
  questionOffset: number
  totalQuestions: number
  onComplete: () => void
  onBackToPrevSection: () => void
}

// internal step: 'intro' | 0 | 1 | 2
type Step = 'intro' | number

export function ActionCapabilitySection({
  capabilityKey,
  questionOffset,
  totalQuestions,
  onComplete,
  onBackToPrevSection,
}: CapabilitySectionProps) {
  const [state, dispatch] = useAssessmentState()
  const [step, setStep] = useState<Step>('intro')
  const [startTime] = useState(() => Date.now())

  const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === capabilityKey)!
  const capPicks = state.picks[capabilityKey]

  function handleBack() {
    if (step === 'intro') {
      onBackToPrevSection()
    } else if (step === 0) {
      setStep('intro')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setStep((step as number) - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleNext() {
    if (step === 'intro') {
      setStep(0)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const currentQ = step as number
    if (currentQ === 2) {
      const secs = Math.round((Date.now() - startTime) / 1000)
      track({
        name: 'assessment_section_completed',
        props: { section_name: capabilityKey, time_on_section_seconds: secs, picks_count: 3 },
      })
      onComplete()
    } else {
      setStep(currentQ + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          {capContent.name}
        </p>
        <h2 className="font-display text-2xl font-bold text-navy mb-6">
          Ground truth for {capContent.name.toLowerCase()}
        </h2>
        <div className="space-y-5 mb-10">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Foundation</p>
            <p className="text-sm text-text-dark leading-relaxed">{capContent.intro.foundation}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">What AI-native changes</p>
            <p className="text-sm text-text-dark leading-relaxed">{capContent.intro.aiNative}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-blue rounded transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="bg-navy text-white font-semibold px-8 py-3 rounded-lg transition-all hover:bg-slate-800 active:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            Start {capContent.name} →
          </button>
        </div>
      </div>
    )
  }

  // ── Question screen ───────────────────────────────────────────────────────

  const currentQ = step as number
  const qContent = capContent.questions[currentQ]!
  const qId = qContent.id
  const currentPick = capPicks[qId] ?? null
  const globalQ = questionOffset + currentQ + 1

  function handleSelect(scenarioIndex: number) {
    dispatch({ type: 'SET_PICK_SCENARIO', capKey: capabilityKey, qId, scenarioIndex })
    track({
      name: 'pick_made',
      props: { lever_or_category_id: `${capabilityKey}/${qId}`, dimension: null, level: scenarioIndex + 1 },
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest">
            {capContent.name}
          </p>
          <span className="text-xs text-slate-500 font-medium">
            Question {globalQ} of {totalQuestions}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className="bg-brand-blue h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(globalQ / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
          {qContent.title}
        </p>
        <h2 className="font-display text-2xl font-bold text-navy leading-snug">
          {qContent.question}
        </h2>
      </div>

      {/* Scenarios */}
      <div className="space-y-3 mb-8">
        {qContent.scenarios.map((scenario, idx) => {
          const isSelected = currentPick === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(idx)}
              className={[
                'w-full text-left rounded-xl border-2 p-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2',
                isSelected
                  ? 'border-brand-blue bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    isSelected ? 'border-brand-blue bg-brand-blue' : 'border-slate-300',
                  ].join(' ')}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <p className="text-sm text-text-dark leading-relaxed">{scenario.text}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-blue rounded transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPick === null}
          className={[
            'bg-navy text-white font-semibold px-8 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2',
            currentPick === null ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 active:bg-slate-900',
          ].join(' ')}
        >
          {currentQ === 2 ? 'Complete section' : 'Next'} →
        </button>
      </div>
    </div>
  )
}
