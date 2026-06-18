import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isValidEmail } from '../lib/validation'
import { useAssessmentState } from '../lib/state'
import { startSession } from '../lib/api'
import { track, identifyUser } from '../lib/analytics'

// ─── Sample scorecard data (static, for visual preview only) ───────────────

const SAMPLE_CAPABILITIES = [
  { label: 'Revenue Retention', score: 3.2, colorClass: 'bg-level-3' },
  { label: 'Revenue Expansion', score: 2.8, colorClass: 'bg-level-2' },
  { label: 'Pricing Optimization', score: 2.4, colorClass: 'bg-level-2' },
  { label: 'NRR Reporting', score: 3.8, colorClass: 'bg-level-4' },
]

// ─── Sub-components ────────────────────────────────────────────────────────

function SampleScorecard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Headline tiles */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-gray-light rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your NRR</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-navy">108%</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-brand-blue">
            Net positive
          </span>
        </div>
        <div className="bg-gray-light rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Intelligence</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-navy">
            3.2<span className="text-base text-slate-400">/5</span>
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-brand-blue">
            Accountable
          </span>
        </div>
        <div className="bg-gray-light rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gap to L5</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-navy">1.8</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            Points
          </span>
        </div>
      </div>

      {/* Mini capability heatmap */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Capability scores</p>
        <div className="space-y-3">
          {SAMPLE_CAPABILITIES.map(({ label, score, colorClass }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-text-dark w-40 sm:w-48 shrink-0">{label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div
                  className={`${colorClass} h-2 rounded-full transition-all`}
                  style={{ width: `${(score / 5) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-navy w-8 text-right tabular-nums">
                {score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────

function Landing() {
  const navigate = useNavigate()
  const [, dispatch] = useAssessmentState()
  const formSectionRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isFormValid = isValidEmail(email) && consent

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function validateEmail(value: string): string | null {
    if (!value.trim()) return 'Email address is required'
    if (!isValidEmail(value)) return 'Please enter a valid email address'
    return null
  }

  function handleEmailBlur() {
    setEmailError(validateEmail(email))
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    if (emailError && isValidEmail(value)) setEmailError(null)
  }

  function handleConsentChange(checked: boolean) {
    setConsent(checked)
    if (checked && consentError) setConsentError(null)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const emailErr = validateEmail(email)
    const consentErr = !consent ? 'You must agree to continue' : null
    setEmailError(emailErr)
    setConsentError(consentErr)
    if (emailErr || consentErr) {
      track({ name: 'email_submitted', props: { valid: false } })
      return
    }

    track({ name: 'email_submitted', props: { valid: true } })
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const normalised = email.trim().toLowerCase()
      const result = await startSession({ email: normalised, consent: true })
      dispatch({ type: 'SET_EMAIL', email: normalised, consent: true })
      dispatch({ type: 'SET_SESSION', sessionId: result.sessionId, contactId: result.contactId })
      track({ name: 'session_started', props: { session_id: result.sessionId } })
      identifyUser(result.contactId ?? result.sessionId, { email: normalised })
      navigate('/calculator')
    } catch (err) {
      setIsSubmitting(false)
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <div className="min-h-screen font-body">
      {/* Skip link for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-navy focus:font-semibold focus:rounded focus:ring-2 focus:ring-brand-blue"
      >
        Skip to main content
      </a>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <span className="font-display font-bold text-xl text-white tracking-tight">
            Loremex
          </span>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-navy text-white">
        <div className="grid md:grid-cols-2 md:min-h-[720px]">

          {/* Left column — text */}
          <div className="px-6 py-20 md:py-0 flex items-center">
            <div className="w-full max-w-xl mx-auto md:ml-auto md:mr-0 md:pr-10 lg:pr-16">
              <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-5">
                NRR Intelligence Assessment — Free
              </p>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6">
                NRR. Measured. Activated.
              </h1>
              <p className="text-slate-300 text-lg sm:text-xl mb-8 leading-relaxed">
                Most PE-backed SaaS companies track NRR. Few have the capability to move it. This
                diagnostic scores your company across Retention, Expansion, and Pricing
                Optimization — and tells you exactly where the gap is.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400 mb-10">
                <span>8–30 minutes depending on scope</span>
                <span className="hidden sm:inline text-slate-600">·</span>
                <span>Scored across 4 capabilities</span>
                <span className="hidden sm:inline text-slate-600">·</span>
                <span>Downloadable PDF report</span>
              </div>
              <button
                onClick={scrollToForm}
                className="bg-brand-blue hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-navy"
              >
                Start the Assessment
              </button>
            </div>
          </div>

          {/* Right column — decorative geometric image, desktop only */}
          <div className="hidden md:block overflow-hidden">
            <img
              src="/hero-pattern.jpeg"
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>

        </div>
      </section>

      {/* ── What you'll get ───────────────────────────────────────────── */}
      <section className="bg-gray-light py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy mb-4">
              What you'll get
            </h2>
            <p className="text-text-dark text-lg max-w-xl mx-auto">
              A structured scorecard showing your NRR intelligence level across four capabilities
              — and a prioritised focus area to move the number.
            </p>
          </div>
          <SampleScorecard />
          <div className="mt-10 grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            {[
              {
                heading: 'Intelligence score',
                body: 'Rated L1–L5 across People, Process, Technology, and Data for each capability.',
              },
              {
                heading: 'Gap analysis',
                body: 'Distance to L5 (Predictive) — see precisely how far you are from best-in-class.',
              },
              {
                heading: 'Recommendation',
                body: 'One prioritised action block based on your weakest dimension and capability combination.',
              },
            ].map(({ heading, body }) => (
              <div key={heading} className="bg-white rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-navy mb-2">{heading}</h3>
                <p className="text-sm text-text-dark leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Email gate ───────────────────────────────────────────────── */}
      <section id="main-content" className="bg-white py-20 px-6">
        <div ref={formSectionRef} className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-navy mb-3">
              Start your free assessment
            </h2>
            <p className="text-text-dark">
              Enter your work email to access the assessment and receive your personalised scorecard.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email field */}
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-text-dark mb-1.5">
                Work email{' '}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="you@company.com"
                aria-required="true"
                aria-invalid={emailError ? 'true' : 'false'}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={`w-full px-4 py-3 rounded-lg border text-text-dark placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors ${
                  emailError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                }`}
              />
              {emailError && (
                <p id="email-error" role="alert" className="mt-1.5 text-sm text-red-600">
                  {emailError}
                </p>
              )}
            </div>

            {/* Consent checkbox */}
            <div className="mb-8">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => handleConsentChange(e.target.checked)}
                  aria-required="true"
                  aria-invalid={consentError ? 'true' : 'false'}
                  aria-describedby={consentError ? 'consent-error' : undefined}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-blue focus:ring-2 focus:ring-brand-blue"
                />
                <span className="text-sm text-text-dark leading-relaxed">
                  I agree to receive my scorecard via email and Loremex's occasional NRR
                  Intelligence insights. Unsubscribe anytime.
                </span>
              </label>
              {consentError && (
                <p
                  id="consent-error"
                  role="alert"
                  className="mt-1.5 ml-7 text-sm text-red-600"
                >
                  {consentError}
                </p>
              )}
            </div>

            {submitError && (
              <p role="alert" className="mb-4 text-sm text-red-600 text-center">
                {submitError}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              aria-disabled={!isFormValid || isSubmitting}
              title={
                !isFormValid
                  ? 'Please enter a valid email and agree to receive your scorecard'
                  : undefined
              }
              className="w-full bg-brand-blue text-white font-semibold py-4 rounded-lg transition-all hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              {isSubmitting ? 'Starting…' : 'Start Assessment'}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-5">
            Free. No credit card. Takes 8–30 minutes.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-navy px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display font-bold text-white">Loremex</span>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Loremex. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
