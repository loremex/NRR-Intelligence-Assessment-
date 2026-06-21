import { useState } from 'react'
import { getCapabilityScore, getCellScore, type AllPicks } from '../../lib/scoring'
import type { CapKey } from '../../lib/state'
import { V3_ASSESSMENT_CONTENT, CAP_LEVEL_DESCS } from '../../content/assessmentContent'

const LEVEL_NAMES = [
  '',
  'Blind',
  'Named, not measured',
  'Measured, not live',
  'Surfaced and steering',
  'Continuous and self-correcting',
]

const LEVEL_DESCS = [
  '',
  "The real driver isn't measured. Runs on proxies, judgment, instinct.",
  'Recognized but lives in heads; no reliable number.',
  'Quantified but pulled, interpreted, and acted on after the fact.',
  'The signal surfaces on its own and drives decisions.',
  'Sensed, predicted, acted on continuously, no lag.',
]

function getDesc(capKey: CapKey, level: number): string {
  return CAP_LEVEL_DESCS[capKey]?.[level] ?? LEVEL_DESCS[level]
}

const ACCENT = '#2563EB'

function scoreColor(v: number | null): string {
  if (v === null) return '#A7B0BC'
  if (v >= 3.4) return ACCENT
  if (v >= 3.0) return '#5B7FB0'
  if (v >= 2.7) return '#8C9CB0'
  return '#A7B0BC'
}

interface CapabilitySummaryProps {
  picks: AllPicks
  selectedCaps: CapKey[]
}

