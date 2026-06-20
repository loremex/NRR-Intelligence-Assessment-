import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type CapKey } from '../lib/state'
import { V3_ASSESSMENT_CONTENT, CAP_ORDER } from '../content/assessmentContent'
import { ActionCapabilitySection } from '../components/assessment/ActionCapabilitySection'
import { ProgressIndicator } from '../components/assessment/ProgressIndicator'

function Assessment() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()

  const sections = CAP_ORDER.filter((k) => state.selectedCapabilities.includes(k))

  const getInitialIdx = () => {
    const idx = sections.findIndex((s) => !state.completedSections.includes(s))
    return idx === -1 ? sections.length : idx
  }

  const [currentIdx, setCurrentIdx] = useState(getInitialIdx)

  if (!state.email) return <Navigate to="/" replace />
  if (state.selectedCapabilities.length === 0) return <Navigate to="/" replace />
  if (currentIdx >= sections.length) return <Navigate to="/scorecard" replace />

  const currentSection = sections[currentIdx]
  const currentCapContent = V3_ASSESSMENT_CONTENT.find((c) => c.key === currentSection)!

  function handleSectionComplete() {
    dispatch({ type: 'COMPLETE_SECTION', section: currentSection })
    const nextIdx = currentIdx + 1
    if (nextIdx >= sections.length) {
      navigate('/scorecard')
    } else {
      setCurrentIdx(nextIdx)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleBack() {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/selection')
    }
  }

  const questionOffset = currentIdx * 3
  const totalQuestions = sections.length * 3

  return (
    <div className="min-h-screen bg-gray-light font-body">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-navy focus:font-semibold focus:rounded focus:ring-2 focus:ring-brand-blue"
      >
        Skip to main content
      </a>

      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="text-slate-400 text-sm">Step 4 of 5</span>
        </div>
      </nav>

      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-text-dark mb-4 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {currentIdx === 0
              ? 'Back to Capability Selection'
              : `Back to ${V3_ASSESSMENT_CONTENT.find((c) => c.key === sections[currentIdx - 1])?.name ?? 'Previous'}`}
          </button>
          <ProgressIndicator
            currentSectionIndex={currentIdx}
            totalSections={sections.length}
            currentSectionName={currentCapContent.name}
          />
        </div>
      </header>

      <main id="main-content" className="max-w-5xl mx-auto px-6 py-8">
        <ActionCapabilitySection
          capabilityKey={currentSection as CapKey}
          questionOffset={questionOffset}
          totalQuestions={totalQuestions}
          onComplete={handleSectionComplete}
          onBackToPrevSection={handleBack}
        />
      </main>
    </div>
  )
}

export default Assessment
