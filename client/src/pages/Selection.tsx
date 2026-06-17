import { Navigate } from 'react-router-dom'
import { useSession } from '../lib/session'

function Selection() {
  const { state } = useSession()

  if (!state.email) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-gray-light font-body">
      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="text-slate-400 text-sm">Step 3 of 5</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
          Coming in S3.3
        </p>
        <h1 className="font-display text-3xl font-bold text-navy mb-4">Capability Selection</h1>
        <p className="text-text-dark">
          Choose which capabilities to assess. Implementation coming in Sprint 1 Story 3.3.
        </p>
      </main>
    </div>
  )
}

export default Selection
