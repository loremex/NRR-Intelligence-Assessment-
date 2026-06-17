import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSession, type NRRField } from '../lib/session'
import { computeNRR, formatCurrency, formatPercent, type NRRResult } from '../lib/nrr'
import { track } from '../lib/analytics'
import { Badge } from '../components/calculator/Badge'
import { ConfirmModal } from '../components/shared/ConfirmModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripFormatting(val: string): string {
  return val.replace(/\D/g, '')
}

function parseField(val: string): number | null {
  const stripped = stripFormatting(val)
  if (!stripped) return null
  return parseInt(stripped, 10)
}

function displayNetMovement(n: number | null): string {
  if (n === null) return '—'
  if (n > 0) return `+${formatCurrency(n)}`
  return formatCurrency(n)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue flex items-center justify-center text-[10px] font-bold leading-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="More information"
        tabIndex={0}
      >
        ?
      </button>
      {visible && (
        <div className="absolute bottom-full left-0 mb-2 z-20 w-60 bg-navy text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none">
          {text}
          <div className="absolute top-full left-3 border-4 border-transparent border-t-navy" />
        </div>
      )}
    </span>
  )
}

interface ResultTileProps {
  label: string
  value: string
  valueClass?: string
  sub?: React.ReactNode
}

function ResultTile({ label, value, valueClass = 'text-navy', sub }: ResultTileProps) {
  return (
    <div className="bg-gray-light rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub}
    </div>
  )
}

const FIELD_META: Record<
  NRRField,
  { label: string; tooltip: string; placeholder: string }
> = {
  startingMRR: {
    label: 'Starting MRR',
    tooltip:
      'MRR from accounts active in both the baseline and current period. Excludes new logos acquired this period.',
    placeholder: '1,000,000',
  },
  expansionMRR: {
    label: 'Expansion MRR',
    tooltip:
      'Positive recurring revenue delta within retained accounts (upgrades, seat adds, usage growth, tier-ups).',
    placeholder: '0',
  },
  contractionMRR: {
    label: 'Contraction MRR',
    tooltip:
      'Negative recurring revenue delta within retained accounts (downgrades, seat reductions, tier-downs). Excludes churned accounts.',
    placeholder: '0',
  },
  churnMRR: {
    label: 'Churn MRR',
    tooltip: 'Full logo loss to $0 within retained-cohort accounts.',
    placeholder: '0',
  },
}

const FIELD_ORDER: NRRField[] = ['startingMRR', 'expansionMRR', 'contractionMRR', 'churnMRR']

// ─── Main page ────────────────────────────────────────────────────────────────

