import { useState } from 'react'
import type { WeakestCell } from '../../lib/scoring'
import { V3_ASSESSMENT_CONTENT } from '../../content/assessmentContent'

const ACCENT = '#2563EB'

function scoreColor(v: number | null): string {
  if (v === null) return '#A7B0BC'
  if (v >= 3.4) return ACCENT
  if (v >= 3.0) return '#5B7FB0'
  if (v >= 2.7) return '#8C9CB0'
  return '#A7B0BC'
}

const DIRECTIONAL_IMPACT = [
  'Highest leverage on your NRR',
  'Strong compounding impact',
  'Raises your NRR floor',
]

interface ImpactCardsProps {
  pooledTop3: WeakestCell[]
  allQuestionTitleById: Record<string, string>
}

export function ImpactCards({ pooledTop3, allQuestionTitleById }: ImpactCardsProps) {
  const [openImpact, setOpenImpact] = useState<number | null>(null)

  if (pooledTop3.length === 0) return null

  const isSplit = openImpact !== null

  return (
    <div data-reveal="impact" style={{ marginTop: 30 }}>
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.14em',
        textTransform: 'uppercase' as const,
        color: '#6B7B89',
        marginBottom: 14,
      }}>
        3 highest-impact areas to address
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isSplit ? '1fr 1fr' : '1fr',
        gap: 14,
        alignItems: 'stretch',
        transition: 'grid-template-columns .3s ease',
      }}>

        {/* LEFT: list of impact areas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'stretch' }}>
          {pooledTop3.map((lv, k) => {
            const cellKey = `${lv.capKey}/${lv.qId}`
            const isOpen = openImpact === k
            const color = scoreColor(lv.score)
            const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === lv.capKey)
            const capDisplayName = capContent?.name ?? lv.capKey
            const title = allQuestionTitleById[cellKey] ?? lv.qId

            return (
              <div
                key={cellKey}
                role="button"
                tabIndex={0}
                onClick={() => setOpenImpact(isOpen ? null : k)}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setOpenImpact(isOpen ? null : k) }}
                onMouseEnter={(ev) => { if (!isOpen) ev.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = isOpen ? 'rgba(37,99,235,.06)' : '#FFFFFF' }}
                style={{
                  flex: isSplit ? 1 : undefined,
                  display: 'grid',
                  gridTemplateColumns: isSplit ? '34px 1fr auto' : '40px 1fr auto auto 22px',
                  alignItems: 'center',
                  gap: isSplit ? 12 : 16,
                  padding: isSplit ? '14px 18px' : '16px 20px',
                  cursor: 'pointer',
                  borderRadius: 13,
                  background: isOpen ? 'rgba(37,99,235,.06)' : '#FFFFFF',
                  border: `1px solid ${isOpen ? ACCENT : '#E3E8EE'}`,
                  boxShadow: isOpen ? '0 10px 26px rgba(14,43,65,.10)' : 'none',
                  transition: 'background .2s, border-color .2s, box-shadow .25s',
                  userSelect: 'none',
                  outline: 'none',
                }}
              >
                {/* Number */}
                <div style={{ fontSize: isSplit ? 18 : 22, fontWeight: 700, color: isOpen ? ACCENT : '#C2CAD3' }}>
                  {k + 1}
                </div>

                {/* Title + area */}
                <div>
                  <div style={{ fontSize: isSplit ? 14 : 15.5, fontWeight: 700, color: '#0E2B41' }}>{title}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#9AA7B3', marginTop: 2 }}>{capDisplayName}</div>
                </div>

                {/* Split: arrow only */}
                {isSplit && (
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: isOpen ? ACCENT : '#C2CAD3' }}>&#8250;</span>
                )}

                {/* Non-split: score badge */}
                {!isSplit && (
                  <span style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    background: color,
                    padding: '5px 13px',
                    borderRadius: 8,
                  }}>
                    {lv.score}
                  </span>
                )}

                {/* Non-split: gap label */}
                {!isSplit && (
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, fontWeight: 600, color: '#6B7B89', whiteSpace: 'nowrap' as const }}>
                    +{lv.gapToL5} to L5
                  </span>
                )}

                {/* Non-split: trailing arrow */}
                {!isSplit && (
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#C2CAD3', textAlign: 'center' as const }}>&#8250;</div>
                )}
              </div>
            )
          })}
        </div>

        {/* RIGHT: detail panel for open card */}
        {isSplit && openImpact !== null && (() => {
          const lv = pooledTop3[openImpact]
          const cellKey = `${lv.capKey}/${lv.qId}`
          const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === lv.capKey)
          const capDisplayName = capContent?.name ?? lv.capKey
          const question = capContent?.questions.find((q) => q.id === lv.qId)
          const title = allQuestionTitleById[cellKey] ?? lv.qId

          // Build progression steps: next 1–3 level scenarios above current score
          const steps: string[] = []
          for (let l = lv.score + 1; l <= 5 && steps.length < 3; l++) {
            const text = question?.scenarios[l - 1]?.text
            if (text) steps.push(text)
          }

          const directional = DIRECTIONAL_IMPACT[openImpact] ?? 'High-priority improvement'

          return (
            <div
              key={'rec-' + openImpact}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${ACCENT}`,
                borderRadius: 14,
                padding: '26px 28px',
                boxShadow: '0 18px 44px rgba(14,43,65,.12)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <span style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase' as const,
                  color: ACCENT,
                }}>
                  Recommendation
                </span>
                <span style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: ACCENT,
                  background: 'rgba(37,99,235,.10)',
                  padding: '4px 11px',
                  borderRadius: 999,
                }}>
                  {capDisplayName}
                </span>
              </div>

              {/* Title */}
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0E2B41', lineHeight: 1.25, marginBottom: 10 }}>
                {title}
              </div>

              {/* Action — the question text frames the gap */}
              <p style={{ fontFamily: 'Georgia, serif', margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.6, color: '#52606D' }}>
                {question?.question ?? `Improve your ${title.toLowerCase()} to close this gap.`}
              </p>

              {/* Steps — next level scenario texts */}
              {steps.length > 0 && (
                <div style={{ display: 'grid', gap: 11, marginBottom: 20 }}>
                  {steps.map((s, j) => (
                    <div key={j} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 11, alignItems: 'start' }}>
                      <span style={{
                        fontFamily: 'Georgia, serif',
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: 'rgba(37,99,235,.12)',
                        color: ACCENT,
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {j + 1}
                      </span>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.5, color: '#3D4A57' }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Directional note — replaces the fabricated "+X pts" tile */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: '#F4F7FB',
                border: `1px solid ${ACCENT}40`,
                borderRadius: 11,
                padding: '13px 18px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                  <span style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase' as const,
                    color: '#9AA7B3',
                  }}>
                    Priority
                  </span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 11.5, color: '#9AA7B3', marginTop: 2 }}>
                    closing this gap
                  </span>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' as const }}>
                  {directional}
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
