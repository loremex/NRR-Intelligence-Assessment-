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
import { computeNRR, formatCurrency } from '../lib/nrr'
import type { PDFParams, PDFCapabilityData } from '../lib/pdfGenerator'
import { completeSession, type ScorecardPayload } from '../lib/api'
import { RecommendationBlock } from '../components/scorecard/RecommendationBlock'
import { CapabilitySummary } from '../components/scorecard/CapabilitySummary'
import { LeakHero } from '../components/scorecard/LeakHero'
import { ImpactCards } from '../components/scorecard/ImpactCards'
import { V3_ASSESSMENT_CONTENT, CAP_ORDER } from '../content/assessmentContent'

const LEVEL_NAMES = [
  '',
  'Blind',
  'Named, not measured',
  'Measured, not live',
  'Surfaced and steering',
  'Continuous and self-correcting',
]

// ── Color helpers ──────────────────────────────────────────────────────────────

function scoreColor(v: number | null): string {
  if (v === null) return '#A7B0BC'
  if (v >= 3.4) return '#2563EB'
  if (v >= 3.0) return '#5B7FB0'
  if (v >= 2.7) return '#8C9CB0'
  return '#A7B0BC'
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
    <div style={{ background: '#FFFFFF', border: '1px solid #E3E8EE', borderRadius: 13, padding: '20px 18px' }}>
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
  const rootRef = useRef<HTMLDivElement>(null)

  const sections = CAP_ORDER.filter((k) => state.selectedCapabilities.includes(k))
  const allSectionsComplete =
    sections.length > 0 && sections.every((s) => state.completedSections.includes(s))

  const picks = toPicks(state)
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

  const reportingScore = sections.includes('reporting') ? getCapabilityScore('reporting', picks) : null
  const nrrPct = nrrResult?.nrr != null ? nrrResult.nrr * 100 : null
  const grrPct = nrrResult?.grr != null ? nrrResult.grr * 100 : null

  // Question title lookup: "${capKey}/${qId}" → title string
  const allQuestionTitleById: Record<string, string> = {}
  V3_ASSESSMENT_CONTENT.filter((c) => sections.includes(c.key as CapKey)).forEach((cap) => {
    cap.questions.forEach((q) => { allQuestionTitleById[`${cap.key}/${q.id}`] = q.title })
  })

  const pooledTop3: WeakestCell[] = getWeakestCells(sections, picks).slice(0, 3)

  const allCapScores = CAP_ORDER.map((k) => ({
    key: k,
    name: V3_ASSESSMENT_CONTENT.find((c) => c.key === k)?.name ?? k,
    score: sections.includes(k) ? getCapabilityScore(k, picks) : null,
  }))

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

    const expansionDollars = nrrResult !== null
      ? (nrrResult.netMovementDollars ?? 0) + (nrrResult.leakDollars ?? 0)
      : null

    return {
      email: state.email ?? '',
      generatedAt: state.completedAt ?? new Date().toISOString(),
      nrr: nrrResult?.nrr ?? null,
      grr: nrrResult?.grr ?? null,
      netMovementDollars: nrrResult?.netMovementDollars ?? null,
      netMovementPct: nrrResult?.netMovementPct ?? null,
      leakDollars: nrrResult?.leakDollars ?? null,
      expansionDollars,
      reportingMaturity: reportingScore,
      overallIntelligence,
      distanceToL5: overallIntelligence !== null ? 5 - overallIntelligence : null,
      capabilities: capList,
      allCapabilityScores: allCapScores,
      recommendationSentences: recSentences,
      ctaText: cta.text,
      ctaUrl: cta.url,
    }
  }, [state, picks, sections, reportingScore, overallIntelligence, nrrResult, recSentences, cta, allCapScores])

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

    const expansionDollars = nrrResult !== null
      ? (nrrResult.netMovementDollars ?? 0) + (nrrResult.leakDollars ?? 0)
      : null

    const pdfParams: PDFParams = {
      email: state.email ?? '',
      generatedAt: completedAt,
      nrr: scorecardPayload.nrr,
      grr: scorecardPayload.grr,
      netMovementDollars: nrrResult?.netMovementDollars ?? null,
      netMovementPct: nrrResult?.netMovementPct ?? null,
      leakDollars: nrrResult?.leakDollars ?? null,
      expansionDollars,
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
      allCapabilityScores: allCapScores,
      recommendationSentences: recSentences,
      ctaText: cta.text,
      ctaUrl: cta.url,
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

  // ── Stage badge ─────────────────────────────────────────────────────────────

  const overallLevel = overallIntelligence !== null
    ? Math.max(1, Math.min(5, Math.round(overallIntelligence)))
    : null

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      style={{ minHeight: '100vh', background: '#EEF1F4', fontFamily: "Georgia, 'Times New Roman', serif", color: '#0E2B41' }}
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
          <img src="/loremex-logo-blue.png" alt="Loremex" style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)', display: 'block' }} />
          <span style={{ color: '#94A3B8', fontSize: 14 }}>NRR Intelligence Assessment</span>
        </div>
      </nav>

      <main id="main-content" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Header + stage badge */}
        <div data-reveal="head" style={{ marginBottom: 30 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 42, fontWeight: 700, letterSpacing: '-0.01em', color: '#0E2B41', margin: '0 0 12px' }}>
            NRR Intelligence Scorecard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
            {overallLevel !== null && (
              <span style={{
                background: '#0E2B41',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 14px',
                borderRadius: 999,
                letterSpacing: '.04em',
              }}>
                L{overallLevel} · {LEVEL_NAMES[overallLevel]}
              </span>
            )}
            <p style={{ margin: 0, fontSize: 15, color: '#6B7B89' }}>
              A live read of where your revenue engine stands — and what moving each lever is worth.
            </p>
          </div>
        </div>

        {/* Leak hero + concentrated (only when calculator not skipped) */}
        {!state.nrrCalculatorSkipped && nrrResult && state.nrrInputs && (
          <LeakHero nrrResult={nrrResult} nrrInputs={state.nrrInputs} />
        )}

        {/* 5 KPI tiles */}
        <div data-reveal="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 20, marginBottom: 16 }}>
          <KpiTile
            label="NRR"
            value={nrrPct !== null ? `${(nrrPct * e).toFixed(1)}%` : '—'}
            subtitle="Based on your most recent quarter"
            valueColor={nrrPct !== null ? scoreColor(nrrPct / 100 * 5) : '#C2CAD3'}
          />
          <KpiTile
            label="GRR"
            value={grrPct !== null ? `${(grrPct * e).toFixed(1)}%` : '—'}
            subtitle="Retention before expansion"
            valueColor={grrPct !== null ? '#3D6090' : '#C2CAD3'}
          />
          <KpiTile
            label="Overall Intelligence"
            value={overallIntelligence !== null ? `${(overallIntelligence * e).toFixed(2)}` : '—'}
            valueSuffix={overallIntelligence !== null ? '/5' : undefined}
            subtitle={overallIntelligence !== null ? getMaturityStage(overallIntelligence) : 'No capabilities assessed'}
            valueColor={overallIntelligence !== null ? scoreColor(overallIntelligence) : '#C2CAD3'}
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
              nrrResult?.netMovementDollars != null
                ? formatCurrency(nrrResult.netMovementDollars * e, { compact: true })
                : '—'
            }
            subtitle={
              nrrResult?.netMovementPct != null
                ? `(${(nrrResult.netMovementPct * 100 * e).toFixed(1)}%) vs last quarter`
                : 'Not calculated'
            }
            valueColor={
              nrrResult?.netMovementDollars != null
                ? (nrrResult.netMovementDollars < 0 ? '#9C6B5B' : '#4E7C66')
                : '#C2CAD3'
            }
            fontSize={30}
          />
        </div>

        {/* Capability summary */}
        {sections.length > 0 && (
          <div data-reveal="caps" style={{
            background: '#FFFFFF',
            border: '1px solid #E3E8EE',
            borderRadius: 16,
            padding: '30px 32px',
            marginTop: 18,
            boxShadow: '0 14px 40px rgba(14,43,65,.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#0E2B41', margin: 0 }}>
                Capability Summary
              </h2>
              <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 12, color: '#9AA7B3' }}>
                Click a capability to explore
              </span>
            </div>
            <CapabilitySummary picks={picks} selectedCaps={sections} />
          </div>
        )}

        {/* Impact cards */}
        <ImpactCards pooledTop3={pooledTop3} allQuestionTitleById={allQuestionTitleById} />

        {/* Recommendation + CTA */}
        <RecommendationBlock
          sentences={recSentences}
          cta={cta}
          onDownloadPDF={handleDownloadPDF}
          pdfDownloading={pdfDownloading}
          leakDollars={nrrResult?.leakDollars ?? null}
          capabilityScores={allCapScores}
        />

        {/* Restart */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
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
