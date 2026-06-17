import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type DiagnosticBlockKey, type DiagnosticPriority } from '../lib/state'
import { track } from '../lib/analytics'

// ─── Inline question config ───────────────────────────────────────────────────

interface QuestionConfig {
  id: DiagnosticBlockKey
  blockLabel: string
  question: string
  contextLine: string
  options: [string, string, string, string]
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: 'q1_reporting',
    blockLabel: 'NRR REPORTING',
    question: 'How confident are you to present your NRR number to the board?',
    contextLine: 'Your NRR number is only useful if it\'s defensible. Board moments expose every gap in your measurement.',
    options: [
      'We\'ve punted the NRR question — finance, CS, and RevOps would each give a different number',
      'We have one number but it takes a week to pull and I don\'t fully trust it',
      'We have a trusted number quarterly, but board meetings sometimes catch us with stale data',
      'Our NRR view is current, defensible, and ready for any board moment',
    ],
  },
  {
    id: 'q2_retention',
    blockLabel: 'REVENUE RETENTION',
    question: 'Can you detect churn risk before it shows up in cancellations?',
    contextLine: 'By the time a customer hands in notice, the conversation is already lost. Early signal beats late heroics.',
    options: [
      'We usually find out at renewal — sometimes after the customer has already decided',
      'CS has hunches based on relationship signals, but it\'s anecdotal',
      'We have a risk-scoring layer; CS reviews flagged accounts but action is uneven',
      'Risk signals trigger defined save plays in real time — and we measure win rates',
    ],
  },
  {
    id: 'q3_expansion',
    blockLabel: 'REVENUE EXPANSION',
    question: 'Is account growth a system in your company — or just your best AEs closing one-offs?',
    contextLine: 'A handful of heroic reps can hide a missing motion. Repeatability is what investors price.',
    options: [
      'Expansion happens when a customer asks; we don\'t drive it',
      'Our best reps know how to expand — the others don\'t replicate it',
      'We have an expansion motion but coverage is uneven across the book',
      'Expansion is a measurable engine — usage signals trigger plays that close consistently',
    ],
  },
  {
    id: 'q4_pricing',
    blockLabel: 'PRICING OPTIMIZATION',
    question: 'How would you assess your pricing alignment to customer value?',
    contextLine: 'Pricing discipline is where value capture happens — or quietly leaks away.',
    options: [
      'We haven\'t seriously revisited pricing in years — discounting fills the gap',
      'Our pricing isn\'t really tied to customer outcomes — it\'s based on what closes deals',
      'We have a pricing framework but limited visibility into how it ties to the value customers actually realize',
      'Our pricing is anchored to measurable customer outcomes — and discount discipline is enforced',
    ],
  },
]

interface Q5Option {
  value: DiagnosticPriority
  text: string
}

const Q5_OPTIONS: Q5Option[] = [
  { value: 'retention', text: 'Reduce churn (stop the bleeding)' },
  { value: 'expansion', text: 'Drive expansion in existing accounts' },
  { value: 'pricing',   text: 'Fix pricing & packaging' },
  { value: 'reporting', text: 'Build the measurement foundation first' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

interface BlockCardProps {
  blockKey: DiagnosticBlockKey
  blockLabel: string
  question: string
  contextLine: string
  options: readonly string[]
  selectedScore: 1 | 2 | 3 | 4 | null
  freeText: string | null
  onSelect: (score: 1 | 2 | 3 | 4) => void
  onTextChange: (text: string) => void
  index: number
}

function BlockCard({
  blockKey,
  blockLabel,
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
            {blockLabel}
          </span>
          <p className="font-bold text-navy text-base leading-snug mb-1">{question}</p>
          <p className="text-sm text-slate-500 leading-relaxed">{contextLine}</p>
        </div>
      </div>

      <div className="space-y-2 pl-10">
        {options.map((text, i) => {
          const score = (i + 1) as 1 | 2 | 3 | 4
          return (
            <label
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all select-none ${
                selectedScore === score
                  ? 'border-navy bg-slate-50 ring-1 ring-navy'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name={fieldName}
                value={i}
                checked={selectedScore === score}
                onChange={() => onSelect(score)}
                className="mt-0.5 accent-navy shrink-0"
              />
              <span className="text-sm text-text-dark leading-relaxed">{text}</span>
            </label>
          )
        })}

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
        {/* Q1–Q4: capability blocks */}
        {QUESTIONS.map((q, i) => {
          const blockAnswer = answers?.[q.id]
          return (
            <BlockCard
              key={q.id}
              blockKey={q.id}
              blockLabel={q.blockLabel}
              question={q.question}
              contextLine={q.contextLine}
              options={q.options}
              selectedScore={blockAnswer?.choice ?? null}
              freeText={blockAnswer?.freeText ?? null}
              onSelect={(score) => dispatch({ type: 'SET_DIAGNOSTIC_BLOCK_CHOICE', block: q.id, choice: score })}
              onTextChange={(text) => dispatch({ type: 'SET_DIAGNOSTIC_BLOCK_TEXT', block: q.id, text })}
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
              If you could only fix ONE thing in the next 6 months, what would it be?
            </p>
          </div>

          <div className="space-y-2 pl-10">
            {Q5_OPTIONS.map((opt) => (
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
