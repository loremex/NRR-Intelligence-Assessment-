import { Navigate } from 'react-router-dom'
import { useSession } from '../lib/session'

function Calculator() {
  const { state } = useSession()

  if (!state.email) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="min-h-screen bg-gray-light flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-blue mb-3">
          Step 2 of 5
        </p>
        <h1 className="font-display text-3xl font-bold text-navy mb-3">NRR Calculator</h1>
        <p className="text-text-dark">Coming in S2.1</p>
      </div>
    </main>
  )
}

export default Calculator
