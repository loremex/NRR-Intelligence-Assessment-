import { Navigate } from 'react-router-dom'
import { useAssessmentState } from '../lib/state'
import { getCapability } from '../lib/rubric'

function Assessment() {
  const [state] = useAssessmentState()

  if (!state.email) return <Navigate to="/" replace />
  if (state.selectedCapabilities.length === 0) return <Navigate to="/" replace />

  const capNames = state.selectedCapabilities
    .map((key) => getCapability(key)?.name ?? key)
    .join(', ')

  return (
    <div className="min-h-screen bg-gray-light font-body">
      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="text-slate-400 text-sm">Step 4 of 5</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
          Coming in Sprint 2
        </p>
        <h1 className="font-display text-3xl font-bold text-navy mb-4">
          Assessment sections (coming in Sprint 2)
        </h1>
        <p className="text-text-dark mb-2">
          You selected:{' '}
          <span className="font-semibold text-navy">{capNames}</span>
        </p>
        <p className="text-sm text-slate-500">
          Your selection has been saved. Full assessment sections arrive in Sprint 2.
        </p>
      </main>
    </div>
  )
}

export default Assessment
