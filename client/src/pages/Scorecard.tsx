import { useEffect, useCallback, useState, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type ActionCapKey, type CapKey } from '../lib/state'
import { getCapability, getLevelColor } from '../lib/rubric'
import { getCapabilityOverall, getThreeWeakestLevers, DIMS, getActionDimAvg, getCrossCapDimAvg, getMeasurementOverall, getLeverAvg, type AllPicks } from '../lib/scoring'
import { track } from '../lib/analytics'
import { composeRecommendation } from '../lib/recommendations'
import { computeNRR, formatCurrency } from '../lib/nrr'
import { computeEVUplift } from '../lib/evUplift'
import type { PDFParams, PDFCapabilityData, PDFCrossCapRow } from '../lib/pdfGenerator'
import { completeSession, type ScorecardPayload } from '../lib/api'
import { MeasurementHeatmap } from '../components/scorecard/MeasurementHeatmap'
import { RecommendationBlock } from '../components/scorecard/RecommendationBlock'
import type { MeasurementCapability, ActionCapability } from '../lib/rubric-schema'

const CAP_ORDER: CapKey[] = ['measurement', 'retention', 'expansion', 'pricing']
const MATRIX_COLS = '1.7fr .62fr .62fr .62fr .62fr .82fr .72fr'

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

