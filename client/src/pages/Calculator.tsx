import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type NRRField } from '../lib/state'
import { computeNRR, formatPercent, type NRRResult } from '../lib/nrr'
import { track } from '../lib/analytics'
import { Badge } from '../components/calculator/Badge'
import { ConfirmModal } from '../components/shared/ConfirmModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePctField(val: string): number | null {
  const stripped = val.replace(/[^0-9.]/g, '')
  if (!stripped) return null
  const n = parseFloat(stripped)
  return isNaN(n) ? null : n
}

function parseDollarField(val: string): number | null {
  const stripped = val.replace(/\D/g, '')
  if (!stripped) return null
  return parseInt(stripped, 10)
}

function displayNetMovement(n: number | null): string {
  if (n === null) return '—'
  const pct = (n * 100).toFixed(1)
  return n > 0 ? `+${pct}%` : `${pct}%`
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
        <div className="absolute bottom-full left-0 mb-2 z-20 w-64 bg-navy text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none">
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

// ─── Field config ──────────────────────────────────────────────────────────────

type FieldType = 'pct' | 'dollar'

const FIELD_META: Record<
  NRRField,
  { label: string; tooltip: string; placeholder: string; type: FieldType; optional?: boolean }
> = {
  expansionPct: {
    label: 'Expansion MRR',
    tooltip:
      'Positive recurring revenue added within retained accounts — upsells, seat adds, usage overages, tier upgrades. Enter as % of period-opening MRR.',
    placeholder: '0',
    type: 'pct',
  },
  contractionPct: {
    label: 'Contraction MRR',
    tooltip:
      'Negative recurring revenue delta within retained accounts — downgrades, seat reductions. Excludes churned accounts. Enter as % of period-opening MRR.',
    placeholder: '0',
    type: 'pct',
  },
  churnPct: {
    label: 'Churn MRR',
    tooltip:
      'Full logo cancellations — accounts that reduced to $0 MRR. Enter as % of period-opening MRR.',
    placeholder: '0',
    type: 'pct',
  },
  startingMRR: {
    label: 'Starting MRR',
    tooltip:
      'Period-opening MRR from your retained-account cohort (excludes new logos). Optional — used for context only and does not affect NRR or GRR.',
    placeholder: '1,000,000',
    type: 'dollar',
    optional: true,
  },
}

const FIELD_ORDER: NRRField[] = ['expansionPct', 'contractionPct', 'churnPct', 'startingMRR']

// ─── Main page ────────────────────────────────────────────────────────────────

function Calculator() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()
  const [showAssumptions, setShowAssumptions] = useState(false)

  // All hooks must run unconditionally before any early return.
  const [values, setValues] = useState<Record<NRRField, string>>(() => {
    const inputs = state.nrrInputs
    if (!inputs) return { startingMRR: '', expansionPct: '', contractionPct: '', churnPct: '' }
    return {
      startingMRR: inputs.startingMRR != null ? inputs.startingMRR.toLocaleString('en-US') : '',
      expansionPct: inputs.expansionPct !== null ? inputs.expansionPct.toString() : '',
      contractionPct: inputs.contractionPct !== null ? inputs.contractionPct.toString() : '',
      churnPct: inputs.churnPct !== null ? inputs.churnPct.toString() : '',
    }
  })

  const [errors, setErrors] = useState<Record<NRRField, string>>({
    startingMRR: '',
    expansionPct: '',
    contractionPct: '',
    churnPct: '',
  })

  const [result, setResult] = useState<NRRResult>(() =>
    computeNRR({
      startingMRR: state.nrrInputs?.startingMRR ?? null,
      expansionPct: state.nrrInputs?.expansionPct ?? null,
      contractionPct: state.nrrInputs?.contractionPct ?? null,
      churnPct: state.nrrInputs?.churnPct ?? null,
    }),
  )

  const [showSkipModal, setShowSkipModal] = useState(false)

  // Debounced live computation
  useEffect(() => {
    const timer = setTimeout(() => {
      setResult(
        computeNRR({
          startingMRR: parseDollarField(values.startingMRR),
          expansionPct: parsePctField(values.expansionPct),
          contractionPct: parsePctField(values.contractionPct),
          churnPct: parsePctField(values.churnPct),
        }),
      )
    }, 100)
    return () => clearTimeout(timer)
  }, [values])

  // Gate: redirect if no email (hooks already called above)
  if (!state.email) return <Navigate to="/" replace />

  const parsedExp = parsePctField(values.expansionPct)
  const parsedCon = parsePctField(values.contractionPct)
  const parsedChurn = parsePctField(values.churnPct)
  const canContinue =
    parsedExp !== null &&
    parsedCon !== null &&
    parsedChurn !== null &&
    !errors.expansionPct &&
    !errors.contractionPct &&
    !errors.churnPct

  function handleChange(field: NRRField, val: string) {
    const meta = FIELD_META[field]
    const stripped =
      meta.type === 'pct' ? val.replace(/[^0-9.]/g, '') : val.replace(/\D/g, '')
    setValues((prev) => ({ ...prev, [field]: stripped }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function handleFocus(field: NRRField) {
    if (FIELD_META[field].type === 'dollar') {
      const n = parseDollarField(values[field])
      if (n !== null) setValues((prev) => ({ ...prev, [field]: n.toString() }))
    }
  }

  function handleBlur(field: NRRField) {
    const val = values[field]
    const meta = FIELD_META[field]
    const n = meta.type === 'pct' ? parsePctField(val) : parseDollarField(val)

    let errMsg = ''
    if (val !== '' && n === null) errMsg = 'Enter a valid number'

    setErrors((prev) => ({ ...prev, [field]: errMsg }))

    if (n !== null && !errMsg) {
      if (meta.type === 'dollar') {
        setValues((prev) => ({ ...prev, [field]: n.toLocaleString('en-US') }))
      }
      dispatch({ type: 'SET_NRR_INPUT', field, value: n })
    } else if (!val) {
      dispatch({ type: 'SET_NRR_INPUT', field, value: null })
    }
  }

  function handleContinue() {
    const finalResult = computeNRR({
      startingMRR: parseDollarField(values.startingMRR),
      expansionPct: parsePctField(values.expansionPct),
      contractionPct: parsePctField(values.contractionPct),
      churnPct: parsePctField(values.churnPct),
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
            What's your NRR?
          </h1>
          <p className="text-text-dark max-w-2xl text-sm sm:text-base leading-relaxed">
            Enter rate percentages from your most recent reporting quarter. NRR and GRR are
            calculated from the three components below — no starting MRR needed. Skip if you don't
            have these figures at hand.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* ── Left: Input card ─────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">

              {/* Collapsible disclosure */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowAssumptions((v) => !v)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-text-dark transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue rounded"
                  aria-expanded={showAssumptions}
                >
                  <span
                    className={`inline-block transition-transform duration-150 ${showAssumptions ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                  Calculation Assumptions
                </button>
                {showAssumptions && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed space-y-2">
                    <p>
                      These figures assume a single reporting period (quarter or month) across your
                      retained-account cohort.
                    </p>
                    <ul className="space-y-1 pl-2">
                      <li>
                        <strong>Expansion:</strong> upsells, seat adds, usage overages, or tier
                        upgrades — as % of period-opening MRR
                      </li>
                      <li>
                        <strong>Contraction:</strong> downgrades or seat reductions within retained
                        accounts — excludes churned accounts
                      </li>
                      <li>
                        <strong>Churn:</strong> full logo cancellations (MRR → $0) — as % of
                        period-opening MRR
                      </li>
                    </ul>
                    <p className="text-slate-500 text-xs pt-1">
                      NRR = 100% + Expansion% − Contraction% − Churn%
                      <br />
                      GRR = 100% − Contraction% − Churn%
                    </p>
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="grid sm:grid-cols-2 gap-5">
                {FIELD_ORDER.map((field) => {
                  const meta = FIELD_META[field]
                  const isPct = meta.type === 'pct'
                  return (
                    <div key={field}>
                      <label
                        htmlFor={field}
                        className="flex items-center text-sm font-medium text-text-dark mb-1.5"
                      >
                        {meta.label}
                        {!meta.optional && (
                          <span className="text-red-500 ml-0.5" aria-hidden="true">
                            *
                          </span>
                        )}
                        {meta.optional && (
                          <span className="ml-1.5 text-xs text-slate-400 font-normal">
                            (optional)
                          </span>
                        )}
                        <InfoTip text={meta.tooltip} />
                      </label>

                      <div className="relative">
                        {!isPct && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                            $
                          </span>
                        )}
                        <input
                          id={field}
                          type="text"
                          inputMode={isPct ? 'decimal' : 'numeric'}
                          autoComplete="off"
                          value={values[field]}
                          placeholder={meta.placeholder}
                          onChange={(e) => handleChange(field, e.target.value)}
                          onFocus={() => handleFocus(field)}
                          onBlur={() => handleBlur(field)}
                          aria-invalid={!!errors[field]}
                          aria-describedby={errors[field] ? `${field}-error` : undefined}
                          className={`w-full ${isPct ? 'pr-8 pl-4' : 'pl-7 pr-4'} py-3 rounded-lg border text-text-dark placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors text-sm ${
                            errors[field]
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 bg-white'
                          }`}
                        />
                        {isPct && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                            %
                          </span>
                        )}
                      </div>

                      {errors[field] && (
                        <p id={`${field}-error`} role="alert" className="mt-1 text-xs text-red-600">
                          {errors[field]}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Required fields note */}
              <p className="mt-4 text-xs text-slate-400">
                * Required — enter 0 if this component is zero for your period.
              </p>

              {/* Actions */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
