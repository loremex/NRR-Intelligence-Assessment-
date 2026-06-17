import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type DiagnosticBlockKey } from '../lib/state'
import { DIAGNOSTIC_QUESTIONS, PRIORITY_OPTIONS, BLOCK_LABELS } from '../content/diagnosticTemplates'
import { track } from '../lib/analytics'

// ─── Sub-components ───────────────────────────────────────────────────────────

interface BlockCardProps {
  blockKey: DiagnosticBlockKey
  block: string
  question: string
  contextLine: string
  options: ReadonlyArray<{ score: 1 | 2 | 3 | 4; text: string }>
  selectedScore: 1 | 2 | 3 | 4 | null
  freeText: string | null
  onSelect: (score: 1 | 2 | 3 | 4) => void
  onTextChange: (text: string) => void
  index: number
}

function BlockCard({
  blockKey,
  block,
  question,
  contextLine,
  options,
  selectedScore,
  freeText,
  onSelect,
  onTextChange,
  index,
}: BlockCardProps) {
  const [showText, setShowText] = useState(false)
  const fieldName = `q-${blockKey}`

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-sm font-bold flex items-center justify-center">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <span className="inline-block mb-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase text-brand-blue bg-blue-50">
            {block}
          </span>
          <p className="font-bold text-navy text-base leading-snug mb-1">{question}</p>
          <p className="text-sm text-slate-500 leading-relaxed">{contextLine}</p>
        </div>
      </div>

      <div className="space-y-2 pl-10">
        {options.map((opt) => (
          <label
            key={opt.score}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all select-none ${
              selectedScore === opt.score
                ? 'border-navy bg-slate-50 ring-1 ring-navy'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name={fieldName}
              value={opt.score}
              checked={selectedScore === opt.score}
              onChange={() => onSelect(opt.score)}
              className="mt-0.5 accent-navy shrink-0"
            />
            <span className="text-sm text-text-dark leading-relaxed">{opt.text}</span>
          </label>
        ))}

        {selectedScore && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              className="text-xs text-brand-blue hover:underline focus:outline-none"
            >
              {showText ? '− Hide note' : '+ Tell us more (optional)'}
            </button>
            {showText && (
              <textarea
                value={freeText ?? ''}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Add any context about your current situation…"
                rows={2}
                maxLength={400}
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

  const canContinue =
    !!answers?.q1_reporting.choice &&
    !!answers?.q2_retention.choice &&
    !!answers?.q3_expansion.choice &&
    !!answers?.q4_pricing.choice &&
    !!answers?.q5_priority.choice

  function handleContinue() {
    track({ name: 'diagnostic_completed', props: {} })
    navigate('/diagnostic-result')
  }

  const blockKeys: DiagnosticBlockKey[] = ['q1_reporting', 'q2_retention', 'q3_expansion', 'q4_pricing']

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
            6 Quick Questions
          </h1>
          <p className="text-text-dark text-sm sm:text-base leading-relaxed max-w-xl">
            A 90-second diagnostic across Reporting, Retention, Expansion, and Pricing.
            Pick what fits — add detail if you want.
          </p>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {/* Q1-Q4: capability blocks */}
        {DIAGNOSTIC_QUESTIONS.map((q, i) => {
          const blockKey = blockKeys[i]
          const blockAnswer = answers?.[blockKey]
          return (
            <BlockCard
              key={q.block}
              blockKey={blockKey}
              block={BLOCK_LABELS[q.block]}
              question={q.question}
              contextLine={q.contextLine}
              options={q.options}
              selectedScore={blockAnswer?.choice ?? null}
              freeText={blockAnswer?.freeText ?? null}
              onSelect={(score) => dispatch({ type: 'SET_DIAGNOSTIC_BLOCK_CHOICE', block: blockKey, choice: score })}
              onTextChange={(text) => dispatch({ type: 'SET_DIAGNOSTIC_BLOCK_TEXT', block: blockKey, text })}
              index={i + 1}
            />
          )
        })}

        {/* Q5: strategic priority */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-navy text-white text-sm font-bold flex items-center justify-center">
              5
            </span>
            <p className="font-bold text-navy text-lg leading-snug pt-0.5">
              If you could only fix one thing in the next 6 months, what would it be?
            </p>
          </div>

          <div className="space-y-2 pl-10">
            {PRIORITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all select-none ${
                  answers?.q5_priority.choice === opt.value
                    ? 'border-navy bg-slate-50 ring-1 ring-navy'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="q5_priority"
                  value={opt.value}
                  checked={answers?.q5_priority.choice === opt.value}
                  onChange={() => dispatch({ type: 'SET_DIAGNOSTIC_PRIORITY_CHOICE', choice: opt.value })}
                  className="accent-navy"
                />
                <span className="text-sm text-text-dark">{opt.text}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q6: free text (optional) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-sm font-bold flex items-center justify-center">
              6
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-base leading-snug">
                Anything else we should know about your situation?
                <span className="ml-1 text-slate-400 font-normal text-sm">(Optional)</span>
              </p>
            </div>
          </div>
          <div className="pl-10">
            <textarea
              value={answers?.q6_anything_else.freeText ?? ''}
              onChange={(e) => dispatch({ type: 'SET_DIAGNOSTIC_ANYTHING_ELSE', text: e.target.value })}
              placeholder="Any context that would help us give better advice…"
              rows={3}
              maxLength={500}
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
