import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isValidEmail } from '../lib/validation'
import { useAssessmentState } from '../lib/state'
import { startSession } from '../lib/api'
import { track, identifyUser } from '../lib/analytics'

// ─── What you'll get — static data ────────────────────────────────────────

interface WYGCap {
  name: string
  score: number
  blurb: string
  dims: { People: number; Process: number; Technology: number; Data: number }
}

const WYG_CAPS: WYGCap[] = [
  {
    name: 'Revenue Retention',
    score: 3.2,
    blurb: 'You hold the base well, but saves are reactive rather than orchestrated.',
    dims: { People: 3.4, Process: 3.0, Technology: 3.1, Data: 3.3 },
  },
  {
    name: 'Revenue Expansion',
    score: 2.8,
    blurb: "Upsell happens, but signals and plays aren't yet systematic.",
    dims: { People: 2.9, Process: 2.6, Technology: 2.7, Data: 3.0 },
  },
  {
    name: 'Pricing Optimization',
    score: 2.4,
    blurb: 'Pricing is largely intuition-led with limited experimentation.',
    dims: { People: 2.2, Process: 2.5, Technology: 2.3, Data: 2.6 },
  },
  {
    name: 'NRR Reporting',
    score: 3.8,
    blurb: 'Strong visibility — your reporting is closest to best-in-class.',
    dims: { People: 3.6, Process: 3.7, Technology: 4.0, Data: 3.9 },
  },
]

const WYG_LEVELS = ['', 'Foundational', 'Developing', 'Accountable', 'Managed', 'Predictive']

const WYG_FEATURES: { title: string; body: string; color: string; icon: 'gauge' | 'gap' | 'target' }[] = [
  {
    title: 'Intelligence score',
    body: 'Rated L1–L5 across People, Process, Technology, and Data for each capability.',
    color: '#1F3A5C',
    icon: 'gauge',
  },
  {
    title: 'Gap analysis',
    body: 'Distance to L5 (Predictive) — see precisely how far you are from best-in-class.',
    color: '#3D6090',
    icon: 'gap',
  },
  {
    title: 'Recommendation',
    body: 'One prioritised action block based on your weakest dimension and capability.',
    color: '#76859A',
    icon: 'target',
  },
]

function wygColor(v: number): string {
  if (v >= 3.5) return '#1F3A5C'
  if (v >= 3.0) return '#3D6090'
  if (v >= 2.6) return '#76859A'
  return '#9AA3AE'
}

// ─── What you'll get — sub-components ─────────────────────────────────────

function CapRow({
  cap,
  color,
  pct,
  selected,
  onSelect,
}: {
  cap: WYGCap
  color: string
  pct: number
  selected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          onSelect()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 160px) 1fr 46px',
        alignItems: 'center',
        gap: 18,
        padding: '15px 14px',
        cursor: 'pointer',
        borderRadius: 10,
        background: selected ? 'rgba(31,58,92,.05)' : hovered ? '#F4F7FB' : 'transparent',
        boxShadow: selected ? `inset 3px 0 0 ${color}` : 'inset 3px 0 0 transparent',
        transition: 'background .25s ease, box-shadow .25s ease',
      }}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#0E2B41',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {cap.name}
      </span>
      <div style={{ position: 'relative', height: 9, borderRadius: 999, background: '#EAEEF3' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: 9,
            width: `${pct}%`,
            borderRadius: 999,
            background: color,
            transition: 'background .25s',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'Spectral', Georgia, serif",
          fontSize: 19,
          fontWeight: 700,
          color,
          textAlign: 'right',
        }}
      >
        {cap.score.toFixed(1)}
      </span>
    </div>
  )
}

