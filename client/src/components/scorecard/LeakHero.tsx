import { formatCurrency } from '../../lib/nrr'
import type { NRRResult, NRRInputs } from '../../lib/nrr'

interface LeakHeroProps {
  nrrResult: NRRResult
  nrrInputs: NRRInputs
}

export function LeakHero({ nrrResult, nrrInputs }: LeakHeroProps) {
  const { nrr, grr, leakDollars, netMovementDollars } = nrrResult
  if (leakDollars === null || nrr === null || grr === null) return null

  const startMRR = nrrInputs.startingMRR ?? 0
  const conD =
    nrrInputs.mode === 'dollars'
      ? (nrrInputs.contraction ?? 0)
      : startMRR * ((nrrInputs.contraction ?? 0) / 100)
  const churnD =
    nrrInputs.mode === 'dollars'
      ? (nrrInputs.churn ?? 0)
      : startMRR * ((nrrInputs.churn ?? 0) / 100)

  const nrrPct = (nrr * 100).toFixed(1)
  const grrPct = (grr * 100).toFixed(1)
  const leakFmt = formatCurrency(leakDollars, { compact: true })

  const variant: 'V1' | 'V2' | 'V3' = nrr < 1.0 ? 'V1' : grr < 0.9 ? 'V2' : 'V3'

  const copy = {
    V1: {
      headline: `Your leak outran expansion this quarter — ${leakFmt} walked out the door.`,
      body: `With NRR at ${nrrPct}%, contraction and churn are outpacing expansion. ${leakFmt} left the base — and net revenue shrank. This isn't a revenue problem. It's a measurement and response problem: the signals were there; the system to catch them wasn't.`,
    },
    V2: {
      headline: `You retained net positive — but ${leakFmt} left the base before expansion filled the gap.`,
      body: `NRR reads ${nrrPct}% because expansion covered the leak. But GRR is ${grrPct}% — below the 90% threshold that separates companies who are managing churn from those who are tolerating it. The expansion that rescued this quarter may not be there next quarter.`,
    },
    V3: {
      headline: `You've largely closed the leak — ${leakFmt} left the base this quarter.`,
      body: `With GRR at ${grrPct}%, you've built a retention foundation most companies don't have. The remaining ${leakFmt} is preventable — the question is whether you have the measurement and response capability to catch it before it compounds.`,
    },
  }[variant]

  const retainedPct = startMRR > 0 ? Math.max(0, ((startMRR - leakDollars) / startMRR) * 100) : 0
  const contractionPct = startMRR > 0 ? (conD / startMRR) * 100 : 0
  const churnPct = startMRR > 0 ? (churnD / startMRR) * 100 : 0

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 680px) {
          .leak-hero-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
      <div
        data-reveal="leak"
        className="leak-hero-grid"
        style={{
          background: '#0E2B41',
          borderRadius: 18,
          padding: '38px 40px',
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: '1.45fr 0.85fr',
          gap: 40,
          alignItems: 'start',
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6BA0FF', margin: '0 0 12px' }}>
            What This Is Costing You
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#FFFFFF', margin: '0 0 20px', lineHeight: 1.35 }}>
            {copy.headline}
          </h2>

          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 14, borderRadius: 999, overflow: 'hidden', display: 'flex', background: '#1D3B55' }}>
              <div style={{ width: `${retainedPct}%`, background: 'linear-gradient(90deg,#3D7BFF,#6BA0FF)' }} />
              <div style={{ width: `${contractionPct}%`, background: '#C98A5E' }} />
              <div style={{ width: `${churnPct}%`, background: '#9C6B5B' }} />
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap' as const }}>
              {[
                { color: '#3D7BFF', label: 'Retained base' },
                { color: '#C98A5E', label: 'Contraction' },
                { color: '#9C6B5B', label: 'Churn' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.72)', lineHeight: 1.65, margin: 0 }}>
            {copy.body}
          </p>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 14,
            padding: 26,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.38)', margin: '0 0 8px' }}>
            Quarterly Leak
          </p>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 54, fontWeight: 700, color: '#FF8A72', lineHeight: 1 }}>
            {leakFmt}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: '6px 0 0' }}>
            Contraction + churn
          </p>
          {netMovementDollars !== null && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', margin: '0 0 4px' }}>Net Movement</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: netMovementDollars >= 0 ? '#6BA0FF' : '#FF8A72', margin: 0 }}>
                {netMovementDollars >= 0 ? '+' : ''}{formatCurrency(netMovementDollars, { compact: true })}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
