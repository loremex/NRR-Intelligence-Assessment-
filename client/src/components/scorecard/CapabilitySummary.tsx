import { useState } from 'react'
import { getCapabilityScore, getMaturityStage, getCellScore, type AllPicks } from '../../lib/scoring'
import type { CapKey } from '../../lib/state'
import { V3_ASSESSMENT_CONTENT } from '../../content/assessmentContent'

interface CapabilitySummaryProps {
  picks: AllPicks
  selectedCaps: CapKey[]
}

function cellBg(v: number | null): string {
  if (v === null) return '#F4F6F9'
  const ramp: Record<number, string> = { 1: '#EAEEF3', 2: '#D2DBE4', 3: '#AABBCC', 4: '#6E8AA6', 5: '#3E5C7C' }
  return ramp[v] ?? '#D2DBE4'
}

function cellFg(v: number | null): string {
  if (v === null) return '#C2CAD3'
  return v >= 4 ? '#FFFFFF' : '#243B52'
}

export function CapabilitySummary({ picks, selectedCaps }: CapabilitySummaryProps) {
  const [expandedKey, setExpandedKey] = useState<CapKey | null>(null)

  const caps = V3_ASSESSMENT_CONTENT.filter((c) => selectedCaps.includes(c.key as CapKey))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {caps.map((cap) => {
        const capKey = cap.key as CapKey
        const score = getCapabilityScore(capKey, picks)
        const stage = getMaturityStage(score)
        const isExpanded = expandedKey === capKey

        return (
          <div key={capKey}>
            {/* Row */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpandedKey(isExpanded ? null : capKey)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setExpandedKey(isExpanded ? null : capKey) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 20px',
                background: isExpanded ? 'rgba(61,96,144,.05)' : '#FFFFFF',
                border: '1px solid #E3E8EE',
                borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                cursor: 'pointer',
                transition: 'background .15s',
                userSelect: 'none',
                outline: 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#243B52' }}>{cap.name}</span>
                {score !== null && (
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#6B7B89' }}>{stage}</span>
                )}
              </div>
              {/* Mini score bar */}
              <div style={{ width: 80, height: 5, borderRadius: 999, background: '#EEF1F4', flexShrink: 0, overflow: 'hidden' }}>
                {score !== null && (
                  <div style={{ width: `${(score / 5) * 100}%`, height: 5, borderRadius: 999, background: 'linear-gradient(90deg,#3D6090,#5B7A9E)' }} />
                )}
              </div>
              {/* Score badge */}
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: score !== null ? '#0E2B41' : '#C2CAD3', flexShrink: 0, minWidth: 44, textAlign: 'right' }}>
                {score !== null ? score.toFixed(2) : '—'}
              </span>
              {/* Chevron */}
              <svg
                width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="#9AA7B3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .22s ease' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Expanded: question detail */}
            {isExpanded && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E3E8EE', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px 20px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cap.questions.map((q) => {
                    const cellScore = getCellScore(capKey, q.id, picks)
                    const scenarioIdx = picks[capKey][q.id]
                    const pickedText = scenarioIdx !== null && scenarioIdx !== undefined
                      ? q.scenarios[scenarioIdx as number]?.text
                      : null
                    return (
                      <div key={q.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div
                          style={{
                            flexShrink: 0,
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: cellBg(cellScore),
                            color: cellFg(cellScore),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {cellScore ?? '—'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7B89', marginBottom: 2 }}>{q.title}</div>
                          {pickedText ? (
                            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{pickedText}</div>
                          ) : (
                            <div style={{ fontSize: 13, color: '#C2CAD3', fontStyle: 'italic' }}>Not answered</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