function DetailPanel({ cap, color, level }: { cap: WYGCap; color: string; level: number }) {
  const dims = Object.entries(cap.dims) as [string, number][]
  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid #E3E8EE',
        borderRadius: 12,
        padding: '24px 26px',
        display: 'grid',
        gridTemplateColumns: '1fr 1px 1.05fr',
        gap: 26,
        alignItems: 'center',
      }}
    >
      {/* Left: capability info + level ladder */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 4,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#0E2B41',
            }}
          >
            {cap.name}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color,
              background: color + '1A',
              padding: '4px 10px',
              borderRadius: 999,
            }}
          >
            L{level} · {WYG_LEVELS[level]}
          </span>
        </div>
        <p
          style={{
            margin: '6px 0 16px',
            fontSize: 14,
            lineHeight: 1.55,
            color: '#52606D',
            maxWidth: 360,
          }}
        >
          {cap.blurb}
        </p>
        {/* Level ladder */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((L) => (
            <div key={L} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: L <= level ? color : '#E2E8EF',
                  transition: 'background .3s',
                }}
              />
              <div
                style={{
                  marginTop: 7,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: L === level ? color : '#A6B0BB',
                }}
              >
                L{L}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: L === level ? '#52606D' : '#C2CAD3',
                  marginTop: 2,
                }}
              >
                {WYG_LEVELS[L]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ background: '#E3E8EE', alignSelf: 'stretch', width: 1 }} />

      {/* Right: dimension breakdown */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#6B7B89',
            marginBottom: 14,
          }}
        >
          L1–L5 across dimensions
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {dims.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr 34px',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#52606D' }}>{k}</span>
              <div style={{ height: 7, borderRadius: 999, background: '#E7ECF2' }}>
                <div
                  style={{
                    height: 7,
                    width: `${(v / 5) * 100}%`,
                    borderRadius: 999,
                    background: color,
                    transition: 'width .55s cubic-bezier(.22,1,.36,1)',
                  }}
                />
              </div>
              <span
                style={{ fontSize: 13, fontWeight: 700, color: '#0E2B41', textAlign: 'right' }}
              >
                {v.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  title,
  body,
  color,
  icon,
}: {
  title: string
  body: string
  color: string
  icon: 'gauge' | 'gap' | 'target'
}) {
  const [hovered, setHovered] = useState(false)

  const renderIcon = () => {
    if (icon === 'gauge')
      return (
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 14 16 9" />
          <path d="M4 18a8 8 0 1 1 16 0" />
          <circle cx={12} cy={14} r={1.4} fill={color} stroke="none" />
        </svg>
      )
    if (icon === 'gap')
      return (
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h6" />
          <path d="M13 12h6" />
          <path d="M5 8v8" />
          <path d="M19 8v8" />
        </svg>
      )
    return (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={12} cy={12} r={8} />
        <circle cx={12} cy={12} r={3.5} />
      </svg>
    )
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E3E8EE',
        borderRadius: 14,
        padding: '26px 24px',
        borderTop: `3px solid ${color}`,
        transition: 'transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s ease',
        cursor: 'default',
        transform: hovered ? 'translateY(-6px)' : 'none',
        boxShadow: hovered ? '0 18px 40px rgba(14,43,65,.14)' : 'none',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: color + '14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {renderIcon()}
      </div>
      <div
        style={{
          fontFamily: "'Spectral', Georgia, serif",
          fontSize: 20,
          fontWeight: 700,
          color: '#0E2B41',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#52606D' }}>{body}</p>
    </div>
  )
}

// ─── What you'll get section ───────────────────────────────────────────────

function WhatYoullGet() {
  const [inView, setInView] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sel, setSel] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setInView(true)
      setProgress(1)
      return
    }
    const start = () => {
      setInView(true)
      const dur = 1150
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        setProgress(p)
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start()
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(root)
    return () => {
      io.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const eased = 1 - Math.pow(1 - progress, 3)
  const nrrDisp = Math.round(108 * eased)
  const intelDisp = (3.2 * eased).toFixed(1)
  const gapDisp = (1.8 * eased).toFixed(1)
  const selectedCap = WYG_CAPS[sel]!
  const capColor = wygColor(selectedCap.score)
  const capLevel = Math.round(selectedCap.score)

  return (
    <section
      ref={containerRef}
      data-motion="on"
      style={{
        background: '#EEF1F4',
        padding: '72px 24px 88px',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        {/* Heading */}
        <div
          data-reveal="head"
          data-inview={inView ? 'true' : undefined}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <h2
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontSize: 'clamp(36px, 4.5vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#0E2B41',
              margin: '0 0 18px',
            }}
          >
            What you'll get
          </h2>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: '#52606D',
              margin: '0 auto',
              maxWidth: 560,
            }}
          >
            A structured scorecard showing your NRR intelligence level across four capabilities —
            and a prioritised focus area to move the number.
          </p>
        </div>

        {/* Main card */}
        <div
          data-reveal="card"
          data-inview={inView ? 'true' : undefined}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E3E8EE',
            borderRadius: 14,
            padding: 34,
            boxShadow: '0 18px 50px rgba(14,43,65,.10)',
          }}
        >

          {/* Headline tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 16,
              marginBottom: 34,
            }}
          >
            {/* NRR tile */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 12,
                padding: '24px 22px',
                background: 'linear-gradient(160deg, #0E2B41, #163C5C)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#9FBDE4',
                }}
              >
                Your NRR
              </div>
              <div
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontWeight: 700,
                  lineHeight: 1,
                  margin: '12px 0',
                  color: '#FFFFFF',
                  fontSize: 46,
                }}
              >
                {nrrDisp}%
              </div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: '#5B6B7B',
                  background: '#EAEEF3',
                  padding: '6px 12px',
                  borderRadius: 999,
                }}
              >
                Net positive
              </span>
            </div>

            {/* Intelligence tile */}
            <div
              style={{
                borderRadius: 12,
                padding: '24px 22px',
                background: '#F4F7FB',
                border: '1px solid #E3E8EE',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#6B7B89',
                }}
              >
                Intelligence
              </div>
              <div
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontWeight: 700,
                  lineHeight: 1,
                  margin: '12px 0',
                  color: '#0E2B41',
                  fontSize: 46,
                }}
              >
                {intelDisp}
                <span style={{ fontSize: 22, color: '#9AA7B3' }}>/5</span>
              </div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: '#3D6090',
                  background: '#EAEFF5',
                  padding: '6px 12px',
                  borderRadius: 999,
                }}
              >
                L3 · Accountable
              </span>
            </div>

            {/* Gap tile */}
            <div
              style={{
                borderRadius: 12,
                padding: '24px 22px',
                background: '#F4F7FB',
                border: '1px solid #E3E8EE',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#6B7B89',
                }}
              >
                Gap to L5
              </div>
              <div
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontWeight: 700,
                  lineHeight: 1,
                  margin: '12px 0',
                  color: '#0E2B41',
                  fontSize: 46,
                }}
              >
                {gapDisp}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: '#76859A',
                  background: '#EEF1F4',
                  padding: '6px 12px',
                  borderRadius: 999,
                }}
              >
                Points to best-in-class
              </span>
            </div>
          </div>

          {/* Cap rows header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#6B7B89',
              }}
            >
              Capability scores
            </div>
            <div style={{ fontSize: 12, color: '#9AA7B3' }}>Click a capability to explore</div>
          </div>

          {/* Cap rows */}
          <div style={{ borderTop: '1px solid #EEF1F4' }}>
            {WYG_CAPS.map((c, i) => (
              <CapRow
                key={c.name}
                cap={c}
                color={wygColor(c.score)}
                pct={(c.score / 5) * 100 * eased}
                selected={i === sel}
                onSelect={() => setSel(i)}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div style={{ marginTop: 18 }}>
            <DetailPanel cap={selectedCap} color={capColor} level={capLevel} />
          </div>

        </div>

        {/* Feature cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            marginTop: 28,
          }}
        >
          {WYG_FEATURES.map((f) => (
            <FeatureCard key={f.title} title={f.title} body={f.body} color={f.color} icon={f.icon} />
          ))}
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
      <WhatYoullGet />

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
