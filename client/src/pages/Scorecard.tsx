import { useEffect, useCallback, useState, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type CapKey } from '../lib/state'
import {
  getCapabilityScore,
  getOverallMaturity,
  getMaturityStage,
  getWeakestCells,
  getCellScore,
  type AllPicks,
  type WeakestCell,
} from '../lib/scoring'
import { track } from '../lib/analytics'
import { composeRecommendation } from '../lib/recommendations'
import { computeNRR } from '../lib/nrr'
import type { PDFParams, PDFCapabilityData } from '../lib/pdfGenerator'
import { completeSession, type ScorecardPayload } from '../lib/api'
import { RecommendationBlock } from '../components/scorecard/RecommendationBlock'
import { CapabilitySummary } from '../components/scorecard/CapabilitySummary'
import { V3_ASSESSMENT_CONTENT, CAP_ORDER } from '../content/assessmentContent'

// ── Color helpers ──────────────────────────────────────────────────────────────

function cellBg(v: number | null): string {
  if (v === null) return '#F4F6F9'
  const ramp: Record<number, string> = { 1: '#EAEEF3', 2: '#D2DBE4', 3: '#AABBCC', 4: '#6E8AA6', 5: '#3E5C7C' }
  return ramp[Math.round(v)] ?? '#D2DBE4'
}

function cellFg(v: number | null): string {
  if (v === null) return '#C2CAD3'
  return Math.round(v) >= 4 ? '#FFFFFF' : '#243B52'
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  return sign + '$' + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string
  value: string
  valueSuffix?: string
  subtitle: string
  valueColor: string
  fontSize?: number
}

function KpiTile({ label, value, valueSuffix, subtitle, valueColor, fontSize = 38 }: KpiTileProps) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E3E8EE', borderRadius: 12, padding: '22px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7B89' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize, fontWeight: 700, color: valueColor, margin: '8px 0 4px', display: 'flex', alignItems: 'baseline', gap: 4 }}>
        {value}
        {valueSuffix && <span style={{ fontSize: 20, color: '#9AA7B3' }}>{valueSuffix}</span>}
      </div>
      <div style={{ fontSize: 12, color: '#9AA7B3' }}>{subtitle}</div>
    </div>
  )
}

// ── Data helpers ───────────────────────────────────────────────────────────────

function toPicks(state: ReturnType<typeof useAssessmentState>[0]): AllPicks {
  return {
    reporting: state.picks.reporting,
    retention: state.picks.retention,
    expansion: state.picks.expansion,
    pricing: state.picks.pricing,
  }
}

function deriveScorecardScope(caps: CapKey[]): 'full' | 'partial' {
  if (caps.length === 4) return 'full'
  return 'partial'
}

// ── Main component ─────────────────────────────────────────────────────────────

