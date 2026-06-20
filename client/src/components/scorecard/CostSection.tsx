import { formatCurrency, type NRRResult } from '../../lib/nrr'
import type { WeakestCell, AllPicks } from '../../lib/scoring'
import type { CapKey } from '../../lib/state'
import { V3_ASSESSMENT_CONTENT } from '../../content/assessmentContent'

export interface CostSectionProps {
  nrrResult: NRRResult | null
  pooledTop3: WeakestCell[]
  picks: AllPicks
  selectedCaps: CapKey[]
}

type LeakVariant = 'net-positive' | 'net-negative' | 'minimal-leak'

function getVariant(nrr: number, grr: number): LeakVariant {
  if (grr >= 0.95) return 'minimal-leak'
  if (nrr >= 1.0) return 'net-positive'
  return 'net-negative'
}

const ACCENT: Record<LeakVariant, string> = {
  'net-positive': '#D97706',
  'net-negative': '#DC2626',
  'minimal-leak': '#059669',
}

const ACCENT_BG: Record<LeakVariant, string> = {
  'net-positive': '#FFFBF0',
  'net-negative': '#FFF5F5',
  'minimal-leak': '#F0FFF4',
}

function scoreColor(score: number): { bg: string; fg: string } {
  const ramp: Record<number, { bg: string; fg: string }> = {
    1: { bg: '#EAEEF3', fg: '#243B52' },
    2: { bg: '#D2DBE4', fg: '#243B52' },
    3: { bg: '#AABBCC', fg: '#243B52' },
    4: { bg: '#6E8AA6', fg: '#FFFFFF' },
    5: { bg: '#3E5C7C', fg: '#FFFFFF' },
  }
  return ramp[score] ?? ramp[2]
}

export function CostSection({ nrrResult, pooledTop3, picks }: CostSectionProps) {
  if (!nrrResult) return null
  const { leakDollars, nrr, grr, netMovementDollars } = nrrResult
  if (leakDollars === null || leakDollars <= 0 || nrr === null || grr === null) return null

  const variant = getVariant(nrr, grr)
  const net = netMovementDollars ?? 0
  const expD = net + leakDollars

  const leakFmt = formatCurrency(leakDollars, { compact: true })
  const expFmt = formatCurrency(expD, { compact: true })
  const nrrPct = (nrr * 100).toFixed(1)
  const grrPct = (grr * 100).toFixed(1)

  const copy = {
    'net-positive': {
      headline: `You retained net positive this quarter — but ${leakFmt} walked out the door.`,
      body: `Expansion (${expFmt}) more than covered it, so NRR reads ${nrrPct}% — healthy on paper. But ${leakFmt} left the base this quarter through contraction and churn. That's the number the net hides.`,
      closing: `At this maturity, most of the ${leakFmt} is structurally unrecoverable — not because the value isn't there, but because it can't be seen, priced, or acted on in time.`,
      opportunity: `Every step up the curve converts more of that ${leakFmt} from leak into retained revenue. Not new growth to find — value already delivered and already lost. The difference between a ${nrrPct}% NRR that's quietly leaking and one that compounds.`,
    },
    'net-negative': {
      headline: `Your leak outran expansion this quarter — ${leakFmt} walked out the door.`,
      body: `With NRR at ${nrrPct}%, contraction and churn are outpacing expansion. Every new logo starts in a hole. ${leakFmt} left the base through contraction and churn — and net revenue shrank. [Final copy TBD]`,
      closing: `At this maturity, the leak is structural, not incidental. The capabilities that would stop it aren't yet in place. [Final copy TBD]`,
      opportunity: `Every step up the curve converts more of that ${leakFmt} from leak into retained revenue. The priority is stopping the bleed before compounding from a stronger base. [Final copy TBD]`,
    },
    'minimal-leak': {
      headline: `You've largely closed the leak — ${leakFmt} left the base this quarter.`,
      body: `With GRR at ${grrPct}%, contraction and churn are well-controlled. The gross outflow is small relative to the base. [Final copy TBD]`,
      closing: `You're in a strong position on retention. The question now is how much upside you're leaving on the table. [Final copy TBD]`,
      opportunity: `The frontier from here is compounding — maintaining the discipline that closed the leak while expanding the ceiling. [Final copy TBD]`,
    },
  }[variant]

  const accent = ACCENT[variant]
  const accentBg = ACCENT_BG[variant]
  const hasCells = pooledTop3.length > 0

  return (
    <div
      data-reveal="cost"
      style={{
        background: accentBg,
        border: `1px solid #E3E8EE`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 14,
        padding: '28px 32px',
        marginBottom: 20,
        boxShadow: '0 14px 40px rgba(14,43,65,.07)',
      }}
    >
      {/* Leak headline */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: accent, marginBottom: 8 }}>
            What This Is Costing You
          </div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#0E2B41', margin: '0 0 12px', lineHeight: 1.3 }}>
            {copy.headline}
          </h2>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>
            {copy.body}
          </p>
        </div>

        {/* Leak tile */}
        <div style={{
          flexShrink: 0,
          background: '#FFFFFF',
          border: `1px solid ${accent}33`,
          borderRadius: 12,
          padding: '18px 28px',
          textAlign: 'center' as const,
          minWidth: 140,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#9AA7B3', marginBottom: 6 }}>
            Quarterly Leak
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 700, color: accent, lineHeight: 1 }}>
            {leakFmt}
          </div>
          <div style={{ fontSize: 11, color: '#9AA7B3', marginTop: 4 }}>
            contraction + churn
          </div>
        </div>
      </div>

      {/* Where the leak is concentrated */}
      {hasCells && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7B89', marginBottom: 12 }}>
            Where your leak is concentrated
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {pooledTop3.map((cell) => {
              const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === cell.capKey)
              const qContent = capContent?.questions.find((q) => q.id === cell.qId)
              const scenarioIdx = picks[cell.capKey][cell.qId]
              const pickedText = scenarioIdx !== null && scenarioIdx !== undefined
                ? qContent?.scenarios[scenarioIdx as number]?.text ?? null
                : null
              const { bg, fg } = scoreColor(cell.score)

              return (
                <div
                  key={`${cell.capKey}/${cell.qId}`}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    background: '#FFFFFF',
                    border: '1px solid #E3E8EE',
                    borderRadius: 10,
                    padding: '14px 18px',
                  }}
                >
                  <div style={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: bg,
                    color: fg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'Georgia, serif',
                  }}>
                    {cell.score}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#243B52' }}>
                        {qContent?.title ?? cell.qId}
                      </span>
                      <span style={{ fontSize: 11, color: '#9AA7B3' }}>
                        {capContent?.name ?? cell.capKey}
                      </span>
                      <span style={{ fontSize: 11, color: '#9AA7B3' }}>
                        · +{cell.gapToL5} to L5
                      </span>
                    </div>
                    {pickedText && (
                      <p style={{ fontSize: 12, color: '#6B7B89', margin: '4px 0 0', lineHeight: 1.5 }}>
                        {pickedText}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Closing + opportunity */}
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: '20px 0 0', fontStyle: 'italic' as const }}>
            {copy.closing}
          </p>
        </div>
      )}

      {/* The opportunity */}
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E3E8EE33' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7B89', marginBottom: 8 }}>
          The opportunity
        </div>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>
          {copy.opportunity}
        </p>
      </div>
    </div>
  )
}