function fmtM(v: number): string {
  if (Math.abs(v) >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return v.toFixed(1)
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

function GaugeSVG({ score, progress }: { score: number | null; progress: number }) {
  const R = 26
  const C = 2 * Math.PI * R
  const frac = score !== null ? (score / 5) * progress : 0
  const displayScore = score !== null ? (score * progress).toFixed(1) : '—'
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width={68} height={68} viewBox="0 0 68 68">
        <circle cx={34} cy={34} r={R} fill="none" stroke="#EAEEF3" strokeWidth={7} />
        <circle
          cx={34} cy={34} r={R}
          fill="none" stroke="#3D6090" strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${C * frac} ${C}`}
          transform="rotate(-90 34 34)"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#0E2B41' }}>
        {displayScore}
      </div>
    </div>
  )
}

function HeatCell({ value, display }: { value: number | null; display?: string }) {
  const text = display ?? (value === null ? '—' : String(value))
  return (
    <div
      style={{ margin: 3, borderRadius: 6, background: cellBg(value), color: cellFg(value), fontSize: 14, fontWeight: 700, textAlign: 'center', padding: '11px 0', transition: 'transform .15s ease', cursor: 'default' }}
      onMouseEnter={(ev) => { ev.currentTarget.style.transform = 'scale(1.08)' }}
      onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'none' }}
    >
      {text}
    </div>
  )
}

// ── Data helpers ───────────────────────────────────────────────────────────────

function toPicks(state: ReturnType<typeof useAssessmentState>[0]): AllPicks {
  return {
    measurement: state.picks.measurement,
    retention: state.picks.retention,
    expansion: state.picks.expansion,
    pricing: state.picks.pricing,
  }
}

function deriveScorecardScope(
  caps: CapKey[],
): 'full' | 'action-only' | 'partial' | 'measurement-only' {
  const hasMeasurement = caps.includes('measurement')
  const actionCount = caps.filter((k) => k !== 'measurement').length
  if (hasMeasurement && actionCount === 3) return 'full'
  if (!hasMeasurement && actionCount > 0) return 'action-only'
  if (hasMeasurement && actionCount === 0) return 'measurement-only'
  return 'partial'
}

// ── Capability descriptions (accordion content) ────────────────────────────────

const CAP_DESCRIPTIONS: Record<CapKey, { whatItIs: string; howItMovesNRR: string }> = {
  retention: {
    whatItIs: "The discipline of keeping the customers and revenue you've already won — minimizing logo churn and revenue contraction.",
    howItMovesNRR: "Sets your NRR floor. Without retention, every expansion dollar is just refilling a leaky bucket.",
  },
  expansion: {
    whatItIs: "The systematic motion of growing accounts after the initial sale — upsells, cross-sells, seat additions, usage growth.",
    howItMovesNRR: "This is what pushes NRR above 100%. Without expansion, the best you can achieve is breaking even on what you started with.",
  },
  pricing: {
    whatItIs: "How well your pricing model captures the value your solution delivers, with discipline around discounting and value-based packaging.",
    howItMovesNRR: "Determines whether you keep the value you create or leak it through unnecessary discounting. Often the highest-leverage, lowest-effort lever.",
  },
  measurement: {
    whatItIs: "The measurement foundation — consistent NRR definitions, trustworthy data, and real-time visibility across teams.",
    howItMovesNRR: "You can't move what you can't measure. Reporting maturity determines whether you can act on retention, expansion, and pricing signals in time.",
  },
}

// ── Main component ─────────────────────────────────────────────────────────────

function Scorecard() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [matrixCap, setMatrixCap] = useState<ActionCapKey | null>(null)
  const [selLeverId, setSelLeverId] = useState<string | null>(null)
  const [hoverRowId, setHoverRowId] = useState<string | null>(null)
  const [expandedCapId, setExpandedCapId] = useState<CapKey | null>(null)
  const [hoverCapId, setHoverCapId] = useState<CapKey | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const sections = CAP_ORDER.filter((k) => state.selectedCapabilities.includes(k))
  const allSectionsComplete =
    sections.length > 0 && sections.every((s) => state.completedSections.includes(s))

  const picks = toPicks(state)
  const actionCaps = sections.filter((k): k is ActionCapKey => k !== 'measurement')
  const hasMeasurement = sections.includes('measurement')

  const overallIntelligence =
    actionCaps.length > 0
      ? actionCaps.reduce((sum, k) => {
          const o = getCapabilityOverall(k, picks)
          return sum + (o ?? 0)
        }, 0) / actionCaps.length
      : null

  const weakestCap = (() => {
    if (actionCaps.length === 0) return null
    const scored = actionCaps
      .map((k) => ({ key: k, score: getCapabilityOverall(k, picks) }))
      .filter((c): c is { key: ActionCapKey; score: number } => c.score !== null)
    if (scored.length === 0) return null
    return scored.reduce((min, c) => (c.score < min.score ? c : min)).key
  })()

  const weakestLeverName = weakestCap
    ? (getThreeWeakestLevers(weakestCap, picks)[0]?.name ?? null)
    : null

  const nrrResult = state.nrrInputs && !state.nrrCalculatorSkipped
    ? computeNRR(state.nrrInputs)
    : null

  const evResult = nrrResult
    ? computeEVUplift(state.nrrInputs?.startingMRR ?? null, nrrResult.nrr)
    : null

  const { sentences: recSentences, cta } = composeRecommendation(state.selectedCapabilities, picks)

  // Derived display values
  const reportingMaturity = hasMeasurement ? getMeasurementOverall(picks.measurement) : null
  const nrrPct = nrrResult?.nrr !== null && nrrResult?.nrr !== undefined ? nrrResult.nrr * 100 : null
  const grrPct = nrrResult?.grr !== null && nrrResult?.grr !== undefined ? nrrResult.grr * 100 : null

  // Current matrix cap (controlled if user picked a tab, else default to weakest)
  const currentMatrixCap = matrixCap ?? weakestCap ?? (actionCaps.length > 0 ? actionCaps[0] : null)
  const matrixCapObj = currentMatrixCap ? getCapability(currentMatrixCap) as ActionCapability : null
  const matrixCapOverall = currentMatrixCap ? getCapabilityOverall(currentMatrixCap, picks) : null

  const matrixLevers = matrixCapObj
    ? matrixCapObj.levers.map((l) => {
        const capPicks = picks[currentMatrixCap!]
        const dimPicks = capPicks[l.id] ?? {}
        const cells = DIMS.map((d) => dimPicks[d] ?? null)
        const avg = getLeverAvg(dimPicks)
        return { id: l.id, name: l.name, description: l.description, cells, avg, gap: avg !== null ? 5 - avg : null }
      })
    : []

  const top3Levers = currentMatrixCap
    ? getThreeWeakestLevers(currentMatrixCap, picks).filter((l) => l.score !== null).slice(0, 3)
    : []

  const leverDescById: Record<string, string> = {}
  if (matrixCapObj) {
    matrixCapObj.levers.forEach((l) => { leverDescById[l.id] = l.description })
  }

  const evMax = evResult ? Math.max(...evResult.scenarios.map((s) => s.evUplift), 1) : 1

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
    const localEVResult = nrrResult
      ? computeEVUplift(state.nrrInputs?.startingMRR ?? null, nrrResult.nrr)
      : null

    const capList: PDFCapabilityData[] = sections.map((capKey) => {
      const cap = getCapability(capKey)!
      const overall = getCapabilityOverall(capKey, picks)
      const weakest = getThreeWeakestLevers(capKey, picks)
        .filter((l) => l.score !== null)
        .slice(0, 3)
        .map((l) => ({ name: l.name, score: l.score }))

      if (cap.type === 'measurement') {
        const mCap = cap as MeasurementCapability
        return {
          key: capKey,
          name: cap.name,
          type: 'measurement',
          overall,
          measurementRows: mCap.levers.map((l) => {
            const score = picks.measurement[l.id] ?? null
            return { id: l.id, name: l.name, score, gapToL5: score !== null ? 5 - score : null }
          }),
          weakestLevers: weakest,
        }
      }

      const aCap = cap as ActionCapability
      const capPicks = picks[capKey as ActionCapKey]
      return {
        key: capKey,
        name: cap.name,
        type: 'action',
        overall,
        leverRows: aCap.levers.map((l) => {
          const dimPicks = capPicks[l.id] ?? {}
          const avg = getLeverAvg(dimPicks)
          return {
            id: l.id,
            name: l.name,
            dimScores: {
              People: dimPicks['People'] ?? null,
              Process: dimPicks['Process'] ?? null,
              Technology: dimPicks['Technology'] ?? null,
              Data: dimPicks['Data'] ?? null,
            },
            leverAvg: avg,
            gapToL5: avg !== null ? 5 - avg : null,
          }
        }),
        weakestLevers: weakest,
      }
    })

    const crossCapDims: PDFCrossCapRow[] =
      actionCaps.length >= 2
        ? DIMS.map((dim) => {
            const avg = getCrossCapDimAvg(actionCaps, dim, picks)
            const capScores: Record<string, number | null> = {}
            actionCaps.forEach((k) => {
              capScores[k] = getActionDimAvg(k, dim, picks[k])
            })
            return { dim, capScores, avg }
          })
        : []

    return {
      email: state.email ?? '',
      generatedAt: state.completedAt ?? new Date().toISOString(),
      nrr: nrrResult?.nrr ?? null,
      grr: nrrResult?.grr ?? null,
      netMovementDollars: nrrResult?.netMovementDollars ?? null,
      netMovementPct: nrrResult?.netMovementPct ?? null,
      reportingMaturity: hasMeasurement ? getMeasurementOverall(picks.measurement) : null,
      overallIntelligence,
      distanceToL5: overallIntelligence !== null ? 5 - overallIntelligence : null,
      evUplift: localEVResult ? {
        scenarios: localEVResult.scenarios.map((s) => ({
          label: s.label,
          ppDelta: s.ppDelta,
          ppCapped: s.ppCapped,
          evUplift: s.evUplift,
        })),
        topOfMarketMessage: localEVResult.topOfMarketMessage,
      } : null,
      capabilities: capList,
      crossCapDims,
      actionCapNames: actionCaps.map((k) => getCapability(k)?.name ?? k),
      recommendationSentences: recSentences,
      ctaText: cta.text,
      ctaUrl: cta.url,
    }
  }, [state, picks, sections, actionCaps, hasMeasurement, overallIntelligence, nrrResult, recSentences, cta])

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
        weakest_capability: weakestLeverName,
      },
    })

    const scorecardPayload: ScorecardPayload = {
      overallIntelligence,
      nrr: nrrResult?.nrr ?? null,
      grr: nrrResult?.grr ?? null,
      reportingMaturity: hasMeasurement ? getMeasurementOverall(picks.measurement) : null,
      distanceToL5: overallIntelligence !== null ? 5 - overallIntelligence : null,
      weakestCapability: weakestCap ? (getCapability(weakestCap)?.name ?? null) : null,
      capabilitiesSelected: sections,
      scope: deriveScorecardScope(sections),
      capabilityOveralls: Object.fromEntries(
        sections.map((k) => [k, getCapabilityOverall(k, picks)]),
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
      evUplift: evResult ? {
        scenarios: evResult.scenarios.map((s) => ({
          label: s.label,
          ppDelta: s.ppDelta,
          ppCapped: s.ppCapped,
          evUplift: s.evUplift,
        })),
        topOfMarketMessage: evResult.topOfMarketMessage,
      } : null,
      capabilities: sections.map((capKey) => {
        const cap = getCapability(capKey)!
        const overall = getCapabilityOverall(capKey, picks)
        const weakest = getThreeWeakestLevers(capKey, picks)
          .filter((l) => l.score !== null)
          .slice(0, 3)
          .map((l) => ({ name: l.name, score: l.score }))

        if (cap.type === 'measurement') {
          const mCap = cap as MeasurementCapability
          return {
            key: capKey,
            name: cap.name,
            type: 'measurement' as const,
            overall,
            measurementRows: mCap.levers.map((l) => {
              const score = picks.measurement[l.id] ?? null
              return { id: l.id, name: l.name, score, gapToL5: score !== null ? 5 - score : null }
            }),
            weakestLevers: weakest,
          }
        }
        const aCap = cap as ActionCapability
        const capPicks = picks[capKey as ActionCapKey]
        return {
          key: capKey,
          name: cap.name,
          type: 'action' as const,
          overall,
          leverRows: aCap.levers.map((l) => {
            const dimPicks = capPicks[l.id] ?? {}
            const avg = getLeverAvg(dimPicks)
            return {
              id: l.id,
              name: l.name,
              dimScores: {
                People: dimPicks['People'] ?? null,
                Process: dimPicks['Process'] ?? null,
                Technology: dimPicks['Technology'] ?? null,
                Data: dimPicks['Data'] ?? null,
              },
              leverAvg: avg,
              gapToL5: avg !== null ? 5 - avg : null,
            }
          }),
          weakestLevers: weakest,
        }
      }),
      crossCapDims: actionCaps.length >= 2
        ? DIMS.map((dim) => {
            const avg = getCrossCapDimAvg(actionCaps, dim, picks)
            const capScores: Record<string, number | null> = {}
            actionCaps.forEach((k) => { capScores[k] = getActionDimAvg(k, dim, picks[k]) })
            return { dim, capScores, avg }
          })
        : [],
      actionCapNames: actionCaps.map((k) => getCapability(k)?.name ?? k),
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
          evUplift: evResult ? {
            scenarios: evResult.scenarios.map((s) => ({
              label: s.label,
              ppDelta: s.ppDelta,
              ppCapped: s.ppCapped,
              evUplift: s.evUplift,
            })),
            topOfMarketMessage: evResult.topOfMarketMessage,
            startingMRRFormatted: formatCurrency(state.nrrInputs?.startingMRR ?? 0),
          } : null,
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
          <KpiTile
            label="Reporting Maturity"
            value={reportingMaturity !== null ? `${(reportingMaturity * e).toFixed(2)}` : '—'}
            valueSuffix={reportingMaturity !== null ? '/5' : undefined}
            subtitle={reportingMaturity !== null ? 'Measurement capability' : 'Not yet measured'}
            valueColor={reportingMaturity !== null ? '#3D6090' : '#C2CAD3'}
          />
          <KpiTile
            label="Overall Intelligence"
            value={overallIntelligence !== null ? `${(overallIntelligence * e).toFixed(2)}` : '—'}
            valueSuffix={overallIntelligence !== null ? '/5' : undefined}
            subtitle={overallIntelligence !== null ? getLevelColor(Math.round(overallIntelligence)).label : 'No action capabilities'}
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

        {/* EV Uplift */}
        {evResult && (
          <div data-reveal="ev" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#3D6090', marginBottom: 6 }}>
              Enterprise Value Impact
            </div>
            <p style={{ margin: '0 0 22px', fontSize: 14, color: '#6B7B89' }}>
              Based on your starting MRR at the tiered NRR-to-EV multiple.
            </p>
            {evResult.topOfMarketMessage ? (
              <p style={{ fontSize: 15, color: '#6B7B89', fontStyle: 'italic' }}>{evResult.topOfMarketMessage}</p>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {evResult.scenarios.map((s, i) => {
                  const barPct = s.evUplift / evMax * 100 * e
                  const displayM = s.evUplift / 1_000_000 * e
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '230px 1fr 150px', alignItems: 'center', gap: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#243B52' }}>{s.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4E7C66', background: '#E6EFE9', padding: '3px 8px', borderRadius: 999 }}>
                          +{s.ppDelta}pp{s.ppCapped ? '+' : ''}
                        </span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: '#EEF1F4', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: 10, borderRadius: 999, width: `${barPct}%`, background: 'linear-gradient(90deg,#3D6090,#5B7A9E)' }} />
                      </div>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: '#243B52', textAlign: 'right' }}>
                        +${fmtM(displayM)}M
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <p style={{ margin: '22px 0 0', fontSize: 12, fontStyle: 'italic', color: '#A6B0BB', lineHeight: 1.5 }}>
              Indicative — based on public SaaS valuation benchmarks. Real EV varies by growth rate, margin, and market conditions.
            </p>
          </div>
        )}

        {/* Capability overview rows (accordion) */}
        {sections.length > 0 && (
          <div data-reveal="caps" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sections.map((capKey) => {
              const cap = getCapability(capKey)
              const overall = getCapabilityOverall(capKey, picks)
              const isExpanded = expandedCapId === capKey
              const isHov = hoverCapId === capKey
              const desc = CAP_DESCRIPTIONS[capKey]

              function handleCapClick() {
                setExpandedCapId(isExpanded ? null : capKey)
                if (capKey !== 'measurement') {
                  setMatrixCap(capKey as ActionCapKey)
                  setSelLeverId(null)
                }
              }

              return (
                <div key={capKey}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleCapClick}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') handleCapClick() }}
                    onMouseEnter={() => setHoverCapId(capKey)}
                    onMouseLeave={() => setHoverCapId(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '14px 20px',
                      background: isExpanded ? 'rgba(61,96,144,.05)' : (isHov ? '#F8FAFC' : '#FFFFFF'),
                      border: '1px solid #E3E8EE',
                      borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                      cursor: 'pointer',
                      transition: 'background .15s',
                      userSelect: 'none',
                      outline: 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#243B52' }}>{cap?.name}</span>
                    </div>
                    <div style={{ width: 100, height: 6, borderRadius: 999, background: '#EEF1F4', flexShrink: 0, overflow: 'hidden' }}>
                      {overall !== null && (
                        <div style={{ width: `${overall / 5 * 100}%`, height: 6, borderRadius: 999, background: 'linear-gradient(90deg,#3D6090,#5B7A9E)' }} />
                      )}
                    </div>
                    <svg
                      width={16} height={16} viewBox="0 0 24 24" fill="none"
                      stroke="#9AA7B3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .22s ease' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: overall !== null ? '#0E2B41' : '#C2CAD3', flexShrink: 0, minWidth: 44, textAlign: 'right' }}>
                      {overall !== null ? overall.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div style={{ maxHeight: isExpanded ? 240 : 0, overflow: 'hidden', transition: 'max-height .25s ease' }}>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E3E8EE', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px 20px 20px' }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#9AA7B3', marginBottom: 5 }}>What it is</div>
                        <div style={{ fontSize: 14, color: '#243B52', lineHeight: 1.55 }}>{desc.whatItIs}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#9AA7B3', marginBottom: 5 }}>How it moves NRR</div>
                        <div style={{ fontSize: 14, color: '#243B52', lineHeight: 1.55 }}>{desc.howItMovesNRR}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Capability matrix (action caps) */}
        {currentMatrixCap && (
          <>
            {/* Matrix card */}
            <div
              data-reveal="matrix"
              style={{ ...cardStyle, marginTop: 24 }}
            >
              {/* Gauge + cap name + legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 6, flexWrap: 'wrap' as const }}>
                <GaugeSVG score={matrixCapOverall} progress={e} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#0E2B41', margin: 0 }}>
                      {matrixCapObj?.name}
                    </h2>
                    {matrixCapOverall !== null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#3D6090', background: '#EAEFF5', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' as const }}>
                        {matrixCapOverall.toFixed(2)} / 5
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: 14, color: '#6B7B89' }}>{matrixCapObj?.tagline}</p>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9AA7B3' }}>Low</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <div key={v} style={{ width: 16, height: 10, borderRadius: 2, background: cellBg(v) }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9AA7B3' }}>Strong</span>
                </div>
              </div>

              {/* Heatmap */}
              <div style={{ marginTop: 20, overflowX: 'auto' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: MATRIX_COLS, alignItems: 'center', padding: '0 0 10px', borderBottom: '1px solid #EEF1F4', minWidth: 640 }}>
                  {['Lever', 'People', 'Process', 'Technology', 'Data', 'Lever Avg', 'Gap to L5'].map((h, i) => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9AA7B3', textAlign: i === 0 ? 'left' : 'center', padding: '0 4px' }}>
                      {h}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                <div style={{ display: 'grid', gap: 2, marginTop: 6, minWidth: 640 }}>
                  {matrixLevers.map((lv, i) => {
                    const isSel = selLeverId === lv.id
                    const isHov = hoverRowId === lv.id
                    return (
                      <div
                        key={lv.id}
                        onMouseEnter={() => setHoverRowId(lv.id)}
                        onMouseLeave={() => setHoverRowId(null)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: MATRIX_COLS,
                          alignItems: 'center',
                          borderRadius: 8,
                          background: isSel ? 'rgba(61,96,144,.08)' : (isHov ? '#F6F8FB' : 'transparent'),
                          boxShadow: isSel ? 'inset 3px 0 0 #3D6090' : 'none',
                          transition: 'background .2s',
                        }}
                      >
                        <div style={{ padding: '8px 6px 8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#AEB8C2', flexShrink: 0 }}>L{i + 1}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#243B52', lineHeight: 1.25 }}>{lv.description}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#AEB8C2', marginLeft: 24, marginTop: 1 }}>{lv.name}</div>
                        </div>
                        {lv.cells.map((c, j) => (
                          <HeatCell key={j} value={c} />
                        ))}
                        <HeatCell value={lv.avg} display={lv.avg !== null ? lv.avg.toFixed(2) : '—'} />
                        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6B7B89' }}>
                          {lv.gap !== null ? `+${lv.gap.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Top 3 levers */}
            {top3Levers.length > 0 && (
              <div data-reveal="top" style={{ marginTop: 26 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7B89', marginBottom: 14 }}>
                  3 highest-impact levers to address
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {top3Levers.map((lv, k) => {
                    const isSel = selLeverId === lv.id
                    return (
                      <div
                        key={lv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelLeverId(isSel ? null : lv.id)}
                        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setSelLeverId(isSel ? null : lv.id) }}
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
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#243B52' }}>{leverDescById[lv.id] ?? lv.name}</div>
                          <div style={{ fontSize: 12, color: '#AEB8C2', marginTop: 2 }}>{lv.name}</div>
                        </div>
                        <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: cellFg(lv.score), background: cellBg(lv.score), padding: '5px 14px', borderRadius: 8 }}>
                          {lv.score !== null ? lv.score.toFixed(2) : '—'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7B89', whiteSpace: 'nowrap' }}>
                          {lv.gapToL5 !== null ? `+${lv.gapToL5.toFixed(2)} to L5` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Measurement section */}
        {hasMeasurement && (
          <div style={{ marginTop: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#0E2B41', margin: 0 }}>
                {getCapability('measurement')?.name ?? 'NRR Reporting'}
              </h2>
              {reportingMaturity !== null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#3D6090', background: '#EAEFF5', padding: '4px 12px', borderRadius: 999 }}>
                  {reportingMaturity.toFixed(2)} / 5
                </span>
              )}
            </div>
            <MeasurementHeatmap picks={state.picks.measurement} />
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
