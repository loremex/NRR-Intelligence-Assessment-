import { composeRecommendation } from '../../lib/recommendations'
import { useAssessmentState } from '../../lib/state'
import type { AllPicks } from '../../lib/scoring'

function toPicks(state: ReturnType<typeof useAssessmentState>[0]): AllPicks {
  return {
    measurement: state.picks.measurement,
    retention: state.picks.retention,
    expansion: state.picks.expansion,
    pricing: state.picks.pricing,
  }
}

export function RecommendationBlock() {
  const [state] = useAssessmentState()
  const picks = toPicks(state)

  const { sentences, cta } = composeRecommendation(state.selectedCapabilities, picks)

  if (sentences.length === 0) return null

  return (
    <section className="mb-10">
      <div className="bg-navy rounded-2xl p-5 sm:p-8">
        <p className="text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
          Where to focus
        </p>
        <h2 className="font-display text-2xl font-bold text-white mb-5">
          Your Prioritised Recommendation
        </h2>
        <div className="space-y-3 mb-8">
          {sentences.map((sentence, i) => (
            <p key={i} className="text-slate-300 text-base leading-relaxed">
              {sentence}
            </p>
          ))}
        </div>
        <div className="border-t border-slate-700 pt-6">
          <p className="text-slate-400 text-sm mb-4">{cta.text}</p>
          <a
            href={cta.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Book a call with Loremex (opens in new tab)"
            className="inline-block bg-brand-blue hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 focus:ring-offset-navy"
            onClick={() => {
              // imported inline to avoid circular dep — analytics event fires on click
              import('../../lib/analytics').then(({ track }) => {
                track({ name: 'book_call_clicked', props: {} })
              }).catch(() => undefined)
            }}
          >
            Book a call →
          </a>
        </div>
      </div>
    </section>
  )
}
