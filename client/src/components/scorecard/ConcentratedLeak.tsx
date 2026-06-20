import type { WeakestCell } from '../../lib/scoring'
import { V3_ASSESSMENT_CONTENT } from '../../content/assessmentContent'

interface ConcentratedLeakProps {
  pooledTop3: WeakestCell[]
  allQuestionTitleById: Record<string, string>
}

export function ConcentratedLeak({ pooledTop3, allQuestionTitleById }: ConcentratedLeakProps) {
  if (pooledTop3.length === 0) return null

  return (
    <div data-reveal="concentrated" style={{ marginTop: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7B89', margin: '0 0 10px' }}>
        Where your leak is concentrated
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pooledTop3.map((lv, k) => {
          const cellKey = `${lv.capKey}/${lv.qId}`
          const capContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === lv.capKey)
          const capDisplayName = capContent?.name ?? lv.capKey
          return (
            <div
              key={cellKey}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: '#FFFFFF',
                border: '1px solid #E3E8EE',
                borderRadius: 10,
                padding: '12px 16px',
              }}
            >
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: '#D0D8E0', flexShrink: 0, width: 24, textAlign: 'center' as const }}>
                {k + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#243B52' }}>{allQuestionTitleById[cellKey] ?? lv.qId}</div>
                <div style={{ fontSize: 11, color: '#AEB8C2', marginTop: 2 }}>{capDisplayName}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7B89', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                L{lv.score} · +{lv.gapToL5} to L5
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
