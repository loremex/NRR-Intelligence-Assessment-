import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState } from '../lib/state'
import { getDiagnosticTemplate, getQ2Label, getQ3Label, getQ4Label, getQ5Label, getQ6Label } from '../content/diagnosticTemplates'
import { EVUpliftCard } from '../components/scorecard/EVUpliftCard'
import { track } from '../lib/analytics'
import { sendDiagnostic } from '../lib/api'

const CALENDLY_URL =
  (import.meta.env.VITE_CALENDLY_URL as string | undefined) ?? 'https://calendly.com/loremex/intro'

function DiagnosticVerdict() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()
  const sentRef = useRef(false)

  const answers = state.diagnosticAnswers
  const template =
    answers?.q2_retention && answers?.q5_priority
      ? getDiagnosticTemplate(answers.q2_retention, answers.q5_priority)
      : null

  useEffect(() => {
    if (!answers || !template || sentRef.current) return
    sentRef.current = true

    sendDiagnostic({
      sessionId: state.sessionId,
      contactId: state.contactId,
      email: state.email!,
      completedAt: new Date().toISOString(),
      verdictTitle: template.verdictTitle,
      recommendations: template.recommendations,
      answers: {
        q2: answers.q2_retention!,
        q2_label: getQ2Label(answers.q2_retention!),
        q2_text: answers.q2_text,
        q3: answers.q3_data!,
        q3_label: getQ3Label(answers.q3_data!),
        q3_text: answers.q3_text,
        q4: answers.q4_team!,
        q4_label: getQ4Label(answers.q4_team!),
        q4_text: answers.q4_text,
        q5: answers.q5_priority!,
        q5_label: getQ5Label(answers.q5_priority!),
        q5_text: answers.q5_text,
        q6: answers.q6_arr!,
        q6_label: getQ6Label(answers.q6_arr!),
        q6_text: answers.q6_text,
        q7_text: answers.q7_anything_else,
      },
    }).catch((err: unknown) => {
      console.error('[DiagnosticVerdict] sendDiagnostic failed:', err)
    })
  }, [answers, template, state.sessionId, state.contactId, state.email])

  if (!state.email) return <Navigate to="/" replace />
  if (!answers) return <Navigate to="/diagnostic" replace />
  if (!template) return <Navigate to="/diagnostic" replace />

  function handleGoDeeper() {
    if (!template) return
    dispatch({ type: 'SET_PRE_SELECTED_CAPABILITIES', capabilities: template.preSelectedCapabilities })
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

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Verdict card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
            Diagnosis
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy mb-4 leading-tight">
            {template.verdictTitle}
          </h1>
          <p className="text-text-dark text-sm sm:text-base leading-relaxed mb-6">
            {template.verdictDescription}
          </p>

          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Where to focus
            </p>
            <ol className="space-y-3">
              {template.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-text-dark leading-relaxed">{rec}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* EV uplift (only shown if NRR was calculated) */}
        <EVUpliftCard />

        {/* CTA block */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-navy mb-2">
            Ready to act on this?
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Book a call with Loremex to walk through your diagnosis, or go deeper with the full
            assessment to benchmark yourself capability-by-capability.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-navy text-white font-semibold px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              onClick={() => track({ name: 'book_call_clicked', props: {} })}
            >
              Book a call with Loremex →
            </a>
            <button
              type="button"
              onClick={handleGoDeeper}
              className="flex-1 text-center bg-white text-navy font-semibold px-6 py-3 rounded-lg border-2 border-navy hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              Go Deeper: Full Assessment →
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            The full assessment takes 15–45 minutes depending on which capabilities you choose.
            Your diagnostic answers have been used to pre-select the most relevant sections.
          </p>
        </div>
      </main>
    </div>
  )
}

export default DiagnosticVerdict
