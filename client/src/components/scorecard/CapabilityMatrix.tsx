import { V2_LEVERS, getV2CellScore, getV2CapabilityOverall, type AllPicks } from '../../lib/scoring'
import type { ActionCapKey } from '../../lib/state'
import { V2_ASSESSMENT_CONTENT, V2_LEVER_LABELS } from '../../content/assessmentContent'

interface CapabilityMatrixProps {
  picks: AllPicks
  selectedCaps: ActionCapKey[]
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

export function CapabilityMatrix({ picks, selectedCaps }: CapabilityMatrixProps) {
  if (selectedCaps.length === 0) return null

  const caps = V2_ASSESSMENT_CONTENT.filter((c) => selectedCaps.includes(c.key as ActionCapKey))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 640 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9AA7B3', borderBottom: '1px solid #EEF1F4' }}>
              Capability
            </th>
            {V2_LEVERS.map((lever) => (
              <th key={lever} style={{ textAlign: 'center', padding: '8px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9AA7B3', borderBottom: '1px solid #EEF1F4' }}>
                {V2_LEVER_LABELS[lever].replace(' intelligence', '')}
              </th>
            ))}
            <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9AA7B3', borderBottom: '1px solid #EEF1F4' }}>
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {caps.map((cap) => {
            const capKey = cap.key as ActionCapKey
            const overall = getV2CapabilityOverall(capKey, picks)
            return (
              <tr key={capKey}>
                <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#243B52', borderBottom: '1px solid #F0F3F6', whiteSpace: 'nowrap' as const }}>
                  {cap.name}
                </td>
                {V2_LEVERS.map((lever) => {
                  const score = getV2CellScore(capKey, lever, picks)
                  return (
                    <td key={lever} style={{ padding: 3, borderBottom: '1px solid #F0F3F6' }}>
                      <div style={{
                        borderRadius: 6,
                        background: cellBg(score),
                        color: cellFg(score),
                        fontSize: 14,
                        fontWeight: 700,
                        textAlign: 'center',
                        padding: '9px 0',
                      }}>
                        {score ?? '—'}
                      </div>
                    </td>
                  )
                })}
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F3F6' }}>
                  <div style={{
                    borderRadius: 6,
                    background: overall !== null ? '#EAEFF5' : '#F4F6F9',
                    color: overall !== null ? '#0E2B41' : '#C2CAD3',
                    fontSize: 14,
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '9px 0',
                  }}>
                    {overall !== null ? overall.toFixed(2) : '—'}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
