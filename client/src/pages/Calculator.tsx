import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAssessmentState, type NRRField } from '../lib/state'
import { computeNRR, formatCurrency, formatPercent, type NRRMode, type NRRResult } from '../lib/nrr'
import { track } from '../lib/analytics'
import { Badge } from '../components/calculator/Badge'
import { ConfirmModal } from '../components/shared/ConfirmModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDollar(val: string): number | null {
  const stripped = val.replace(/\D/g, '')
  if (!stripped) return null
  return parseInt(stripped, 10)
}

function parsePct(val: string): number | null {
  const stripped = val.replace(/[^0-9.]/g, '')
  if (!stripped) return null
  const n = parseFloat(stripped)
  return isNaN(n) ? null : n
}

type CompField = 'expansion' | 'contraction' | 'churn'

// ─── Field copy ────────────────────────────────────────────────────────────────

const STARTING_MRR = {
  helpText:
    'Your recurring revenue at the start of your reporting quarter. Only include accounts active at the start — exclude new logos closed during the quarter.',
  tooltip:
    "Don't include one-time fees, professional services, hardware, or setup charges. NRR is recurring revenue only.",
}

const COMP_META: Record<CompField, { dollarLabel: string; pctLabel: string; helpText: string; tooltip: string }> = {
  expansion: {
    dollarLabel: 'Expansion MRR ($)',
    pctLabel: 'Expansion %',
    helpText:
      'Recurring revenue gained within existing accounts during the quarter — upgrades, seat additions, usage growth, tier-ups.',
    tooltip:
      "Does not include new logos. If a customer signed for the first time this quarter, that's New Logo revenue and lives outside NRR math.",
  },
  contraction: {
    dollarLabel: 'Contraction MRR ($)',
    pctLabel: 'Contraction %',
    helpText:
      'Recurring revenue lost within accounts that stayed — downgrades, seat reductions, tier-downs. Customer didn\'t leave, but they reduced their spend.',
    tooltip:
      "Contraction is partial loss. If a customer dropped from $10K to $7K MRR, that $3K is Contraction. If they dropped to $0, that's Churn (next field).",
  },
  churn: {
    dollarLabel: 'Churn MRR ($)',
    pctLabel: 'Churn %',
    helpText:
      "Recurring revenue lost from accounts that fully left — cancelled, didn't renew, or went to $0. The customer is gone.",
    tooltip: 'Logo churn only. A customer who downgraded but stayed is Contraction, not Churn.',
  },
}

const COMP_FIELDS: CompField[] = ['expansion', 'contraction', 'churn']

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

// ─── Main page ────────────────────────────────────────────────────────────────