export function CapabilitySummary({ picks, selectedCaps }: CapabilitySummaryProps) {
  const [selIdx, setSelIdx] = useState(0)

  const caps = V3_ASSESSMENT_CONTENT.filter((c) => selectedCaps.includes(c.key as CapKey))
  if (caps.length === 0) return null

  // Determine weakest (lowest score)
  const scores = caps.map((c) => getCapabilityScore(c.key as CapKey, picks))
  const minScore = Math.min(...scores.filter((s): s is number => s !== null))

  const safeIdx = Math.min(selIdx, caps.length - 1)
  const selCap = caps[safeIdx]
  const selCapKey = selCap.key as CapKey
  const selScore = getCapabilityScore(selCapKey, picks)
  const selColor = scoreColor(selScore)
  const lvl = selScore !== null ? Math.max(1, Math.min(5, Math.round(selScore))) : 1
  const nextLvl = Math.min(5, lvl + 1)
  const atTop = lvl >= 5

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 680px) {
          .cap-detail-3col { grid-template-columns: 1fr !important; }
          .cap-detail-divider { display: none !important; }
          .cap-ladder-row { gap: 4px !important; }
        }
      ` }} />

      {/* Capability rows */}
      {caps.map((cap, i) => {
        const capKey = cap.key as CapKey
        const score = getCapabilityScore(capKey, picks)
        const color = scoreColor(score)
        const isSel = i === safeIdx
        const isWeakest = score !== null && score === minScore
        const pct = score !== null ? (score / 5) * 100 : 0

        return (
          <div
            key={capKey}
            role="button"
            tabIndex={0}
            onClick={() => setSelIdx(i)}
            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setSelIdx(i) }}
            onMouseEnter={(ev) => { if (!isSel) ev.currentTarget.style.background = '#F6F8FB' }}
            onMouseLeave={(ev) => { ev.currentTarget.style.background = isSel ? 'rgba(37,99,235,.06)' : 'transparent' }}
            style={{
              display: 'grid',
              gridTemplateColumns: '210px 1fr 54px 22px',
              alignItems: 'center',
              gap: 18,
              padding: '15px 14px',
              cursor: 'pointer',
              borderRadius: 10,
              background: isSel ? 'rgba(37,99,235,.06)' : 'transparent',
              boxShadow: isSel ? `inset 3px 0 0 ${color}` : 'inset 3px 0 0 transparent',
              transition: 'background .22s, box-shadow .22s',
              userSelect: 'none',
              outline: 'none',
            }}
          >
            {/* Name + subtitle */}
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: '#0E2B41' }}>{cap.name}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 11.5, color: '#9AA7B3', marginTop: 2 }}>
                {'L' + (score !== null ? Math.round(score) : '—') + ' · ' + (score !== null ? LEVEL_NAMES[Math.round(score)] : '—')}
                {isWeakest ? '  •  weakest' : ''}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ position: 'relative', height: 9, borderRadius: 999, background: '#EAEEF3' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: 9, width: `${pct}%`, borderRadius: 999, background: color, transition: 'width .2s' }} />
            </div>

            {/* Score */}
            <div style={{ fontSize: 19, fontWeight: 700, color: score !== null ? color : '#C2CAD3', textAlign: 'right' as const }}>
              {score !== null ? score.toFixed(2) : '—'}
            </div>

            {/* Arrow */}
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 16,
              color: isSel ? ACCENT : '#C2CAD3',
              textAlign: 'center' as const,
              transform: isSel ? 'rotate(90deg)' : 'none',
              transition: 'transform .25s, color .2s',
            }}>
              &#8250;
            </div>
          </div>
        )
      })}

      {/* Detail panel — always visible, updates on row selection */}
      <div
        key={'detail-' + safeIdx}
        style={{ marginTop: 16 }}
      >
        <div
          className="cap-detail-3col"
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
          {/* LEFT: name + blurb + ladder */}
          <div>
            {/* Name + level badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#0E2B41' }}>{selCap.name}</span>
              <span style={{
                fontFamily: 'Georgia, serif',
                fontSize: 11,
                fontWeight: 700,
                color: selColor,
                background: selColor + '1A',
                padding: '4px 10px',
                borderRadius: 999,
              }}>
                {'L' + lvl + ' · ' + LEVEL_NAMES[lvl]}
              </span>
            </div>

            {/* Blurb */}
            <p style={{
              fontFamily: 'Georgia, serif',
              margin: '6px 0 16px',
              fontSize: 13.5,
              lineHeight: 1.55,
              color: '#52606D',
              maxWidth: 360,
            }}>
              {getDesc(selCapKey, lvl)}
            </p>

            {/* Horizontal level ladder */}
            <div>
              <div className="cap-ladder-row" style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((L) => {
                  const on = L <= lvl
                  return (
                    <div key={L} style={{ flex: 1, textAlign: 'center' as const }}>
                      <div style={{ height: 6, borderRadius: 999, background: on ? selColor : '#E2E8EF', transition: 'background .3s' }} />
                      <div style={{
                        fontFamily: 'Georgia, serif',
                        marginTop: 7,
                        fontSize: 10,
                        fontWeight: 700,
                        color: L === lvl ? selColor : '#A6B0BB',
                      }}>
                        {'L' + L}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Current level context */}
              <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'Georgia, serif',
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: selColor,
                  padding: '3px 9px',
                  borderRadius: 6,
                  marginTop: 1,
                }}>
                  {'L' + lvl}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0E2B41', lineHeight: 1.25 }}>
                    {LEVEL_NAMES[lvl]}
                  </div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 12.5, lineHeight: 1.5, color: '#6B7B89', marginTop: 2 }}>
                    {getDesc(selCapKey, lvl)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ background: '#E3E8EE', alignSelf: 'stretch', width: 1 }} />

          {/* RIGHT: what next level looks like */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, flexWrap: 'wrap' as const }}>
              <span style={{
                fontFamily: 'Georgia, serif',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase' as const,
                color: '#6B7B89',
              }}>
                {atTop ? 'Best-in-class' : 'What L' + nextLvl + ' looks like'}
              </span>
              {!atTop && (
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, fontWeight: 700, color: selColor }}>
                  {LEVEL_NAMES[nextLvl]}
                </span>
              )}
            </div>

            <p style={{ fontFamily: 'Georgia, serif', margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, color: '#3D4A57' }}>
              {atTop
                ? "You're already operating at the top of the ladder — the focus shifts to holding the edge as the market moves."
                : getDesc(selCapKey, nextLvl)}
            </p>

            {/* Directional tile — replaces the fabricated "+X pts" tile */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: '#FFFFFF',
              border: `1px solid ${selColor}40`,
              borderRadius: 11,
              padding: '14px 18px',
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
                  {atTop
                    ? 'Focus shifts to holding the edge'
                    : `Reaching L${nextLvl} here moves your NRR most`}
                </span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 20, color: selColor }}>&#8594;</span>
            </div>

            {/* Questions answered */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {selCap.questions.map((q) => {
                const cellScore = getCellScore(selCapKey, q.id, picks)
                const scenarioIdx = picks[selCapKey][q.id]
                const pickedText = scenarioIdx !== null && scenarioIdx !== undefined
                  ? selCap.questions.find((qx) => qx.id === q.id)?.scenarios[scenarioIdx as number]?.text
                  : null
                return (
                  <div key={q.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: cellScore !== null && cellScore >= 4 ? '#3E5C7C' : cellScore !== null && cellScore >= 3 ? '#AABBCC' : '#D2DBE4',
                      color: cellScore !== null && cellScore >= 4 ? '#FFFFFF' : '#243B52',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {cellScore !== null ? 'L' + cellScore : '—'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, fontWeight: 700, color: '#6B7B89', marginBottom: 2 }}>{q.title}</div>
                      {pickedText ? (
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#52606D', lineHeight: 1.5 }}>{pickedText}</div>
                      ) : (
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#C2CAD3', fontStyle: 'italic' }}>Not answered</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
