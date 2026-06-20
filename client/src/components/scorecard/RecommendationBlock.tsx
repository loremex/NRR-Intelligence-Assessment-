import { formatCurrency } from '../../lib/nrr'

const MATRIX_CAPS = [
  { key: 'reporting', shortName: 'NRR Reporting' },
  { key: 'retention', shortName: 'Retention' },
  { key: 'expansion', shortName: 'Expansion' },
  { key: 'pricing', shortName: 'Pricing Opt.' },
] as const

interface RecommendationBlockProps {
  sentences: string[]
  cta: { text: string; url: string }
  leakDollars: number | null
  capabilityScores: Array<{ key: string; name: string; score: number | null }>
}

export function RecommendationBlock({
  sentences,
  cta,
  leakDollars,
  capabilityScores,
}: RecommendationBlockProps) {
  if (sentences.length === 0) return null

  return (
    <div data-reveal="rec" style={{ marginTop: 36, position: 'relative' }}>
      <div
        style={{
          background: '#0E2B41',
          borderRadius: 16,
          padding: '36px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow orb */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Two-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 36,
          alignItems: 'start',
          position: 'relative',
        }}>

          {/* LEFT: Maturity matrix */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase' as const,
              color: '#6BA0FF',
              margin: '0 0 14px',
            }}>
              Maturity Matrix
            </p>

            {/* Legend — top, two-key */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' as const }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: '#2563EB', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
                  Your company
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: 'rgba(37,99,235,.10)',
                  border: '1.5px dashed rgba(99,179,237,.65)',
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
                  Frontier
                </span>
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '116px repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
              <div />
              {[1, 2, 3, 4, 5].map((l) => (
                <div key={l} style={{
                  textAlign: 'center' as const,
                  fontSize: 11,
                  fontWeight: 700,
                  color: l === 5 ? 'rgba(99,179,237,.85)' : 'rgba(255,255,255,.35)',
                }}>
                  L{l}
                </div>
              ))}
            </div>

            {/* Rows — compact grid, no stretching */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MATRIX_CAPS.map(({ key, shortName }) => {
                const capScore = capabilityScores.find((c) => c.key === key)
                const level = capScore?.score != null
                  ? Math.max(1, Math.min(5, Math.round(capScore.score)))
                  : null

                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '116px repeat(5, 1fr)', gap: 6, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.60)', paddingRight: 8, lineHeight: 1.3 }}>
                      {shortName}
                    </div>
                    {[1, 2, 3, 4, 5].map((l) => {
                      const isCurrent = l === level
                      const isFrontier = l === 5
                      return (
                        <div key={l} style={{
                          height: 40,
                          borderRadius: 6,
                          background: isCurrent
                            ? '#2563EB'
                            : isFrontier
                              ? 'rgba(37,99,235,.10)'
                              : 'rgba(255,255,255,.06)',
                          border: isCurrent
                            ? 'none'
                            : isFrontier
                              ? '1.5px dashed rgba(99,179,237,.55)'
                              : '1px solid rgba(255,255,255,.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isCurrent && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#FFFFFF',
                              letterSpacing: '.03em',
                              userSelect: 'none',
                            }}>
                              You
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT: Recommendation */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase' as const,
              color: '#6BA0FF',
              margin: '0 0 8px',
            }}>
              Where to focus
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700, color: '#FFFFFF', margin: '0 0 20px' }}>
              Your Prioritised Recommendation
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {sentences.map((sentence, i) => (
                <p key={i} style={{ fontSize: 14, color: 'rgba(255,255,255,.72)', lineHeight: 1.65, margin: 0 }}>
                  {sentence}
                </p>
              ))}
            </div>

            {/* m3ter citation + leak ceiling */}
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontFamily: 'Georgia, serif',
                fontSize: 12,
                color: 'rgba(255,255,255,.40)',
                lineHeight: 1.65,
                margin: '0 0 6px',
                fontStyle: 'italic',
              }}>
                Companies that move from manual, flat pricing to automated, usage-based models run 20–25 points higher on NRR.{' '}
                <span style={{ fontSize: 10.5 }}>Source: m3ter, <em>Net Revenue Retention and SaaS Valuations</em> (2026).</span>
              </p>
              {leakDollars !== null && leakDollars > 0 && (
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: 'rgba(255,255,255,.50)', lineHeight: 1.6, margin: 0 }}>
                  Your ceiling is bounded by the {formatCurrency(leakDollars, { compact: true })} you're leaking now.
                </p>
              )}
            </div>

            {/* CTA */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 24, marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                <a
                  href={cta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '12px 28px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    transition: 'opacity .2s, transform .15s',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.opacity = '.9'; ev.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.opacity = '1'; ev.currentTarget.style.transform = 'none' }}
                  onClick={() => {
                    import('../../lib/analytics').then(({ track }) => {
                      track({ name: 'book_call_clicked', props: {} })
                    }).catch(() => undefined)
                  }}
                >
                  Book a call →
                </a>
                <a
                  href="https://www.linkedin.com/company/loremex/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,.08)',
                    color: 'rgba(255,255,255,.8)',
                    fontFamily: 'Georgia, serif',
                    fontWeight: 600,
                    fontSize: 14,
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,.15)',
                    textDecoration: 'none',
                    transition: 'opacity .2s, background .15s',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'rgba(255,255,255,.13)' }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'rgba(255,255,255,.08)' }}
                >
                  LinkedIn ↗
                </a>
                <a
                  href="https://www.loremex.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,.08)',
                    color: 'rgba(255,255,255,.8)',
                    fontFamily: 'Georgia, serif',
                    fontWeight: 600,
                    fontSize: 14,
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,.15)',
                    textDecoration: 'none',
                    transition: 'opacity .2s, background .15s',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'rgba(255,255,255,.13)' }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'rgba(255,255,255,.08)' }}
                >
                  loremex.ai ↗
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
