import { useEffect, useRef, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState } from '../lib/state'
import {
  computeDiagnosticScores,
  getDiagnosticTemplate,
  getDivergenceNote,
  MATURITY_STAGE_DESCRIPTIONS,
  MATURITY_COLORS,
  MATURITY_LABELS,
  BLOCK_DISPLAY_NAMES,
  BLOCK_PRIORITY,
  type DiagnosticBlock,
} from '../content/diagnosticTemplates'
import { EVUpliftCard } from '../components/scorecard/EVUpliftCard'
import { computeNRR } from '../lib/nrr'
import { computeEVUplift } from '../lib/evUplift'
import { track } from '../lib/analytics'
import { sendDiagnostic } from '../lib/api'
import type { EVEmailData } from '../lib/api'

const CALENDLY_URL =
  (import.meta.env.VITE_CALENDLY_URL as string | undefined) ?? 'https://calendly.com/loremex/intro'

// ─── Block score bar ──────────────────────────────────────────────────────────

function BlockScoreBar({
  block,
  score,
  isWeakest,
}: {
  block: DiagnosticBlock
  score: 1 | 2 | 3 | 4
  isWeakest: boolean
}) {
  const colors = MATURITY_COLORS[score]
  const label = MATURITY_LABELS[score]
  const fillPct = (score / 4) * 100

  return (
    <div className={`p-4 rounded-lg ${isWeakest ? 'border-2 border-red-300 bg-red-50' : 'border border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-navy">{BLOCK_DISPLAY_NAMES[block]}</span>
          {isWeakest && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-100">
              Biggest gap
            </span>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          {label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full transition-all ${colors.bar}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function DiagnosticVerdict() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()
  const sentRef = useRef(false)

  const answers = state.diagnosticAnswers
  const scores = answers ? computeDiagnosticScores(answers) : null
  const template =
    scores && answers?.q5_priority.choice
      ? getDiagnosticTemplate(scores.weakestBlock, answers.q5_priority.choice)
      : null

  // Build EV data for email (same calc EVUpliftCard uses)
  const buildEVEmailData = useCallback((): EVEmailData | null => {
    if (!state.nrrInputs || state.nrrCalculatorSkipped) return null
    const nrrResult = computeNRR(state.nrrInputs)
    const evResult = computeEVUplift(state.nrrInputs.startingMRR, nrrResult.nrr)
    if (!evResult) return null
    const startingARR = (state.nrrInputs.startingMRR ?? 0) * 12
    return {
      scenarios: evResult.scenarios.map((s) => ({
        label: s.label,
        ppDelta: s.ppDelta,
        ppCapped: s.ppCapped,
        evUplift: s.evUplift,
      })),
      topOfMarketMessage: evResult.topOfMarketMessage,
      startingMRRFormatted: startingARR >= 1_000_000
        ? `$${(startingARR / 1_000_000).toFixed(1)}M ARR`
        : `$${Math.round(startingARR / 1_000)}K ARR`,
    }
  }, [state.nrrInputs, state.nrrCalculatorSkipped])

  useEffect(() => {
    if (!answers || !scores || !template || sentRef.current) return
    if (!answers.q5_priority.choice) return
    sentRef.current = true

    const evUplift = buildEVEmailData()

    sendDiagnostic({
      sessionId: state.sessionId,
      contactId: state.contactId,
      email: state.email!,
      completedAt: new Date().toISOString(),
      maturityStage: scores.maturityStage,
      weakestBlock: scores.weakestBlock,
      strongestBlock: scores.strongestBlock,
      blockScores: scores.blockScores,
      q5Priority: answers.q5_priority.choice,
      verdictDescription: template.description,
      recommendations: template.recommendations,
      answers: {
        q1_score: scores.blockScores.reporting,
        q1_text: answers.q1_reporting.freeText,
        q2_score: scores.blockScores.retention,
        q2_text: answers.q2_retention.freeText,
        q3_score: scores.blockScores.expansion,
        q3_text: answers.q3_expansion.freeText,
        q4_score: scores.blockScores.pricing,
        q4_text: answers.q4_pricing.freeText,
        q5_priority: answers.q5_priority.choice,
        q6_text: answers.q6_anything_else.freeText,
      },
      evUplift,
    }).catch((err: unknown) => {
      console.error('[DiagnosticVerdict] sendDiagnostic failed:', err)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, scores, template])

  if (!state.email) return <Navigate to="/" replace />
  if (!answers || !scores || !template) return <Navigate to="/diagnostic" replace />
  if (!answers.q5_priority.choice) return <Navigate to="/diagnostic" replace />

  const divergenceNote = getDivergenceNote(scores.weakestBlock, answers.q5_priority.choice)

  // Sort blocks: weakest first, then by priority order for the rest
  const sortedBlocks: DiagnosticBlock[] = [
    scores.weakestBlock,
    ...BLOCK_PRIORITY.filter((b) => b !== scores.weakestBlock),
  ]

  function handleGoDeeper() {
    // Pre-select the weakest block capability
    const capMap: Record<DiagnosticBlock, import('../lib/state').CapKey> = {
      reporting: 'measurement',
      retention: 'retention',
      expansion: 'expansion',
      pricing:   'pricing',
    }
    dispatch({ type: 'SET_PRE_SELECTED_CAPABILITIES', capabilities: [capMap[scores!.weakestBlock]] })
    track({ name: 'go_deeper_clicked', props: {} })
    navigate('/selection')
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
          <span className="text-slate-400 text-sm">Your Diagnosis</span>
        </div>
      </nav>

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div>
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
            NRR Intelligence Diagnostic
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy mb-1">
            Your NRR Intelligence Diagnostic
          </h1>
          <p className="text-slate-500 text-sm italic">
            Based on your answers across Reporting, Retention, Expansion, and Pricing.
          </p>
        </div>

        {/* Maturity stage banner */}
        <div className={`rounded-2xl p-6 border ${
          scores.maturityStage === 'Reactive'    ? 'bg-red-50 border-red-200' :
          scores.maturityStage === 'Diagnostic'  ? 'bg-amber-50 border-amber-200' :
          scores.maturityStage === 'Operational' ? 'bg-green-50 border-green-200' :
                                                   'bg-emerald-50 border-emerald-200'
        }`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
            Overall Stage
          </p>
          <p className={`font-display text-3xl font-bold mb-2 ${
            scores.maturityStage === 'Reactive'    ? 'text-red-700' :
            scores.maturityStage === 'Diagnostic'  ? 'text-amber-700' :
            scores.maturityStage === 'Operational' ? 'text-green-700' :
                                                     'text-emerald-700'
          }`}>
            {scores.maturityStage}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {MATURITY_STAGE_DESCRIPTIONS[scores.maturityStage]}
          </p>
        </div>

        {/* Block score bars (weakest first) */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Block Scores
          </p>
          {sortedBlocks.map((block) => (
            <BlockScoreBar
              key={block}
              block={block}
              score={scores.blockScores[block]}
              isWeakest={block === scores.weakestBlock}
            />
          ))}
        </div>

        {/* Verdict card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
            Verdict
          </p>
          <p className="text-text-dark text-sm sm:text-base leading-relaxed mb-2">
            <span className="font-semibold text-navy">
              Your strongest area is {BLOCK_DISPLAY_NAMES[scores.strongestBlock]} ({MATURITY_LABELS[scores.blockScores[scores.strongestBlock]]}).
            </span>
            {' '}Your biggest gap is <span className="font-semibold text-navy">{BLOCK_DISPLAY_NAMES[scores.weakestBlock]}</span>.
          </p>
          <p className="text-text-dark text-sm sm:text-base leading-relaxed">
            {template.description}
          </p>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Where to focus — {BLOCK_DISPLAY_NAMES[scores.weakestBlock]}
          </p>
          <ol className="space-y-4">
            {template.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-text-dark leading-relaxed">{rec}</p>
              </li>
            ))}
          </ol>

          {divergenceNote && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed italic">{divergenceNote}</p>
            </div>
          )}
        </div>

        {/* EV uplift (only shown if NRR was calculated) */}
        <EVUpliftCard />

        {/* CTAs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-navy mb-2">
            Ready to act on this?
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Book a 30-minute call to walk through your results with our team, or take the full
            20-minute diagnostic to benchmark yourself capability-by-capability with a detailed
            PDF scorecard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-navy text-white font-semibold px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              onClick={() => track({ name: 'book_call_clicked', props: {} })}
            >
              Book a 30-min call →
            </a>
            <button
              type="button"
              onClick={handleGoDeeper}
              className="flex-1 text-center bg-white text-navy font-semibold px-6 py-3 rounded-lg border-2 border-navy hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              Take the Full 20-min Diagnostic →
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            The full assessment takes 15–45 minutes depending on which capabilities you choose.
            We've pre-selected <strong>{BLOCK_DISPLAY_NAMES[scores.weakestBlock]}</strong> based on your results.
          </p>
        </div>

      </main>
    </div>
  )
}

export default DiagnosticVerdict
