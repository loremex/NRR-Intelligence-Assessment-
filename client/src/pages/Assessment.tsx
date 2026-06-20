import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type CapKey } from '../lib/state'
import { V3_ASSESSMENT_CONTENT, CAP_ORDER } from '../content/assessmentContent'
import { CapabilityIntroScreen } from '../components/assessment/CapabilityIntroScreen'
import { QuestionScreen } from '../components/assessment/QuestionScreen'

type Step =
  | { type: 'intro'; capKey: CapKey }
  | { type: 'question'; capKey: CapKey; qIdx: 0 | 1 | 2 }

const ANIMATION_CSS = `
  @keyframes nrrQInRight {
    from { opacity: 0; transform: translateX(34px); }
    to   { opacity: 1; transform: translateX(0);    }
  }
  @keyframes nrrQInLeft {
    from { opacity: 0; transform: translateX(-34px); }
    to   { opacity: 1; transform: translateX(0);     }
  }
  @keyframes nrrOptIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes nrrPop {
    0%   { transform: scale(0.96); }
    55%  { transform: scale(1.04); }
    100% { transform: scale(1);    }
  }
  @keyframes nrrFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .nrr-anim {
    animation-duration: 0.38s;
    animation-fill-mode: both;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .nrr-anim { animation: none !important; }
  }
`

function Assessment() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()

  const selectedCaps = CAP_ORDER.filter((k) => state.selectedCapabilities.includes(k))

  const steps: Step[] = selectedCaps.flatMap((capKey) => [
    { type: 'intro' as const, capKey },
    { type: 'question' as const, capKey, qIdx: 0 as const },
    { type: 'question' as const, capKey, qIdx: 1 as const },
    { type: 'question' as const, capKey, qIdx: 2 as const },
  ])

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [animKey, setAnimKey] = useState(0)

  if (!state.email) return <Navigate to="/" replace />
  if (selectedCaps.length === 0) return <Navigate to="/" replace />

  const step = steps[currentStep]
  const font = "Georgia, 'Times New Roman', serif"

  function advance() {
    if (currentStep + 1 >= steps.length) {
      navigate('/scorecard')
      return
    }
    setDirection(1)
    setAnimKey((k) => k + 1)
    setCurrentStep((s) => s + 1)
  }

  function goBack() {
    if (currentStep === 0) {
      navigate('/selection')
      return
    }
    setDirection(-1)
    setAnimKey((k) => k + 1)
    setCurrentStep((s) => s - 1)
  }

  function handleSelect(capKey: CapKey, qId: string, scenarioIndex: number) {
    dispatch({ type: 'SET_PICK_SCENARIO', capKey, qId, scenarioIndex })
    if (qId === 'q3') {
      dispatch({ type: 'COMPLETE_SECTION', section: capKey })
    }
  }

  function getCapProgress(capKey: CapKey): number {
    const picks = state.picks[capKey] as Record<string, number | null | undefined>
    return ['q1', 'q2', 'q3'].filter((q) => picks[q] != null).length / 3
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: font }}>
      <style>{ANIMATION_CSS}</style>

      {/* Nav bar */}
      <nav style={{ background: '#0E2B41', padding: '14px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/loremex-logo-blue.png" alt="Loremex" style={{ height: 24, width: 'auto', filter: 'brightness(0) invert(1)', display: 'block' }} />
          <span style={{ fontFamily: font, fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
            Step 4 of 4
          </span>
        </div>
      </nav>

      {/* Progress bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EEF4', padding: '16px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10 }}>
          {selectedCaps.map((capKey) => {
            const cap = V3_ASSESSMENT_CONTENT.find((c) => c.key === capKey)!
            const progress = getCapProgress(capKey)
            const isActive = step.capKey === capKey
            const isDone = progress === 1
            return (
              <div key={capKey} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 99, background: '#EEF1F5', overflow: 'hidden', marginBottom: 7 }}>
                  <div style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    background: '#2563EB',
                    opacity: isDone ? 1 : isActive ? 0.75 : 0.2,
                    borderRadius: 99,
                    transition: 'width .4s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                </div>
                <div style={{
                  fontFamily: font,
                  fontSize: 11,
                  color: isActive ? '#0E2B41' : isDone ? '#2563EB' : '#9AA7B3',
                  fontWeight: isActive ? 700 : 400,
                  transition: 'color .2s',
                  whiteSpace: 'nowrap' as const,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {cap.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 64px' }}>
        {step.type === 'intro' ? (
          <CapabilityIntroScreen
            key={animKey}
            cap={V3_ASSESSMENT_CONTENT.find((c) => c.key === step.capKey)!}
            direction={direction}
            onContinue={advance}
            onBack={goBack}
          />
        ) : (
          <QuestionScreen
            key={animKey}
            cap={V3_ASSESSMENT_CONTENT.find((c) => c.key === step.capKey)!}
            qIdx={step.qIdx}
            existingPick={(state.picks[step.capKey] as Record<string, number | null | undefined>)[`q${step.qIdx + 1}`] ?? null}
            direction={direction}
            onSelect={(scenarioIndex) => handleSelect(step.capKey, `q${step.qIdx + 1}`, scenarioIndex)}
            onBack={goBack}
            onNext={advance}
          />
        )}
      </main>
    </div>
  )
}

export default Assessment
