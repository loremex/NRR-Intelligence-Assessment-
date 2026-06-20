import { useState, useEffect, useRef } from 'react'
import type { V3CapabilityContent } from '../../content/assessmentContent'

interface Props {
  cap: V3CapabilityContent
  qIdx: 0 | 1 | 2
  existingPick: number | null
  direction: 1 | -1
  onSelect: (scenarioIndex: number) => void
  onBack: () => void
  onNext: () => void
}

export function QuestionScreen({ cap, qIdx, existingPick, direction, onSelect, onBack, onNext }: Props) {
  const question = cap.questions[qIdx]
  const font = "Georgia, 'Times New Roman', serif"
  const inAnim = direction === 1 ? 'nrrQInRight' : 'nrrQInLeft'

  const [localSelected, setLocalSelected] = useState<number | null>(existingPick)
  const [isPending, setIsPending] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '1' && e.key <= '5') {
        handleOptionClick(parseInt(e.key) - 1)
      } else if ((e.key === 'ArrowRight' || e.key === 'Enter') && localSelected !== null && !isPending) {
        if (timerRef.current) clearTimeout(timerRef.current)
        onNext()
      } else if (e.key === 'ArrowLeft') {
        if (timerRef.current) clearTimeout(timerRef.current)
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function handleOptionClick(idx: number) {
    if (isPending) return
    setLocalSelected(idx)
    setIsPending(true)
    onSelect(idx)
    timerRef.current = setTimeout(() => onNext(), 440)
  }

  return (
    <div className="nrr-anim" style={{ animationName: inAnim }}>
      {/* Back */}
      <button
        type="button"
        onClick={() => {
          if (timerRef.current) clearTimeout(timerRef.current)
          onBack()
        }}
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
        padding: '40px 44px',
        boxShadow: '0 4px 28px rgba(14,43,65,.09)',
        border: '1px solid #E8EEF4',
      }}>
        {/* Topic */}
        <p style={{
          fontFamily: font,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '.14em',
          textTransform: 'uppercase' as const,
          color: '#2563EB',
          margin: '0 0 10px',
        }}>
          {question.title}
        </p>

        {/* Question */}
        <h2 style={{
          fontFamily: font,
          fontSize: 20,
          fontWeight: 700,
          color: '#0E2B41',
          margin: '0 0 28px',
          lineHeight: 1.42,
        }}>
          {question.question}
        </h2>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {question.scenarios.map((scenario, i) => {
            const isSelected = localSelected === i
            const isDimmed = isPending && !isSelected
            return (
              <div
                key={i}
                className="nrr-anim"
                style={{
                  animationName: 'nrrOptIn',
                  animationDelay: `${i * 0.06 + 0.05}s`,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleOptionClick(i)}
                  disabled={isPending && !isSelected}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '15px 18px',
                    borderRadius: 12,
                    border: `1.5px solid ${isSelected ? '#2563EB' : '#E3E8EE'}`,
                    background: isSelected ? 'rgba(37,99,235,.06)' : '#FFFFFF',
                    cursor: isDimmed ? 'default' : 'pointer',
                    textAlign: 'left' as const,
                    opacity: isDimmed ? 0.45 : 1,
                    transition: 'border-color .15s, background .15s, opacity .2s',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => { if (!isPending && !isSelected) e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#FFFFFF' }}
                >
                  {/* Number */}
                  <span style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: isSelected ? '#2563EB' : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : '#6B7B89',
                    fontFamily: font,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                    transition: 'background .15s, color .15s',
                  }}>
                    {i + 1}
                  </span>
                  {/* Text */}
                  <span style={{
                    fontFamily: font,
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: isSelected ? '#0E2B41' : '#52606D',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'color .15s',
                  }}>
                    {scenario.text}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        {/* Next */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current)
              if (localSelected !== null) onNext()
            }}
            disabled={localSelected === null}
            style={{
              background: localSelected !== null ? '#2563EB' : '#E8EEF4',
              color: localSelected !== null ? '#FFFFFF' : '#9AA7B3',
              fontFamily: font,
              fontWeight: 700,
              fontSize: 14,
              padding: '12px 28px',
              borderRadius: 10,
              border: 'none',
              cursor: localSelected !== null ? 'pointer' : 'not-allowed',
              transition: 'background .2s, color .2s',
            }}
            onMouseEnter={(e) => { if (localSelected !== null) e.currentTarget.style.opacity = '.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
