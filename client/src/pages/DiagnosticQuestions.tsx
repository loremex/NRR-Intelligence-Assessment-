import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type DiagnosticAnswers } from '../lib/state'
import { track } from '../lib/analytics'
import {
  Q2_OPTIONS, Q3_OPTIONS, Q4_OPTIONS, Q5_OPTIONS, Q6_OPTIONS,
} from '../content/diagnosticTemplates'

// ─── Sub-components ───────────────────────────────────────────────────────────

interface QuestionCardProps {
  number: string
  question: string
  options: ReadonlyArray<{ value: string; label: string }>
  selectedValue: string | null
  textValue: string
  onSelect: (value: string) => void
  onTextChange: (value: string) => void
  textPlaceholder?: string
}

function QuestionCard({
  number,
  question,
  options,
  selectedValue,
  textValue,
  onSelect,
  onTextChange,
  textPlaceholder = 'Add any context (optional)…',
}: QuestionCardProps) {
  const [showText, setShowText] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-navy text-white text-sm font-bold flex items-center justify-center">
          {number}
        </span>
        <p className="font-semibold text-navy text-base leading-snug pt-0.5">{question}</p>
      </div>

      <div className="space-y-2 pl-10">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all select-none ${
              selectedValue === opt.value
                ? 'border-navy bg-slate-50 ring-1 ring-navy'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name={`q-${number}`}
              value={opt.value}
              checked={selectedValue === opt.value}
              onChange={() => onSelect(opt.value)}
              className="accent-navy"
            />
            <span className="text-sm text-text-dark">{opt.label}</span>
          </label>
        ))}

        {selectedValue && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              className="text-xs text-brand-blue hover:underline focus:outline-none"
            >
              {showText ? '− Hide notes' : '+ Add a note (optional)'}
            </button>
            {showText && (
              <textarea
                value={textValue}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder={textPlaceholder}
                rows={2}
                className="mt-2 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none text-text-dark"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function DiagnosticQuestions() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()

  useEffect(() => {
    track({ name: 'diagnostic_started', props: {} })
  }, [])

  if (!state.email) return <Navigate to="/" replace />

  const answers = state.diagnosticAnswers

  function setChoice(field: keyof DiagnosticAnswers, value: string) {
    dispatch({ type: 'SET_DIAGNOSTIC_ANSWER', field, value })
  }

  function setText(field: keyof DiagnosticAnswers, value: string) {
    dispatch({ type: 'SET_DIAGNOSTIC_ANSWER', field, value })
  }

  const canContinue =
    !!answers?.q2_retention &&
    !!answers?.q3_data &&
    !!answers?.q4_team &&
    !!answers?.q5_priority &&
    !!answers?.q6_arr

  function handleContinue() {
    track({ name: 'diagnostic_completed', props: {} })
    navigate('/diagnostic-result')
  }

  return (
    <div className="min-h-screen bg-gray-light font-body">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-navy focus:font-semibold focus:rounded focus:ring-2 focus:ring-brand-blue"
      >
        Skip to main content
      </a>

      <nav className="bg-navy px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="text-slate-400 text-sm">90-Second Diagnostic</span>
        </div>
      </nav>

      <header className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
            Executive Diagnostic
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy mb-3">
            Where are you with NRR?
          </h1>
          <p className="text-text-dark max-w-xl text-sm sm:text-base leading-relaxed">
            Six quick questions. We'll synthesize your situation and tell you exactly where to focus.
          </p>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <QuestionCard
          number="1"
          question="What's your biggest NRR challenge right now?"
          options={Q2_OPTIONS}
          selectedValue={answers?.q2_retention ?? null}
          textValue={answers?.q2_text ?? ''}
          onSelect={(v) => setChoice('q2_retention', v)}
          onTextChange={(v) => setText('q2_text', v)}
          textPlaceholder="Any additional context on your retention challenge…"
        />

        <QuestionCard
          number="2"
          question="How would you describe your NRR data maturity today?"
          options={Q3_OPTIONS}
          selectedValue={answers?.q3_data ?? null}
          textValue={answers?.q3_text ?? ''}
          onSelect={(v) => setChoice('q3_data', v)}
          onTextChange={(v) => setText('q3_text', v)}
        />

        <QuestionCard
          number="3"
          question="How is your team currently structured around retention and expansion?"
          options={Q4_OPTIONS}
          selectedValue={answers?.q4_team ?? null}
          textValue={answers?.q4_text ?? ''}
          onSelect={(v) => setChoice('q4_team', v)}
          onTextChange={(v) => setText('q4_text', v)}
        />

        <QuestionCard
          number="4"
          question="What's your #1 strategic priority for NRR in the next 12 months?"
          options={Q5_OPTIONS}
          selectedValue={answers?.q5_priority ?? null}
          textValue={answers?.q5_text ?? ''}
          onSelect={(v) => setChoice('q5_priority', v)}
          onTextChange={(v) => setText('q5_text', v)}
        />

        <QuestionCard
          number="5"
          question="What is your current ARR?"
          options={Q6_OPTIONS}
          selectedValue={answers?.q6_arr ?? null}
          textValue={answers?.q6_text ?? ''}
          onSelect={(v) => setChoice('q6_arr', v)}
          onTextChange={(v) => setText('q6_text', v)}
        />

        {/* Q7 — free text only */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <div className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-sm font-bold flex items-center justify-center">
              6
            </span>
            <p className="font-semibold text-navy text-base leading-snug pt-0.5">
              Anything else you want us to know? <span className="text-slate-400 font-normal text-sm">(Optional)</span>
            </p>
          </div>
          <div className="pl-10">
            <textarea
              value={answers?.q7_anything_else ?? ''}
              onChange={(e) => setText('q7_anything_else', e.target.value)}
              placeholder="Share any context that would help us give better advice…"
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none text-text-dark"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            aria-disabled={!canContinue}
            className="bg-navy text-white font-semibold px-8 py-3 rounded-lg transition-all hover:bg-slate-800 active:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            See My Diagnosis →
          </button>
        </div>
      </main>
    </div>
  )
}

export default DiagnosticQuestions