function Calculator() {
  const navigate = useNavigate()
  const { state, dispatch } = useSession()

  // All hooks must run unconditionally before any early return.
  const [values, setValues] = useState<Record<NRRField, string>>(() => {
    const inputs = state.nrrInputs
    if (!inputs) return { startingMRR: '', expansionMRR: '', contractionMRR: '', churnMRR: '' }
    return {
      startingMRR: inputs.startingMRR !== null ? inputs.startingMRR.toLocaleString('en-US') : '',
      expansionMRR:
        inputs.expansionMRR !== null ? inputs.expansionMRR.toLocaleString('en-US') : '',
      contractionMRR:
        inputs.contractionMRR !== null ? inputs.contractionMRR.toLocaleString('en-US') : '',
      churnMRR: inputs.churnMRR !== null ? inputs.churnMRR.toLocaleString('en-US') : '',
    }
  })

  const [errors, setErrors] = useState<Record<NRRField, string>>({
    startingMRR: '',
    expansionMRR: '',
    contractionMRR: '',
    churnMRR: '',
  })

  const [result, setResult] = useState<NRRResult>(() =>
    computeNRR({
      startingMRR: state.nrrInputs?.startingMRR ?? null,
      expansionMRR: state.nrrInputs?.expansionMRR ?? null,
      contractionMRR: state.nrrInputs?.contractionMRR ?? null,
      churnMRR: state.nrrInputs?.churnMRR ?? null,
    }),
  )

  const [showSkipModal, setShowSkipModal] = useState(false)

  // Debounced live computation
  useEffect(() => {
    const timer = setTimeout(() => {
      setResult(
        computeNRR({
          startingMRR: parseField(values.startingMRR),
          expansionMRR: parseField(values.expansionMRR),
          contractionMRR: parseField(values.contractionMRR),
          churnMRR: parseField(values.churnMRR),
        }),
      )
    }, 100)
    return () => clearTimeout(timer)
  }, [values])

  // Gate: redirect if no email (hooks already called above)
  if (!state.email) return <Navigate to="/" replace />

  const parsedStart = parseField(values.startingMRR)
  const canContinue = parsedStart !== null && parsedStart > 0 && !errors.startingMRR
  const showZeroHint =
    values.startingMRR !== '' && parsedStart === 0 && !errors.startingMRR

  function handleChange(field: NRRField, val: string) {
    const stripped = stripFormatting(val)
    setValues((prev) => ({ ...prev, [field]: stripped }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function handleFocus(field: NRRField) {
    const n = parseField(values[field])
    if (n !== null) {
      setValues((prev) => ({ ...prev, [field]: n.toString() }))
    }
  }

  function handleBlur(field: NRRField) {
    const val = values[field]
    const n = parseField(val)

    let errMsg = ''
    if (val !== '' && n === null) errMsg = 'Enter a valid number'

    setErrors((prev) => ({ ...prev, [field]: errMsg }))

    if (n !== null) {
      setValues((prev) => ({ ...prev, [field]: n.toLocaleString('en-US') }))
      dispatch({ type: 'SET_NRR_INPUT', field, value: n })
    } else if (!val) {
      dispatch({ type: 'SET_NRR_INPUT', field, value: null })
    }
  }

  function handleContinue() {
    const finalResult = computeNRR({
      startingMRR: parseField(values.startingMRR),
      expansionMRR: parseField(values.expansionMRR),
      contractionMRR: parseField(values.contractionMRR),
      churnMRR: parseField(values.churnMRR),
    })
    track({
      name: 'nrr_calculator_completed',
      props: {
        nrr_value: finalResult.nrr ?? 0,
        grr_value: finalResult.grr ?? 0,
        nrr_band: finalResult.band?.label ?? 'unknown',
      },
    })
    navigate('/selection')
  }

  function handleSkipConfirm() {
    dispatch({ type: 'SKIP_NRR_CALCULATOR' })
    track({ name: 'nrr_calculator_skipped', props: {} })
    navigate('/selection')
  }

  const netMovementColor =
    result.netMovement === null
      ? 'text-slate-400'
      : result.netMovement > 0
        ? 'text-green-600'
        : result.netMovement < 0
          ? 'text-red-600'
          : 'text-text-dark'

  return (
    <div className="min-h-screen bg-gray-light font-body">
      {/* Nav */}
      <nav className="bg-navy px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-xl text-white tracking-tight">Loremex</span>
          <span className="text-slate-400 text-sm">Step 2 of 5</span>
        </div>
      </nav>

      {/* Page header */}
      <header className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
            NRR Calculator
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy mb-3">
            Calculate Your NRR
          </h1>
          <p className="text-text-dark max-w-2xl text-sm sm:text-base leading-relaxed">
            Enter your most recent reporting period's MRR components. Skip if you don't have these
            numbers at hand — your scorecard still works without them.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* ── Left: Input card ─────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-5">
                {FIELD_ORDER.map((field) => {
                  const meta = FIELD_META[field]
                  return (
                    <div key={field}>
                      <label
                        htmlFor={field}
                        className="flex items-center text-sm font-medium text-text-dark mb-1.5"
                      >
                        {meta.label}
                        {field === 'startingMRR' && (
                          <span className="text-red-500 ml-0.5" aria-hidden="true">
                            *
                          </span>
                        )}
                        <InfoTip text={meta.tooltip} />
                      </label>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                          $
                        </span>
                        <input
                          id={field}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={values[field]}
                          placeholder={meta.placeholder}
                          onChange={(e) => handleChange(field, e.target.value)}
                          onFocus={() => handleFocus(field)}
                          onBlur={() => handleBlur(field)}
                          aria-invalid={!!errors[field]}
                          aria-describedby={
                            errors[field]
                              ? `${field}-error`
                              : showZeroHint && field === 'startingMRR'
                                ? `${field}-hint`
                                : undefined
                          }
                          className={`w-full pl-7 pr-4 py-3 rounded-lg border text-text-dark placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors text-sm ${
                            errors[field]
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 bg-white'
                          }`}
                        />
                      </div>

                      {errors[field] && (
                        <p id={`${field}-error`} role="alert" className="mt-1 text-xs text-red-600">
                          {errors[field]}
                        </p>
                      )}
                      {showZeroHint && field === 'startingMRR' && !errors[field] && (
                        <p id={`${field}-hint`} className="mt-1 text-xs text-amber-600">
                          Starting MRR must be greater than 0
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowSkipModal(true)}
                  className="text-sm text-slate-500 hover:text-text-dark underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded transition-colors"
                >
                  Skip Calculator
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue}
                  aria-disabled={!canContinue}
                  className="w-full sm:w-auto bg-brand-blue text-white font-semibold px-8 py-3 rounded-lg transition-all hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Results panel ──────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Live Results</p>

              {/* NRR tile + badge */}
              <div className="bg-gray-light rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">NRR</p>
                <p className="font-display text-4xl font-bold text-navy mb-2">
                  {result.nrr !== null ? formatPercent(result.nrr) : '—'}
                </p>
                <div className="flex items-start gap-2 flex-wrap">
                  <Badge band={result.band} />
                </div>
                {result.band && (
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    {result.band.description}
                  </p>
                )}
              </div>

              {/* GRR tile */}
              <ResultTile
                label="GRR"
                value={result.grr !== null ? formatPercent(result.grr) : '—'}
              />

              {/* Net Movement tile */}
              <div className="bg-gray-light rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                  Net Movement
                </p>
                <p className={`font-display text-3xl font-bold ${netMovementColor}`}>
                  {displayNetMovement(result.netMovement)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Skip confirmation modal */}
      <ConfirmModal
        open={showSkipModal}
        title="Skip the NRR calculation?"
        body="Your scorecard is more useful with NRR computed. You can still continue without it — your maturity assessment will work the same way."
        primaryLabel="Skip and Continue"
        secondaryLabel="Go Back"
        onPrimary={handleSkipConfirm}
        onSecondary={() => setShowSkipModal(false)}
        onClose={() => setShowSkipModal(false)}
      />
    </div>
  )
}

export default Calculator