function Calculator() {
  const navigate = useNavigate()
  const [state, dispatch] = useAssessmentState()

  const currentMode: NRRMode = state.nrrInputs?.mode ?? 'dollars'

  // All hooks must run unconditionally before any early return.
  const [showReadFirst, setShowReadFirst] = useState(false)
  const [showExplanations, setShowExplanations] = useState(false)

  const [values, setValues] = useState<Record<NRRField, string>>(() => {
    const inputs = state.nrrInputs
    if (!inputs) return { startingMRR: '', expansion: '', contraction: '', churn: '' }
    const fmtDollar = (v: number | null) => (v !== null ? v.toLocaleString('en-US') : '')
    const fmtPct = (v: number | null) => (v !== null ? v.toString() : '')
    const fmtComp = inputs.mode === 'dollars' ? fmtDollar : fmtPct
    return {
      startingMRR: fmtDollar(inputs.startingMRR),
      expansion: fmtComp(inputs.expansion),
      contraction: fmtComp(inputs.contraction),
      churn: fmtComp(inputs.churn),
    }
  })

  const [errors, setErrors] = useState<Record<NRRField, string>>({
    startingMRR: '',
    expansion: '',
    contraction: '',
    churn: '',
  })

  const [result, setResult] = useState<NRRResult>(() =>
    computeNRR({
      mode: state.nrrInputs?.mode ?? 'dollars',
      startingMRR: state.nrrInputs?.startingMRR ?? null,
      expansion: state.nrrInputs?.expansion ?? null,
      contraction: state.nrrInputs?.contraction ?? null,
      churn: state.nrrInputs?.churn ?? null,
    }),
  )

  const [showSkipModal, setShowSkipModal] = useState(false)

  // Debounced live computation
  useEffect(() => {
    const timer = setTimeout(() => {
      const parseComp = currentMode === 'dollars' ? parseDollar : parsePct
      setResult(
        computeNRR({
          mode: currentMode,
          startingMRR: parseDollar(values.startingMRR),
          expansion: parseComp(values.expansion),
          contraction: parseComp(values.contraction),
          churn: parseComp(values.churn),
        }),
      )
    }, 100)
    return () => clearTimeout(timer)
  }, [values, currentMode])

  // Gate: redirect if no email (hooks already called above)
  if (!state.email) return <Navigate to="/" replace />

  // ─── Derived ──────────────────────────────────────────────────────────────

  const parseComp = currentMode === 'dollars' ? parseDollar : parsePct

  const parsedStart = parseDollar(values.startingMRR)
  const parsedExp = parseComp(values.expansion)
  const parsedCon = parseComp(values.contraction)
  const parsedChurn = parseComp(values.churn)

  const canContinue =
    parsedStart !== null && parsedStart > 0 &&
    parsedExp !== null &&
    parsedCon !== null &&
    parsedChurn !== null &&
    !errors.startingMRR && !errors.expansion && !errors.contraction && !errors.churn

  const showPctWarning =
    currentMode === 'percentages' &&
    parsedCon !== null && parsedChurn !== null &&
    parsedCon + parsedChurn > 100

  const netMovementColor =
    result.netMovementDollars === null
      ? 'text-slate-400'
      : result.netMovementDollars > 0
        ? 'text-green-600'
        : result.netMovementDollars < 0
          ? 'text-red-600'
          : 'text-text-dark'

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleModeSwitch(newMode: NRRMode) {
    if (newMode === currentMode) return
    setValues((prev) => ({ ...prev, expansion: '', contraction: '', churn: '' }))
    setErrors((prev) => ({ ...prev, expansion: '', contraction: '', churn: '' }))
    dispatch({ type: 'SET_NRR_MODE', mode: newMode })
  }

  function handleChange(field: NRRField, val: string) {
    const isDollarField = field === 'startingMRR' || currentMode === 'dollars'
    const stripped = isDollarField ? val.replace(/\D/g, '') : val.replace(/[^0-9.]/g, '')
    setValues((prev) => ({ ...prev, [field]: stripped }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function handleFocus(field: NRRField) {
    const isDollarField = field === 'startingMRR' || currentMode === 'dollars'
    if (isDollarField) {
      const n = parseDollar(values[field])
      if (n !== null) setValues((prev) => ({ ...prev, [field]: n.toString() }))
    }
  }

  function handleBlur(field: NRRField) {
    const val = values[field]
    const isDollarField = field === 'startingMRR' || currentMode === 'dollars'
    const n = isDollarField ? parseDollar(val) : parsePct(val)

    let errMsg = ''
    if (val !== '' && n === null) errMsg = 'Enter a valid number'
    if (n !== null && field === 'startingMRR' && n <= 0) errMsg = 'Must be greater than 0'

    setErrors((prev) => ({ ...prev, [field]: errMsg }))

    if (n !== null && !errMsg) {
      if (isDollarField) {
        setValues((prev) => ({ ...prev, [field]: n.toLocaleString('en-US') }))
      }
      dispatch({ type: 'SET_NRR_INPUT', field, value: n })
    } else if (!val) {
      dispatch({ type: 'SET_NRR_INPUT', field, value: null })
    }
  }

  function handleContinue() {
    const finalResult = computeNRR({
      mode: currentMode,
      startingMRR: parseDollar(values.startingMRR),
      expansion: parseComp(values.expansion),
      contraction: parseComp(values.contraction),
      churn: parseComp(values.churn),
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

  // ─── Render ───────────────────────────────────────────────────────────────

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
          <img src="/loremex-logo-blue.png" alt="Loremex" style={{ height: 24, width: 'auto', filter: 'brightness(0) invert(1)', display: 'block' }} />
          <span className="text-slate-400 text-sm">Step 2 of 4</span>
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
            Enter your most recent quarter's MRR components in dollars or as percentages of Starting
            MRR — both modes produce identical results. Skip if you don't have these figures at hand.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">

          {/* ── Left: Input card ───────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">

              {/* Top controls row: disclosure + explanations toggle */}
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => setShowReadFirst((v) => !v)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-text-dark transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue rounded"
                  aria-expanded={showReadFirst}
                >
                  <span
                    className={`inline-block transition-transform duration-150 ${showReadFirst ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                  Read this first
                </button>

                <button
                  type="button"
                  onClick={() => setShowExplanations((v) => !v)}
                  className="text-xs text-brand-blue hover:text-blue-700 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded transition-colors"
                >
                  {showExplanations ? 'Hide explanations' : 'Show explanations'}
                </button>
              </div>

              {/* Disclosure */}
              {showReadFirst && (
                <div className="mb-5 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed space-y-2">
                  <p>
                    These calculations assume a single reporting period (typically a quarter) across
                    your retained-account cohort.
                  </p>
                  <ul className="space-y-1.5 pl-2">
                    <li>
                      <strong>Expansion:</strong> upsells, seat additions, usage overages, tier
                      upgrades — within accounts already active at period start
                    </li>
                    <li>
                      <strong>Contraction:</strong> downgrades, seat reductions, tier-downs within
                      accounts that stayed — NOT accounts that fully churned
                    </li>
                    <li>
                      <strong>Churn:</strong> MRR from accounts that fully cancelled or went to $0
                    </li>
                    <li>
                      <strong>New logos are NOT included</strong> — NRR is a retained-cohort metric
                    </li>
                  </ul>
                  <p className="text-slate-500 text-xs pt-1">
                    NRR = (Starting + Expansion − Contraction − Churn) ÷ Starting
                    <br />
                    GRR = (Starting − Contraction − Churn) ÷ Starting
                  </p>
                </div>
              )}

              {/* Mode toggle */}
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
                  Input mode
                </p>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('dollars')}
                    className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue ${
                      currentMode === 'dollars'
                        ? 'bg-navy text-white'
                        : 'bg-white text-slate-500 hover:text-text-dark'
                    }`}
                    aria-pressed={currentMode === 'dollars'}
                  >
                    $ Dollar amounts
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('percentages')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue ${
                      currentMode === 'percentages'
                        ? 'bg-navy text-white'
                        : 'bg-white text-slate-500 hover:text-text-dark'
                    }`}
                    aria-pressed={currentMode === 'percentages'}
                  >
                    % of Starting MRR
                  </button>
                </div>
                {currentMode === 'percentages' && (
                  <p className="mt-2 text-xs text-slate-400">
                    Enter each component as a percentage of your Starting MRR. The canonical dollar formula is applied automatically.
                  </p>
                )}
              </div>

              {/* Starting MRR — full row */}
              <div className="mb-5">
                <label
                  htmlFor="startingMRR"
                  className="flex items-center text-sm font-medium text-text-dark mb-1.5"
                >
                  Starting MRR
                  <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                  <InfoTip text={STARTING_MRR.tooltip} />
                </label>
                {showExplanations && (
                  <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                    {STARTING_MRR.helpText}
                  </p>
                )}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    id="startingMRR"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={values.startingMRR}
                    placeholder="1,000,000"
                    onChange={(e) => handleChange('startingMRR', e.target.value)}
                    onFocus={() => handleFocus('startingMRR')}
                    onBlur={() => handleBlur('startingMRR')}
                    aria-invalid={!!errors.startingMRR}
                    aria-describedby={errors.startingMRR ? 'startingMRR-error' : undefined}
                    className={`w-full pl-7 pr-4 py-3 rounded-lg border text-text-dark placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors text-sm ${
                      errors.startingMRR ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                </div>
                {errors.startingMRR && (
                  <p id="startingMRR-error" role="alert" className="mt-1 text-xs text-red-600">
                    {errors.startingMRR}
                  </p>
                )}
              </div>

              {/* Component fields — 3-col grid */}
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {COMP_FIELDS.map((field) => {
                  const meta = COMP_META[field]
                  const label = currentMode === 'dollars' ? meta.dollarLabel : meta.pctLabel
                  const isPct = currentMode === 'percentages'
                  return (
                    <div key={field}>
                      <label
                        htmlFor={field}
                        className="flex items-center text-sm font-medium text-text-dark mb-1.5"
                      >
                        <span className="truncate">{label}</span>
                        <span className="text-red-500 ml-0.5 shrink-0" aria-hidden="true">*</span>
                        <InfoTip text={meta.tooltip} />
                      </label>
                      {showExplanations && (
                        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                          {meta.helpText}
                        </p>
                      )}
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
                          placeholder="0"
                          onChange={(e) => handleChange(field, e.target.value)}
                          onFocus={() => handleFocus(field)}
                          onBlur={() => handleBlur(field)}
                          aria-invalid={!!errors[field]}
                          aria-describedby={errors[field] ? `${field}-error` : undefined}
                          className={`w-full ${isPct ? 'pr-8 pl-4' : 'pl-7 pr-4'} py-3 rounded-lg border text-text-dark placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors text-sm ${
                            errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
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

              {/* Non-blocking % warning */}
              {showPctWarning && (
                <div
                  role="note"
                  className="flex gap-3 items-start p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-4"
                >
                  <span aria-hidden="true" className="shrink-0 text-sm">⚠</span>
                  <p>
                    Contraction + Churn exceeds 100% of Starting MRR. Double-check your inputs — GRR
                    may turn negative.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400 mb-6">
                * All fields required — enter 0 if a component is zero for your period.
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

          {/* ── Right: Results panel ────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Live Results</p>

              {/* NRR tile */}
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
              <div className="bg-gray-light rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">GRR</p>
                <p className="font-display text-3xl font-bold text-navy">
                  {result.grr !== null ? formatPercent(result.grr) : '—'}
                </p>
              </div>

              {/* Net Movement tile — shows both $ and % */}
              <div className="bg-gray-light rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                  Net Movement
                </p>
                <p className={`font-display text-3xl font-bold ${netMovementColor}`}>
                  {result.netMovementDollars !== null
                    ? `${result.netMovementDollars >= 0 ? '+' : ''}${formatCurrency(result.netMovementDollars)}`
                    : '—'}
                </p>
                {result.netMovementPct !== null && (
                  <p className={`text-sm font-medium mt-0.5 ${netMovementColor}`}>
                    {`${result.netMovementPct >= 0 ? '+' : ''}${formatPercent(result.netMovementPct)}`}
                  </p>
                )}
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
