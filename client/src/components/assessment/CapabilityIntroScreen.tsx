import type { V3CapabilityContent } from '../../content/assessmentContent'

interface Props {
  cap: V3CapabilityContent
  direction: 1 | -1
  onContinue: () => void
  onBack: () => void
}

export function CapabilityIntroScreen({ cap, direction, onContinue, onBack }: Props) {
  const inAnim = direction === 1 ? 'nrrQInRight' : 'nrrQInLeft'
  const font = "Georgia, 'Times New Roman', serif"

  return (
    <div className="nrr-anim" style={{ animationName: inAnim }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: font,
          fontSize: 13,
          color: '#6B7B89',
          padding: '0 0 22px',
        }}
      >
        ← Back
      </button>

      <div style={{
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '44px 48px',
        boxShadow: '0 4px 28px rgba(14,43,65,.09)',
        border: '1px solid #E8EEF4',
      }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: font,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '.14em',
          textTransform: 'uppercase' as const,
          color: '#2563EB',
          margin: '0 0 10px',
        }}>
          Capability
        </p>

        {/* Cap name */}
        <h1 style={{
          fontFamily: font,
          fontSize: 30,
          fontWeight: 700,
          color: '#0E2B41',
          margin: '0 0 32px',
          lineHeight: 1.2,
        }}>
          {cap.name}
        </h1>

        {/* Foundation */}
        <div
          className="nrr-anim"
          style={{ animationName: 'nrrFadeUp', animationDelay: '0.06s', marginBottom: 24 }}
        >
          <p style={{
            fontFamily: font,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.13em',
            textTransform: 'uppercase' as const,
            color: '#9AA7B3',
            margin: '0 0 9px',
          }}>
            Foundation
          </p>
          <p style={{
            fontFamily: font,
            fontSize: 15.5,
            lineHeight: 1.72,
            color: '#3D4A57',
            margin: 0,
          }}>
            {cap.intro.foundation}
          </p>
        </div>

        {/* What the frontier looks like */}
        <div
          className="nrr-anim"
          style={{
            animationName: 'nrrFadeUp',
            animationDelay: '0.14s',
            background: '#F3F7FF',
            border: '1px solid rgba(37,99,235,.15)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 36,
          }}
        >
          <p style={{
            fontFamily: font,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.13em',
            textTransform: 'uppercase' as const,
            color: '#2563EB',
            margin: '0 0 9px',
          }}>
            What the frontier looks like
          </p>
          <p style={{
            fontFamily: font,
            fontSize: 15,
            lineHeight: 1.72,
            color: '#3D4A57',
            margin: 0,
            fontStyle: 'italic',
          }}>
            {cap.intro.aiNative}
          </p>
        </div>

        {/* CTA */}
        <div className="nrr-anim" style={{ animationName: 'nrrFadeUp', animationDelay: '0.22s' }}>
          <button
            type="button"
            onClick={onContinue}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              fontFamily: font,
              fontWeight: 700,
              fontSize: 15,
              padding: '13px 30px',
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Begin {cap.name} →
          </button>
        </div>
      </div>
    </div>
  )
}
