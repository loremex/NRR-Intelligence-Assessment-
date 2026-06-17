import { useEffect, useCallback, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type ActionCapKey, type CapKey } from '../lib/state'
import { getCapability } from '../lib/rubric'
import { getCapabilityOverall, getThreeWeakestLevers, scoreToColor, DIMS, getActionDimAvg, getCrossCapDimAvg, getMeasurementOverall, getLeverAvg, type AllPicks } from '../lib/scoring'
import { track } from '../lib/analytics'
import { composeRecommendation } from '../lib/recommendations'
import { computeNRR } from '../lib/nrr'
import type { PDFParams, PDFCapabilityData, PDFCrossCapRow } from '../lib/pdfGenerator'
import { completeSession, type ScorecardPayload } from '../lib/api'
import { HeadlineTiles } from '../components/scorecard/HeadlineTiles'
import { CrossCapDimView } from '../components/scorecard/CrossCapDimView'
import { MeasurementHeatmap } from '../components/scorecard/MeasurementHeatmap'
import { ActionHeatmap } from '../components/scorecard/ActionHeatmap'
import { ThreeWeakest } from '../components/scorecard/ThreeWeakest'
import { RecommendationBlock } from '../components/scorecard/RecommendationBlock'
import type { MeasurementCapability, ActionCapability } from '../lib/rubric-schema'

const CAP_ORDER: CapKey[] = ['measurement', 'retention', 'expansion', 'pricing']

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

function Scorecard() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()
  const [pdfDownloading, setPdfDownloading] = useState(false)

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

  const { sentences: recSentences, cta } = composeRecommendation(state.selectedCapabilities, picks)

  // ── Build PDFParams from derived data ──────────────────────────────────────

  const buildPDFParams = useCallback((): PDFParams => {
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
      netMovement: nrrResult?.netMovement ?? null,
      reportingMaturity: hasMeasurement ? getMeasurementOverall(picks.measurement) : null,
      overallIntelligence,
      distanceToL5: overallIntelligence !== null ? 5 - overallIntelligence : null,
      capabilities: capList,
      crossCapDims,
      actionCapNames: actionCaps.map((k) => getCapability(k)?.name ?? k),
      recommendationSentences: recSentences,
      ctaText: cta.text,
      ctaUrl: cta.url,
    }
  }, [state, picks, sections, actionCaps, hasMeasurement, overallIntelligence, nrrResult, recSentences, cta])

  // ── Completion trigger: fires once on first scorecard view ─────────────────

  useEffect(() => {
    if (!allSectionsComplete) return
    if (state.completedAt !== null) return  // already sent

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

    // Generate PDF, then POST to server (don't block UI)
    const pdfParams: PDFParams = {
      email: state.email ?? '',
      generatedAt: completedAt,
      nrr: scorecardPayload.nrr,
      grr: scorecardPayload.grr,
      netMovement: nrrResult?.netMovement ?? null,
      reportingMaturity: scorecardPayload.reportingMaturity,
      overallIntelligence,
      distanceToL5: scorecardPayload.distanceToL5,
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
        })
        console.log('[scorecard] completeSession succeeded')
      } catch (err) {
        // Don't block user — they're already on the scorecard
        console.warn('[scorecard] completeSession failed (will not retry client-side):', err)
      }
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!state.email) return <Navigate to="/" replace />
  if (state.selectedCapabilities.length === 0) return <Navigate to="/" replace />
  if (!allSectionsComplete) return <Navigate to="/assessment" replace />

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

  return (
    <div className="min-h-screen bg-gray-light font-body">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-navy focus:font-semibold focus:rounded focus:ring-2 focus:ring-brand-blue"
      >
        Skip to main content
      </a>

      {/* Nav */}
      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="hidden sm:block text-slate-400 text-sm">NRR Intelligence Assessment</span>
        </div>
      </nav>

      <main id="main-content" className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
            Your Results
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy">
            NRR Intelligence Scorecard
          </h1>
        </div>

        {/* Headline tiles */}
        <HeadlineTiles />

        {/* Cross-cap dimension view (only if ≥2 action caps) */}
        <CrossCapDimView />

        {/* Per-capability heatmaps */}
        {sections.map((capKey) => {
          const cap = getCapability(capKey)
          if (!cap) return null
          const overall = getCapabilityOverall(capKey, picks)

          return (
            <section key={capKey} className="mb-12">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-display text-xl font-bold text-navy">{cap.name}</h2>
                {overall !== null && (
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: scoreToColor(overall),
                      color: '#1E293B',
                    }}
                  >
                    {overall.toFixed(2)} / 5
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-4">{cap.tagline}</p>

              {cap.type === 'measurement' ? (
                <MeasurementHeatmap picks={state.picks.measurement} />
              ) : (
                <ActionHeatmap
                  capabilityKey={capKey as ActionCapKey}
                  picks={state.picks[capKey as ActionCapKey]}
                />
              )}

              <ThreeWeakest capabilityKey={capKey} picks={picks} />
            </section>
          )
        })}

        {/* Recommendation block */}
        <RecommendationBlock />

        {/* Download PDF */}
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={pdfDownloading}
            className="bg-brand-blue hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
          >
            {pdfDownloading ? 'Generating PDF…' : 'Download PDF Report'}
          </button>
        </div>

        {/* Restart */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleRestart}
            className="text-sm text-slate-500 hover:text-text-dark underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded transition-colors"
          >
            Restart Assessment
          </button>
        </div>
      </main>
    </div>
  )
}

export default Scorecard
