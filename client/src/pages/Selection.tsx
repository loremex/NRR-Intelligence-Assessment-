import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type CapKey } from '../lib/state'
import { getCapabilities } from '../lib/rubric'
import { track } from '../lib/analytics'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAP_ORDER = ['measurement', 'retention', 'expansion', 'pricing']

const capabilities = getCapabilities().slice().sort(
  (a, b) => CAP_ORDER.indexOf(a.key) - CAP_ORDER.indexOf(b.key),
)

function computeScope(caps: CapKey[]): string {
  if (caps.length === 4) return 'full'
  if (!caps.includes('measurement') && caps.length > 0) return 'action-only'
  return 'partial'
}

// ─── Main page ────────────────────────────────────────────────────────────────

function Selection() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()

  // Hook must run unconditionally before the email guard.
  const [selectedSet, setSelectedSet] = useState<Set<CapKey>>(() => {
    if (state.selectedCapabilities.length > 0) {
      return new Set(state.selectedCapabilities)
    }
    return new Set(capabilities.map((c) => c.key as CapKey))
  })

  if (!state.email) return <Navigate to="/" replace />

  function handleToggle(key: CapKey) {
    setSelectedSet((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const totalMinutes = capabilities
    .filter((c) => selectedSet.has(c.key as CapKey))
    .reduce((sum, c) => sum + c.estimatedMinutes, 0)

  const noneSelected = selectedSet.size === 0

  const showMeasurementWarning =
    !selectedSet.has('measurement') &&
    (['retention', 'expansion', 'pricing'] as CapKey[]).some((k) => selectedSet.has(k))

  function handleContinue() {
    const caps = CAP_ORDER.filter((k) => selectedSet.has(k as CapKey)) as CapKey[]
    const scope = computeScope(caps)
    dispatch({ type: 'SET_SELECTED_CAPABILITIES', capabilities: caps })
    track({
      name: 'capabilities_selected',
      props: { capabilities: caps, scope, estimated_minutes: totalMinutes },
    })
    navigate('/assessment')
  }

  return (
    <div className="min-h-screen bg-gray-light font-body">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-navy focus:font-semibold focus:rounded focus:ring-2 focus:ring-brand-blue"
      >
        Skip to main content
      </a>

      {/* Nav */}
      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="text-slate-400 text-sm">Step 3 of 5</span>
        </div>
      </nav>

      {/* Page header */}
      <header className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
            Capability Selection
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy mb-3">
            What do you want to assess?
          </h1>
          <p className="text-text-dark max-w-2xl text-sm sm:text-base leading-relaxed">
            Pick any combination. Your scorecard adapts to what you choose. You can always come
            back for the others later.
          </p>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Capability cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {capabilities.map((cap) => {
            const key = cap.key as CapKey
            const isSelected = selectedSet.has(key)
            return (
              <label
                key={key}
                htmlFor={`cap-${key}`}
                aria-label={`${cap.name}: ${cap.tagline}`}
                className={`flex items-start gap-4 p-5 rounded-xl border-2 bg-white cursor-pointer transition-all select-none ${
                  isSelected
                    ? 'border-navy shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  id={`cap-${key}`}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(key)}
                  className="mt-1 h-5 w-5 shrink-0 accent-navy cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display text-lg font-bold text-navy">{cap.name}</h3>
                    {key === 'measurement' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-brand-blue">
                        Recommended (foundational)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-dark leading-relaxed mb-3">{cap.tagline}</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    ~{cap.estimatedMinutes} min
                  </span>
                </div>
              </label>
            )
          })}
        </div>

        {/* Measurement warning */}
        {showMeasurementWarning && (
          <div
            role="note"
            className="flex gap-3 items-start p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800"
          >
            <span aria-hidden="true" className="shrink-0 text-base">⚠</span>
            <p>
              Without measurement, your intelligence scores assume your NRR reporting is reliable.
              We recommend including this block.
            </p>
          </div>
        )}

        {/* Time estimate + Continue */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div>
            {noneSelected ? (
              <p className="text-sm text-slate-500">Pick at least one block to continue</p>
            ) : (
              <p className="text-text-dark font-medium">
                Estimated time:{' '}
                <span className="text-navy font-bold">{totalMinutes} minutes</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={noneSelected}
            aria-disabled={noneSelected}
            className="w-full sm:w-auto bg-navy text-white font-semibold px-8 py-3 rounded-lg transition-all hover:bg-slate-800 active:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            Start Assessment →
          </button>
        </div>
      </main>
    </div>
  )
}

export default Selection