function Scorecard() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selCellId, setSelCellId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const sections = CAP_ORDER.filter((k) => state.selectedCapabilities.includes(k))
  const allSectionsComplete =
    sections.length > 0 && sections.every((s) => state.completedSections.includes(s))

  const picks = toPicks(state)
  const hasReporting = sections.includes('reporting')

  const overallIntelligence = getOverallMaturity(sections, picks)

  const weakestCap = (() => {
    if (sections.length === 0) return null
    const scored = sections
      .map((k) => ({ key: k, score: getCapabilityScore(k, picks) }))
      .filter((c): c is { key: CapKey; score: number } => c.score !== null)
    if (scored.length === 0) return null
    return scored.reduce((min, c) => (c.score < min.score ? c : min)).key
  })()

  const nrrResult = state.nrrInputs && !state.nrrCalculatorSkipped
    ? computeNRR(state.nrrInputs)
    : null

  const { sentences: recSentences, cta } = composeRecommendation(state.selectedCapabilities, picks)

  // Derived display values
  const reportingScore = hasReporting ? getCapabilityScore('reporting', picks) : null
  const nrrPct = nrrResult?.nrr !== null && nrrResult?.nrr !== undefined ? nrrResult.nrr * 100 : null
  const grrPct = nrrResult?.grr !== null && nrrResult?.grr !== undefined ? nrrResult.grr * 100 : null

  // Question title lookup: "${capKey}/${qId}" → title string
  const allQuestionTitleById: Record<string, string> = {}
  V3_ASSESSMENT_CONTENT.filter((c) => sections.includes(c.key as CapKey)).forEach((cap) => {
    cap.questions.forEach((q) => { allQuestionTitleById[`${cap.key}/${q.id}`] = q.title })
  })

  const pooledTop3: WeakestCell[] = getWeakestCells(sections, picks).slice(0, 3)

  // ── Animation effect ────────────────────────────────────────────────────────

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.setAttribute('data-motion', 'on')

    const reveal = () =>
      root.querySelectorAll('[data-reveal]').forEach((n) => n.setAttribute('data-inview', 'true'))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduce) { reveal(); setProgress(1); return }

    let raf: number
    let fallback: ReturnType<typeof setTimeout>
    let started = false

    const start = () => {
      if (started) return
      started = true
      reveal()
      const dur = 1200
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        setProgress(p)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (es) => { if (es.some((e) => e.isIntersecting)) { start(); io.disconnect() } },
        { threshold: 0.12 },
      )
      io.observe(root)
      fallback = setTimeout(start, 350)
      return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(fallback) }
    } else {
      start()
      return () => cancelAnimationFrame(raf)
    }
  }, [])

  // ── Build PDFParams ─────────────────────────────────────────────────────────

  const buildPDFParams = useCallback((): PDFParams => {
    const capList: PDFCapabilityData[] = sections.map((capKey) => {
      const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === capKey)!
      const overall = getCapabilityScore(capKey, picks)
      return {
        key: capKey,
        name: capContent.name,
        score: overall,
        stage: getMaturityStage(overall),
        questions: capContent.questions.map((q) => {
          const score = getCellScore(capKey, q.id, picks)
          const scenarioIdx = picks[capKey][q.id]
          const pickedText = scenarioIdx !== null && scenarioIdx !== undefined
            ? (q.scenarios[scenarioIdx as number]?.text ?? null)
            : null
          return {
            qId: q.id,
            title: q.title,
            score,
            pickedText,
            gapToL5: score !== null ? 5 - score : null,
          }
        }),
      }
    })

    return {
      email: state.email ?? '',
      generatedAt: state.completedAt ?? new Date().toISOString(),
      nrr: nrrResult?.nrr ?? null,
      grr: nrrResult?.grr ?? null,
      netMovementDollars: nrrResult?.netMovementDollars ?? null,
      netMovementPct: nrrResult?.netMovementPct ?? null,
      reportingMaturity: reportingScore,
      overallIntelligence,
      distanceToL5: overallIntelligence !== null ? 5 - overallIntelligence : null,
      capabilities: capList,
      recommendationSentences: recSentences,
      ctaText: cta.text,
      ctaUrl: cta.url,
      diagnosticAnswers: state.diagnosticAnswers,
    }
  }, [state, picks, sections, reportingScore, overallIntelligence, nrrResult, recSentences, cta])

  // ── Completion trigger ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!allSectionsComplete) return
    if (state.completedAt !== null) return

    const completedAt = new Date().toISOString()
    dispatch({ type: 'SET_COMPLETED_AT', completedAt })

    track({
      name: 'scorecard_viewed',
      props: {
        capabilities_selected: sections,
        overall_intelligence: overallIntelligence,
        weakest_capability: weakestCap,
      },
    })

    const weakestCapName = weakestCap
      ? (V3_ASSESSMENT_CONTENT.find((c) => c.key === weakestCap)?.name ?? null)
      : null

    const scorecardPayload: ScorecardPayload = {
      overallIntelligence,
      nrr: nrrResult?.nrr ?? null,
      grr: nrrResult?.grr ?? null,
      reportingMaturity: reportingScore,
      distanceToL5: overallIntelligence !== null ? 5 - overallIntelligence : null,
      weakestCapability: weakestCapName,
      capabilitiesSelected: sections,
      scope: deriveScorecardScope(sections),
      capabilityOveralls: Object.fromEntries(
        sections.map((k) => [k, getCapabilityScore(k, picks)]),
      ),
      recommendationSentences: recSentences,
    }

    const pdfParams: PDFParams = {
      email: state.email ?? '',
      generatedAt: completedAt,
      nrr: scorecardPayload.nrr,
      grr: scorecardPayload.grr,
      netMovementDollars: nrrResult?.netMovementDollars ?? null,
      netMovementPct: nrrResult?.netMovementPct ?? null,
      reportingMaturity: scorecardPayload.reportingMaturity,
      overallIntelligence,
      distanceToL5: scorecardPayload.distanceToL5,
      capabilities: sections.map((capKey) => {
        const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === capKey)!
        const overall = getCapabilityScore(capKey, picks)
        return {
          key: capKey,
          name: capContent.name,
          score: overall,
          stage: getMaturityStage(overall),
          questions: capContent.questions.map((q) => {
            const score = getCellScore(capKey, q.id, picks)
            const scenarioIdx = picks[capKey][q.id]
            const pickedText = scenarioIdx !== null && scenarioIdx !== undefined
              ? (q.scenarios[scenarioIdx as number]?.text ?? null)
              : null
            return {
              qId: q.id,
              title: q.title,
              score,
              pickedText,
              gapToL5: score !== null ? 5 - score : null,
            }
          }),
        }
      }),
      recommendationSentences: recSentences,
      ctaText: cta.text,
      ctaUrl: cta.url,
      diagnosticAnswers: state.diagnosticAnswers,
    }

    ;(async () => {
      try {
        const { generateScorecardPDF, getPDFBase64 } = await import('../lib/pdfGenerator')
        const blob = generateScorecardPDF(pdfParams)
        const pdfBase64 = await getPDFBase64(blob)
        await completeSession({
          sessionId: state.sessionId,
          contactId: state.contactId,
          email: state.email ?? '',
          completedAt,
          scorecard: scorecardPayload,
          pdfBase64,
        })
        console.log('[scorecard] completeSession succeeded')
      } catch (err) {
        console.warn('[scorecard] completeSession failed (will not retry client-side):', err)
      }
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!state.email) return <Navigate to="/" replace />
  if (state.selectedCapabilities.length === 0) return <Navigate to="/" replace />
  if (!allSectionsComplete) return <Navigate to="/assessment" replace />

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleRestart() {
    dispatch({ type: 'RESET_ALL' })
    navigate('/')
  }

  async function handleDownloadPDF() {
    setPdfDownloading(true)
    try {
      const { generateScorecardPDF } = await import('../lib/pdfGenerator')
      const params = buildPDFParams()
      const blob = generateScorecardPDF(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      const safeEmail = (state.email ?? 'unknown').replace(/[^a-z0-9]/gi, '_')
      a.href = url
      a.download = `NRR_Scorecard_${safeEmail}_${dateStr}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      track({ name: 'pdf_downloaded', props: {} })
    } finally {
      setPdfDownloading(false)
    }
  }

  // ── Animation easing ────────────────────────────────────────────────────────

  const e = 1 - Math.pow(1 - progress, 3)

  // ── JSX ─────────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E3E8EE',
    borderRadius: 14,
    padding: '30px 32px',
    marginTop: 18,
    boxShadow: '0 14px 40px rgba(14,43,65,.07)',
  }

  return (
    <div
      ref={rootRef}
      style={{ minHeight: '100vh', background: '#EEF1F4', fontFamily: "'Instrument Sans', system-ui, sans-serif", color: '#0E2B41' }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-navy focus:font-semibold focus:rounded focus:ring-2 focus:ring-brand-blue"
      >
        Skip to main content
      </a>

      {/* Nav */}
      <nav style={{ background: '#002337', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 20, color: '#FFFFFF', letterSpacing: '-0.01em' }}>Loremex</span>
          <span style={{ color: '#94A3B8', fontSize: 14 }}>NRR Intelligence Assessment</span>
        </div>
      </nav>

      <main id="main-content" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Header */}
        <div data-reveal="head" style={{ marginBottom: 30 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 42, fontWeight: 700, letterSpacing: '-0.01em', color: '#0E2B41', margin: '0 0 6px' }}>
            NRR Intelligence Scorecard
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: '#6B7B89' }}>
            A live read of where your revenue engine stands — and what moving each lever is worth.
          </p>
        </div>

        {/* KPI tiles */}
        <div data-reveal="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
          <KpiTile
            label="NRR"
            value={nrrPct !== null ? `${(nrrPct * e).toFixed(1)}%` : '—'}
            subtitle="Based on your most recent quarter"
            valueColor={nrrPct !== null ? '#0E2B41' : '#C2CAD3'}
          />
          <KpiTile
            label="GRR"
            value={grrPct !== null ? `${(grrPct * e).toFixed(1)}%` : '—'}
            subtitle="Retention before expansion"
            valueColor={grrPct !== null ? '#3D6090' : '#C2CAD3'}
          />
          {hasReporting && (
            <KpiTile
              label="Reporting Maturity"
              value={reportingScore !== null ? `${(reportingScore * e).toFixed(2)}` : '—'}
              valueSuffix={reportingScore !== null ? '/5' : undefined}
              subtitle={reportingScore !== null ? 'NRR Reporting capability' : 'Not yet measured'}
              valueColor={reportingScore !== null ? '#3D6090' : '#C2CAD3'}
            />
          )}
          <KpiTile
            label="Overall Intelligence"
            value={overallIntelligence !== null ? `${(overallIntelligence * e).toFixed(2)}` : '—'}
            valueSuffix={overallIntelligence !== null ? '/5' : undefined}
            subtitle={overallIntelligence !== null ? getMaturityStage(overallIntelligence) : 'No capabilities assessed'}
            valueColor={overallIntelligence !== null ? '#3D6090' : '#C2CAD3'}
          />
          <KpiTile
            label="Distance to L5"
            value={overallIntelligence !== null ? `${((5 - overallIntelligence) * e).toFixed(2)}` : '—'}
            subtitle="Points to best-in-class"
            valueColor={overallIntelligence !== null ? '#0E2B41' : '#C2CAD3'}
          />
          <KpiTile
            label="Net Movement"
            value={
              nrrResult?.netMovementDollars !== null && nrrResult?.netMovementDollars !== undefined
                ? fmtUSD(nrrResult.netMovementDollars * e)
                : '—'
            }
            subtitle={
              nrrResult?.netMovementPct !== null && nrrResult?.netMovementPct !== undefined
                ? `(${(nrrResult.netMovementPct * 100 * e).toFixed(1)}%) vs last quarter`
                : 'Not calculated'
            }
            valueColor={
              nrrResult?.netMovementDollars !== null && nrrResult?.netMovementDollars !== undefined
                ? (nrrResult.netMovementDollars < 0 ? '#9C6B5B' : '#4E7C66')
                : '#C2CAD3'
            }
            fontSize={30}
          />
        </div>

        {/* Capability summary (accordion) */}
        {sections.length > 0 && (
          <div data-reveal="caps" style={{ ...cardStyle }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#0E2B41', margin: '0 0 16px' }}>
              Capability Summary
            </h2>
            <CapabilitySummary picks={picks} selectedCaps={sections} />
          </div>
        )}

        {/* Top 3 questions — pooled across all selected caps */}
        {pooledTop3.length > 0 && (
          <div data-reveal="top" style={{ marginTop: 26 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7B89', marginBottom: 14 }}>
              3 highest-impact areas to address
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {pooledTop3.map((lv, k) => {
                const cellKey = `${lv.capKey}/${lv.qId}`
                const isSel = selCellId === cellKey
                const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === lv.capKey)
                const capDisplayName = capContent?.name ?? lv.capKey
                return (
                  <div
                    key={cellKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelCellId(isSel ? null : cellKey)}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setSelCellId(isSel ? null : cellKey) }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.transform = 'translateY(-3px)' }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'none' }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr auto auto',
                      alignItems: 'center',
                      gap: 16,
                      background: '#FFFFFF',
                      border: `1px solid ${isSel ? '#3D6090' : '#E3E8EE'}`,
                      borderRadius: 12,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, border-color .2s',
                      boxShadow: isSel ? '0 12px 30px rgba(14,43,65,.12)' : 'none',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#C2CAD3' }}>{k + 1}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#243B52' }}>{allQuestionTitleById[cellKey] ?? lv.qId}</div>
                      <div style={{ fontSize: 12, color: '#AEB8C2', marginTop: 2 }}>{capDisplayName}</div>
                    </div>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: cellFg(lv.score), background: cellBg(lv.score), padding: '5px 14px', borderRadius: 8 }}>
                      {lv.score}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7B89', whiteSpace: 'nowrap' }}>
                      +{lv.gapToL5} to L5
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div style={{ marginTop: 36 }}>
          <RecommendationBlock />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 56 }}>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={pdfDownloading}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              padding: '12px 36px',
              borderRadius: 10,
              border: 'none',
              cursor: pdfDownloading ? 'not-allowed' : 'pointer',
              opacity: pdfDownloading ? 0.6 : 1,
              transition: 'opacity .2s, transform .15s',
            }}
            onMouseEnter={(ev) => { if (!pdfDownloading) ev.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'none' }}
          >
            {pdfDownloading ? 'Generating PDF…' : 'Download PDF Report'}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            style={{ fontSize: 13, color: '#9AA7B3', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            Restart Assessment
          </button>
        </div>
      </main>
    </div>
  )
}

export default Scorecard
