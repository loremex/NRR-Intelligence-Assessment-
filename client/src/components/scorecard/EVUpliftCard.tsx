import { useAssessmentState } from '../../lib/state'
import { computeNRR } from '../../lib/nrr'
import { computeEVUplift, formatEVUplift } from '../../lib/evUplift'

export function EVUpliftCard() {
  const [state] = useAssessmentState()

  const nrrResult =
    state.nrrInputs && !state.nrrCalculatorSkipped
      ? computeNRR(state.nrrInputs)
      : null

  const evResult = computeEVUplift(
    state.nrrInputs?.startingMRR ?? null,
    nrrResult?.nrr ?? null,
  )

  if (!evResult) return null

  return (
    <section className="mb-10" aria-label="Enterprise Value Impact">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-2">
          Enterprise Value Impact
        </p>
        <p className="text-sm text-slate-500 mb-5">
          Based on your Starting MRR at the tiered NRR-to-EV multiple.
        </p>

        {evResult.topOfMarketMessage ? (
          <p className="text-sm text-text-dark italic leading-relaxed mb-4">
            {evResult.topOfMarketMessage}
          </p>
        ) : null}

        <div className="space-y-3 mb-5">
          {evResult.scenarios.map((scenario) => (
            <div
              key={`${scenario.targetNRR}-${scenario.label}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm text-text-dark">{scenario.label}</span>
              <span className="flex items-center gap-2 shrink-0">
                {scenario.ppDelta > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    +{scenario.ppDelta}pp{scenario.ppCapped ? '+' : ''}
                  </span>
                )}
                <span className="font-bold text-green-700 text-lg tabular-nums">
                  {evResult.topOfMarketMessage
                    ? `${formatEVUplift(scenario.evUplift)} EV preserved`
                    : formatEVUplift(scenario.evUplift)}
                </span>
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 italic leading-relaxed">
          Indicative — based on public SaaS valuation benchmarks. Real EV varies by growth rate, margin, and market conditions.
        </p>
      </div>
    </section>
  )
}
