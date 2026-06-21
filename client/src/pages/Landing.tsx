import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isValidEmail } from '../lib/validation'
import { useAssessmentState } from '../lib/state'
import { startSession } from '../lib/api'
import { track, identifyUser } from '../lib/analytics'

// ─── Assessment Intro section ──────────────────────────────────────────────

const INTRO_ACCENT = '#2563EB'

const INTRO_AREAS = [
  { tag: 'Measure', title: 'NRR Reporting', icon: 'report', role: 'The foundation', desc: 'Knowing your true NRR — live, decomposed, and predictive — so you see where it\'s heading and act before it moves.' },
  { tag: 'Protect', title: 'Revenue Retention', icon: 'retain', role: 'Hold the base', desc: 'Keeping impact ahead of price, sensed continuously, so drift is caught and corrected before the customer feels it.' },
  { tag: 'Grow', title: 'Revenue Expansion', icon: 'expand', role: 'Grow within', desc: 'Sensing where value will outgrow price, so expansion pulls itself from the accounts already ready for it.' },
  { tag: 'Capture', title: 'Pricing Optimization', icon: 'price', role: 'Capture value', desc: 'Keeping unit price tracking cost and impact continuously, so margin is protected as it moves, not recovered after.' },
] as const

function introIcon(name: string) {
  const p = {
    width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.9,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  if (name === 'report') return (
    <svg {...p}>
      <path d="M4 19V5" /><path d="M4 19h16" />
      <rect x={7} y={11} width={3} height={5} rx={0.5} />
      <rect x={12} y={8} width={3} height={8} rx={0.5} />
      <rect x={17} y={13} width={3} height={3} rx={0.5} />
    </svg>
  )
  if (name === 'retain') return (
    <svg {...p}>
      <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z" />
    </svg>
  )
  if (name === 'expand') return (
    <svg {...p}>
      <path d="M4 14l4-4 4 3 7-7" /><path d="M15 6h5v5" />
    </svg>
  )
  return (
    <svg {...p}>
      <circle cx={12} cy={12} r={8} />
      <path d="M12 8v8" />
      <path d="M14.5 9.5C14.5 8.3 13.3 8 12 8s-2.3.7-2.3 1.8c0 2.4 4.6 1.4 4.6 3.9 0 1.1-1.2 1.8-2.3 1.8s-2.5-.5-2.5-1.7" />
    </svg>
  )
}

function AssessmentIntro() {
  const [shown, setShown] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const [swept, setSwept] = useState(false)
  const [dotActive, setDotActive] = useState([false, false, false, false])
  const [cardPhase, setCardPhase] = useState<Array<'hidden' | 'entering' | 'pulsing' | 'settled'>>([
    'hidden', 'hidden', 'hidden', 'hidden',
  ])
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setShown(true)
      setSwept(true)
      setDotActive([true, true, true, true])
      setCardPhase(['settled', 'settled', 'settled', 'settled'])
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          setShown(true)
          setSwept(true)
          const CARD_DELAYS = [150, 430, 710, 990]
          CARD_DELAYS.forEach((delay, i) => {
            setTimeout(() => {
              setDotActive(prev => { const n = [...prev]; n[i] = true; return n })
              setCardPhase(prev => { const n = [...prev]; n[i] = 'entering'; return n })
              setTimeout(() => {
                setCardPhase(prev => { const n = [...prev]; n[i] = 'pulsing'; return n })
                setTimeout(() => {
                  setCardPhase(prev => { const n = [...prev]; n[i] = 'settled'; return n })
                }, 400)
              }, 80)
            }, delay)
          })
        }
      },
      { threshold: 0.1 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={rootRef}
      style={{
        background: '#EEF1F4',
        padding: '80px 24px 96px',
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: '#0E2B41',
      }}
    >
      <style>{`
        @keyframes introSweep {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes introPulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(37,99,235,.45) }
          55%      { box-shadow: 0 0 0 7px rgba(37,99,235,0)   }
        }
        @keyframes introFloat {
          0%, 100% { transform: translateY(0) }
          50%      { transform: translateY(-4px) }
        }
        .intro-sweep {
          animation: introSweep 1.4s ease-out forwards;
          transform-origin: left center;
        }
        .intro-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          position: relative;
          padding-top: 44px;
        }
        .intro-connector {
          position: absolute;
          top: 21px;
          left: 0;
          right: 0;
          height: 2px;
          background: #E3E8EE;
          border-radius: 999px;
          overflow: hidden;
        }
        .intro-dot {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 14px;
          border-radius: 999px;
          transition: background 0.3s ease;
        }
        @media (max-width: 860px) {
          .intro-grid { grid-template-columns: repeat(2, 1fr); }
          .intro-connector { display: none; }
          .intro-dot { display: none; }
        }
        @media (max-width: 480px) {
          .intro-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .intro-sweep { animation: none !important; transform: scaleX(1) !important; }
          .intro-float, .intro-pulse { animation: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        {/* Text block */}
        <div style={{
          maxWidth: 680,
          marginBottom: 14,
          opacity: shown ? 1 : 0,
          transform: shown ? 'none' : 'translateY(26px)',
          transition: 'opacity .72s cubic-bezier(.22,1,.36,1), transform .72s cubic-bezier(.22,1,.36,1)',
        }}>

          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase',
            color: INTRO_ACCENT, marginBottom: 20,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}>
            <span style={{ width: 24, height: 1.5, background: INTRO_ACCENT, display: 'inline-block' }} />
            Before we begin
          </div>

          {/* Heading */}
          <h2 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: 700, lineHeight: 1.07, letterSpacing: '-.015em',
            color: '#0E2B41', margin: '0 0 18px',
          }}>
            Your Post-Sales Engine for What Comes Next
          </h2>

          {/* Italic subhead */}
          <p style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: 'italic', fontSize: 22, lineHeight: 1.4,
            color: INTRO_ACCENT, margin: '0 0 26px',
          }}>
            Measured against where post-sales is headed — not where it&rsquo;s been.
          </p>

          {/* Body paragraph */}
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.68, color: '#52606D', fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Post-sales is where enterprise value is won or lost now. This measures whether you can see it, price it, and act on it in time — and how far that is from the frontier.
          </p>
        </div>

        {/* Card flow */}
        <div style={{ position: 'relative', marginTop: 56 }}>

          {/* Connector line sweep */}
          <div className="intro-connector">
            <div
              className={swept ? 'intro-sweep' : undefined}
              style={{
                position: 'absolute', top: 0, height: '100%', width: '100%',
                background: 'linear-gradient(90deg, #6BA0FF 0%, #93C5FD 100%)',
                transformOrigin: 'left center',
                transform: 'scaleX(0)',
              }}
            />
          </div>

          {/* Cards */}
          <div className="intro-grid">
            {INTRO_AREAS.map((area, i) => {
              const phase = cardPhase[i]
              const isHidden = phase === 'hidden'
              const isPulsing = phase === 'pulsing'
              const canHover = phase === 'settled'
              const isSel = hovered === i && canHover

              const tagColor = isPulsing ? 'rgba(255,255,255,0.85)' : INTRO_ACCENT
              const iconBg = isPulsing ? 'rgba(255,255,255,0.18)' : (INTRO_ACCENT + '14')
              const iconColor = isPulsing ? '#FFFFFF' : INTRO_ACCENT
              const titleColor = isPulsing ? '#FFFFFF' : '#0E2B41'
              const roleColor = isPulsing ? 'rgba(255,255,255,0.72)' : '#8896A3'
              const descColor = isPulsing ? 'rgba(255,255,255,0.88)' : '#52606D'

              return (
                <div
                  key={i}
                  onMouseEnter={() => { if (canHover) setHovered(i) }}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: 'relative',
                    background: isPulsing ? '#2563EB' : '#FFFFFF',
                    border: `1px solid ${isPulsing ? '#2563EB' : (isSel ? INTRO_ACCENT : '#E3E8EE')}`,
                    borderRadius: 16,
                    padding: '26px 24px 28px',
                    cursor: 'default',
                    opacity: isHidden ? 0 : 1,
                    transform: isSel ? 'translateY(-8px)' : (isHidden ? 'translateY(20px)' : 'none'),
                    boxShadow: isSel ? '0 22px 48px rgba(14,43,65,.16)' : '0 1px 2px rgba(14,43,65,.04)',
                    transition: 'opacity 0.45s cubic-bezier(.22,1,.36,1), transform 0.45s cubic-bezier(.22,1,.36,1), background 0.18s ease, border-color 0.25s ease, box-shadow 0.32s ease',
                  }}
                >
                  {/* Dot on connector */}
                  <div
                    className={`intro-dot${isSel ? ' intro-pulse' : ''}`}
                    style={{
                      background: dotActive[i] ? (isSel ? INTRO_ACCENT : '#6BA0FF') : '#D1D9E0',
                      animation: isSel ? 'introPulse 1.8s ease-in-out infinite' : undefined,
                    }}
                  />

                  {/* Tag */}
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
                    color: tagColor, marginBottom: 16,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    transition: 'color 0.18s ease',
                  }}>
                    {area.tag}
                  </div>

                  {/* Icon */}
                  <div
                    className={isSel ? 'intro-float' : undefined}
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: iconBg,
                      color: iconColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16,
                      animation: isSel ? 'introFloat 2.4s ease-in-out infinite' : undefined,
                      transition: 'background 0.18s ease, color 0.18s ease',
                    }}
                  >
                    {introIcon(area.icon)}
                  </div>

                  {/* Title */}
                  <div style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 18, fontWeight: 700, color: titleColor, marginBottom: 4,
                    transition: 'color 0.18s ease',
                  }}>
                    {area.title}
                  </div>

                  {/* Role */}
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: roleColor, marginBottom: 12,
                    fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: '.01em',
                    transition: 'color 0.18s ease',
                  }}>
                    {area.role}
                  </div>

                  {/* Description */}
                  <p style={{
                    margin: 0, fontSize: 14, lineHeight: 1.65, color: descColor,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    transition: 'color 0.18s ease',
                  }}>
                    {area.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
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
          <img src="/loremex-logo-blue.png" alt="Loremex" style={{ height: 24, width: 'auto', filter: 'brightness(0) invert(1)', display: 'block' }} />
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
                NRR is the clearest driver of enterprise value in B2B tech — and the hardest thing
                to move. This diagnostic measures how far your post-sales engine runs from the
                frontier across Retention, Expansion, and Pricing, and shows you exactly where the
                value is leaking.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400 mb-10">
                <span>8–30 minutes depending on scope</span>
                <span className="hidden sm:inline text-slate-600">·</span>
                <span>Scored across 4 capabilities</span>
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

      {/* ── Assessment Intro ──────────────────────────────────────────── */}
      <AssessmentIntro />

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
                  I agree to receive my scorecard via email and Loremex&apos;s occasional NRR
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
          <img src="/loremex-logo-blue.png" alt="Loremex" style={{ height: 20, width: 'auto', filter: 'brightness(0) invert(1)', display: 'block' }} />
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Loremex. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
