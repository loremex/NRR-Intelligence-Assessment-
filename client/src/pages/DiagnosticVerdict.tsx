import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState } from '../lib/state'
import {
  computeDiagnosticScores,
  getDiagnosticTemplate,
  MATURITY_STAGE_DESCRIPTIONS,
  MATURITY_LABELS,
  BLOCK_DISPLAY_NAMES,
  BLOCK_PRIORITY,
  type DiagnosticBlock,
  type MaturityStage,
} from '../content/diagnosticTemplates'
import { track } from '../lib/analytics'
import { sendDiagnostic } from '../lib/api'

const CALENDLY_URL =
  (import.meta.env.VITE_CALENDLY_URL as string | undefined) ?? 'https://calendar.app.google/wy6MEepxij2biy8y6'

const STAGE_COLOR: Record<MaturityStage, string> = {
  Reactive:    '#6B7B89',
  Diagnostic:  '#8696A6',
  Operational: '#2E63EE',
  Optimized:   '#1B45B0',
  Intelligent: '#0D7050',
}

const STAGES: MaturityStage[] = ['Reactive', 'Diagnostic', 'Operational', 'Optimized', 'Intelligent']

// ─── Radar chart ─────────────────────────────────────────────────────────────

function RadarChart({ vals }: { vals: [number, number, number, number] }) {
  const size = 236, cx = 118, cy = 118, R = 80
  const ang = (i: number) => (-90 + i * 90) * (Math.PI / 180)
  const pt = (frac: number, i: number): [number, number] => [
    cx + R * frac * Math.cos(ang(i)),
    cy + R * frac * Math.sin(ang(i)),
  ]

  const axes = ['Reporting', 'Retention', 'Expansion', 'Pricing']
  const rings = [0.25, 0.5, 0.75, 1].map((f, i) => {
    const pts = axes.map((_, j) => pt(f, j).join(',')).join(' ')
    return <polygon key={`r${i}`} points={pts} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={1} />
  })
  const axisLines = axes.map((_, i) => {
    const [x, y] = pt(1, i)
    return <line key={`a${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.18)" strokeWidth={1} />
  })
  const dataPoints = vals.map((v, i) => pt(v, i))
  const dataStr = dataPoints.map((p) => p.join(',')).join(' ')
  const anchors = ['middle', 'start', 'middle', 'end'] as const
  const dy = [-8, 4, 16, 4]
  const labels = axes.map((a, i) => {
    const [x, y] = pt(1.18, i)
    return (
      <text
        key={`l${i}`}
        x={x} y={y + dy[i]}
        textAnchor={anchors[i]}
        fontSize={11} fontWeight={700}
        fill="#9FB4C9"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {a}
      </text>
    )
  })
  const verts = dataPoints.map((p, i) => (
    <circle key={`v${i}`} cx={p[0]} cy={p[1]} r={4} fill="#FFFFFF" />
  ))

  return (
    <svg
      data-nrr="radar"
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: '250px', display: 'block', margin: '0 auto', overflow: 'visible' }}
    >
      {rings}
      {axisLines}
      <polygon points={dataStr} fill="rgba(111,160,255,.26)" stroke="#6FA0FF" strokeWidth={2} strokeLinejoin="round" />
      {verts}
      {labels}
    </svg>
  )
}

// ─── Block score card ─────────────────────────────────────────────────────────

function BlockCard({
  block,
  score,
  isWeakest,
}: {
  block: DiagnosticBlock
  score: 1 | 2 | 3 | 4 | 5
  isWeakest: boolean
}) {
  const stage = MATURITY_LABELS[score]
  const color = STAGE_COLOR[stage]
  const fillPct = (score / 5) * 100

  return (
    <div
      data-reveal="block"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E3E8EE',
        borderRadius: '6px',
        padding: '26px 30px 24px',
        marginBottom: '14px',
        boxShadow: '0 1px 2px rgba(14,43,65,.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: '23px', fontWeight: 600, color: '#0E2B41' }}>
            {BLOCK_DISPLAY_NAMES[block]}
          </span>
          {isWeakest && (
            <span
              data-nrr="pulse"
              style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '.12em',
                textTransform: 'uppercase', color: '#2E63EE', background: '#E6EDFD',
                padding: '5px 9px', borderRadius: '4px',
              }}
            >
              BIGGEST GAP
            </span>
          )}
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color, background: color + '1F',
          padding: '6px 13px', borderRadius: '999px', whiteSpace: 'nowrap',
        }}>
          {stage}
        </span>
      </div>

      {/* Progress track */}
      <div style={{ position: 'relative', height: '10px', borderRadius: '999px', background: '#E3E8EE' }}>
        <div
          data-nrr="fill"
          style={{ position: 'absolute', left: 0, top: 0, height: '10px', width: `${fillPct}%`, borderRadius: '999px', background: color }}
        />
        {[20, 40, 60, 80].map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p}%`, top: 0, width: '2px', height: '10px', background: '#FFFFFF' }} />
        ))}
        <div
          data-nrr="marker"
          style={{
            position: 'absolute', left: `${fillPct}%`, marginLeft: '-9px', top: '-4px',
            width: '18px', height: '18px', borderRadius: '999px',
            background: '#fff', border: `4px solid ${color}`,
            boxShadow: '0 2px 6px rgba(14,43,65,.28)',
          }}
        />
      </div>

      {/* Stage labels */}
      <div style={{ display: 'flex', marginTop: '11px' }}>
        {STAGES.map((s) => (
          <div key={s} style={{
            flex: 1, textAlign: 'center', fontSize: '10px', fontWeight: 700,
            letterSpacing: '.1em', textTransform: 'uppercase',
            color: s === stage ? color : '#9AA7B3',
          }}>
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function DiagnosticVerdict() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()
  const rootRef = useRef<HTMLDivElement>(null)
  const sentRef = useRef(false)

  // Reveal animations
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    root.setAttribute('data-motion', 'on')
    root.querySelectorAll('[data-reveal="block"]').forEach((n, i) => {
      (n as HTMLElement).style.transitionDelay = `${i * 0.09}s`
    })
    if (reduce || !('IntersectionObserver' in window)) {
      root.querySelectorAll('[data-reveal]').forEach((n) => n.setAttribute('data-inview', 'true'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.setAttribute('data-inview', 'true'); io.unobserve(e.target) }
      }),
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    root.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  const answers = state.diagnosticAnswers
  const scores = answers ? computeDiagnosticScores(answers) : null
  const template =
    scores && answers?.q5_priority.choice
      ? getDiagnosticTemplate(scores.weakestBlock, answers.q5_priority.choice)
      : null

  useEffect(() => {
    if (!answers || !scores || !template || sentRef.current) return
    if (!answers.q5_priority.choice) return
    sentRef.current = true
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
    }).catch((err: unknown) => {
      console.error('[DiagnosticVerdict] sendDiagnostic failed:', err)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, scores, template])

  if (!state.email) return <Navigate to="/" replace />
  if (!answers || !scores || !template) return <Navigate to="/diagnostic" replace />
  if (!answers.q5_priority.choice) return <Navigate to="/diagnostic" replace />

  const sortedBlocks: DiagnosticBlock[] = [
    scores.weakestBlock,
    ...BLOCK_PRIORITY.filter((b) => b !== scores.weakestBlock),
  ]

  function handleGoDeeper() {
    const capMap: Record<DiagnosticBlock, import('../lib/state').CapKey> = {
      reporting: 'reporting',
      retention: 'retention',
      expansion: 'expansion',
      pricing:   'pricing',
    }
    dispatch({ type: 'SET_PRE_SELECTED_CAPABILITIES', capabilities: [capMap[scores!.weakestBlock]] })
    track({ name: 'go_deeper_clicked', props: {} })
    navigate('/selection')
  }

  async function handleDownloadDiagnosticPDF() {
    const { generateDiagnosticPDF } = await import('../lib/pdfGenerator')
    const blob = generateDiagnosticPDF({
      email: state.email ?? '',
      generatedAt: new Date().toISOString(),
      maturityStage: scores!.maturityStage,
      weakestBlock: scores!.weakestBlock,
      strongestBlock: scores!.strongestBlock,
      blockScores: scores!.blockScores as Record<string, 1 | 2 | 3 | 4 | 5>,
      verdictDescription: template!.description,
      recommendations: template!.recommendations as [string, string, string],
      q1_text: answers!.q1_reporting.freeText ?? null,
      q2_text: answers!.q2_retention.freeText ?? null,
      q3_text: answers!.q3_expansion.freeText ?? null,
      q4_text: answers!.q4_pricing.freeText ?? null,
      q6_text: answers!.q6_anything_else.freeText ?? null,
      ctaUrl: CALENDLY_URL,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().split('T')[0]
    const safeEmail = (state.email ?? 'unknown').replace(/[^a-z0-9]/gi, '_')
    a.href = url
    a.download = `NRR_Diagnostic_${safeEmail}_${dateStr}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    track({ name: 'diagnostic_pdf_downloaded', props: {} })
  }

  const radarVals: [number, number, number, number] = [
    scores.blockScores.reporting / 5,
    scores.blockScores.retention / 5,
    scores.blockScores.expansion / 5,
    scores.blockScores.pricing / 5,
  ]
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div
      ref={rootRef}
      style={{
        minHeight: '100vh',
        background: '#EEF1F4',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: '#0E2B41',
        padding: '56px 24px 72px',
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-navy focus:font-semibold focus:rounded focus:ring-2 focus:ring-brand-blue"
      >
        Skip to main content
      </a>

      <div id="main-content" style={{ maxWidth: '940px', margin: '0 auto' }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          data-reveal="header"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(14,43,65,.16)',
            marginBottom: '42px',
          }}
        >
          <div style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: '23px', fontWeight: 700, letterSpacing: '.02em', color: '#0E2B41' }}>
            Loremex
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#2E63EE' }}>
              Revenue Intelligence Report
            </div>
            <div style={{ fontSize: '12px', color: '#6B7B89', marginTop: '3px' }}>
              {dateStr} · Confidential
            </div>
          </div>
        </div>

        {/* ── Intro ───────────────────────────────────────────────────── */}
        <div data-reveal="intro" style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#2E63EE', marginBottom: '14px' }}>
            NRR Intelligence Diagnostic
          </div>
          <h1 style={{
            fontFamily: "'Spectral', Georgia, serif",
            fontSize: 'clamp(36px, 5vw, 58px)',
            fontWeight: 700, lineHeight: 1.04, letterSpacing: '-.01em',
            color: '#0E2B41', margin: '0 0 16px',
          }}>
            Your NRR Intelligence Diagnostic
          </h1>
          <p style={{ fontFamily: "'Spectral', Georgia, serif", fontStyle: 'italic', fontSize: '19px', lineHeight: 1.5, color: '#5B6B79', margin: 0, maxWidth: '620px' }}>
            Based on your answers across Reporting, Retention, Expansion, and Pricing.
          </p>
        </div>

        {/* ── Hero card ───────────────────────────────────────────────── */}
        <div
          data-reveal="hero"
          className="nrr-hero-grid"
          style={{
            background: '#0E2B41',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '6px',
            padding: '40px 44px',
            display: 'grid',
            gap: '40px',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(14,43,65,.20)',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#A9C4EC' }}>
              Overall Stage
            </div>
            <div style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: '54px', fontWeight: 700, color: '#6FA0FF', lineHeight: 1, margin: '10px 0 16px' }}>
              {scores.maturityStage}
            </div>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.65, color: 'rgba(233,240,248,.95)', maxWidth: '440px' }}>
              {MATURITY_STAGE_DESCRIPTIONS[scores.maturityStage]}
            </p>
            {/* Stage tracker */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '26px', maxWidth: '470px' }}>
              {STAGES.map((s) => {
                const isActive = s === scores.maturityStage
                return (
                  <div key={s} style={{ flex: 1 }}>
                    <div
                      data-nrr={isActive ? 'pulse' : undefined}
                      style={{ height: '6px', borderRadius: '999px', background: isActive ? '#6FA0FF' : 'rgba(255,255,255,.16)' }}
                    />
                    <div style={{ marginTop: '9px', fontSize: '9px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: isActive ? '#6FA0FF' : 'rgba(206,219,233,.9)' }}>
                      {s}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <RadarChart vals={radarVals} />
            <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, letterSpacing: '.06em', color: '#A9C4EC', marginTop: '14px', textTransform: 'uppercase' }}>
              Maturity across four dimensions
            </div>
          </div>
        </div>

        {/* ── Block Scores ────────────────────────────────────────────── */}
        <div
          data-reveal="scores-head"
          style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '56px 0 20px' }}
        >
          <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#0E2B41', margin: 0 }}>
            Block Scores
          </h2>
          <span style={{ fontSize: '12px', color: '#6B7B89' }}>Four dimensions assessed</span>
        </div>

        {sortedBlocks.map((block) => (
          <BlockCard
            key={block}
            block={block}
            score={scores.blockScores[block]}
            isWeakest={block === scores.weakestBlock}
          />
        ))}

        {/* ── Verdict ─────────────────────────────────────────────────── */}
        <div
          data-reveal="verdict"
          style={{
            background: '#0E2B41',
            borderRadius: '6px',
            padding: '40px 44px',
            marginTop: '40px',
            boxShadow: '0 10px 30px rgba(14,43,65,.20)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6FA0FF', marginBottom: '18px' }}>
            Verdict
          </div>
          <p style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: '25px', lineHeight: 1.4, color: '#FFFFFF', margin: '0 0 20px', fontWeight: 500 }}>
            Your strongest area is{' '}
            <span style={{ color: '#6FA0FF' }}>{BLOCK_DISPLAY_NAMES[scores.strongestBlock]}</span>.
            {' '}Your biggest gap is{' '}
            <span style={{ color: '#9FB4C9', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationThickness: '1px' }}>
              {BLOCK_DISPLAY_NAMES[scores.weakestBlock]}
            </span>.
          </p>
          <p style={{ fontSize: '16px', lineHeight: 1.75, color: 'rgba(233,240,248,.92)', margin: 0, maxWidth: '680px' }}>
            {template.description}
          </p>
        </div>

        {/* ── CTAs ────────────────────────────────────────────────────── */}
        <div
          data-reveal="cta"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E3E8EE',
            borderRadius: '6px',
            padding: '32px 36px',
            marginTop: '28px',
            boxShadow: '0 1px 2px rgba(14,43,65,.05)',
          }}
        >
          <div style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: '22px', fontWeight: 700, color: '#0E2B41', marginBottom: '12px' }}>
            Ready to act on this?
          </div>
          <p style={{ fontSize: '15px', color: '#6B7B89', lineHeight: 1.65, margin: '0 0 24px' }}>
            Book a 30-minute call to walk through your results with our team, or take the full
            20-minute diagnostic to benchmark yourself capability-by-capability with a detailed
            PDF scorecard.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="nrr-cta-primary"
              style={{ flex: '1 1 200px', textAlign: 'center', fontWeight: 600, fontSize: '15px', padding: '14px 24px', borderRadius: '6px', textDecoration: 'none' }}
              onClick={() => track({ name: 'book_call_clicked', props: {} })}
            >
              Book a 30-min call →
            </a>
            <button
              type="button"
              onClick={handleGoDeeper}
              className="nrr-cta-secondary"
              style={{ flex: '1 1 200px', fontWeight: 600, fontSize: '15px', padding: '14px 24px', borderRadius: '6px' }}
            >
              Take the Full 20-min Diagnostic →
            </button>
          </div>
          <p style={{ marginTop: '14px', fontSize: '12px', color: '#9AA7B3', lineHeight: 1.6, margin: '14px 0 0' }}>
            The full assessment takes 15–45 minutes depending on which capabilities you choose.
            We&rsquo;ve pre-selected <strong>{BLOCK_DISPLAY_NAMES[scores.weakestBlock]}</strong> based on your results.
          </p>
        </div>

        {/* ── PDF soft link ───────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '13px', color: '#9AA7B3' }}>
            Or download your diagnostic as a{' '}
            <button
              type="button"
              onClick={handleDownloadDiagnosticPDF}
              style={{
                fontSize: '13px', color: '#9AA7B3', background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px',
                padding: 0, fontFamily: 'inherit',
              }}
              onMouseEnter={(ev) => { ev.currentTarget.style.color = '#0E2B41' }}
              onMouseLeave={(ev) => { ev.currentTarget.style.color = '#9AA7B3' }}
            >
              PDF →
            </button>
          </span>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div
          data-reveal="footer"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '36px', paddingTop: '18px',
            borderTop: '1px solid rgba(14,43,65,.14)',
            fontSize: '11px', fontWeight: 600, letterSpacing: '.12em',
            textTransform: 'uppercase', color: '#6B7B89',
          }}
        >
          <span>Loremex</span>
          <span>NRR Intelligence Diagnostic</span>
        </div>

      </div>
    </div>
  )
}

export default DiagnosticVerdict
