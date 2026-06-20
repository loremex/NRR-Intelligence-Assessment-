import { describe, it, expect } from 'vitest'
import { composeRecommendation } from './recommendations'
import type { AllPicks } from './scoring'
import type { CapKey } from './state'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAllScenario(scenarioIndex: number): AllPicks {
  const cap: Record<string, number | null> = { q1: scenarioIndex, q2: scenarioIndex, q3: scenarioIndex }
  return {
    reporting: { ...cap },
    retention: { ...cap },
    expansion: { ...cap },
    pricing: { ...cap },
  }
}

function makeCapPicks(scenarioIndex: number): Record<string, number | null> {
  return { q1: scenarioIndex, q2: scenarioIndex, q3: scenarioIndex }
}

function noUnfilledTokens(sentences: string[]): boolean {
  const combined = sentences.join(' ')
  return !combined.includes('undefined') && !combined.includes('null') && !combined.includes('NaN')
}

// ─── Pattern A ────────────────────────────────────────────────────────────────

describe('Pattern A — weakest cap (always fires for ≥1 cap)', () => {
  it('fires with 1 cap (retention only)', () => {
    const picks = makeAllScenario(2)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Retention')
    expect(combined).toContain('/5')
  })

  it('fires with 3 caps — identifies weakest', () => {
    const picks: AllPicks = {
      reporting: {},
      retention: makeCapPicks(3),   // score 4
      expansion: makeCapPicks(1),   // score 2 (weakest)
      pricing: makeCapPicks(2),     // score 3
    }
    const caps: CapKey[] = ['retention', 'expansion', 'pricing']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Expansion')
  })

  it('always contributes 2 sentences', () => {
    const picks = makeAllScenario(2)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    // Pattern A = 2 sentences, others not firing at scenario 2, so exactly 2
    expect(result.sentences.length).toBe(2)
  })

  it('returns CTA', () => {
    const picks = makeAllScenario(2)
    const result = composeRecommendation(['retention'], picks)
    expect(result.cta.url).toContain('calendly')
    expect(result.cta.text).toBeTruthy()
  })
})

// ─── Pattern C ────────────────────────────────────────────────────────────────

describe('Pattern C — reporting gap', () => {
  it('fires when reporting selected and overall < 3.0', () => {
    const picks: AllPicks = {
      reporting: { q1: 1, q2: 1, q3: 0 }, // scores 2,2,1 → cap=1.67 < 3
      retention: makeCapPicks(2),
      expansion: {},
      pricing: {},
    }
    const caps: CapKey[] = ['reporting', 'retention']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('NRR Reporting maturity')
  })

  it('does NOT fire when reporting overall >= 3.0', () => {
    const picks = makeAllScenario(3) // score 4 each
    const caps: CapKey[] = ['reporting', 'retention']
    const result = composeRecommendation(caps, picks)
    expect(result.sentences.join(' ')).not.toContain('reliable measurement')
  })

  it('does NOT fire when reporting not selected', () => {
    const picks = makeAllScenario(0)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    expect(result.sentences.join(' ')).not.toContain('reliable measurement')
  })
})

// ─── Pattern D ────────────────────────────────────────────────────────────────

describe('Pattern D — strong baseline', () => {
  it('fires when Overall Intelligence > 3.5 (scenario index 3 → score 4)', () => {
    const picks = makeAllScenario(3)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Overall Intelligence')
    expect(combined).toContain('L4–L5 transition')
  })

  it('does NOT fire when Overall Intelligence <= 3.5 (scenario index 2 → score 3)', () => {
    const picks = makeAllScenario(2)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    expect(result.sentences.join(' ')).not.toContain('L4–L5 transition')
  })
})

// ─── Pattern F ────────────────────────────────────────────────────────────────

describe('Pattern F — pricing gap', () => {
  it('fires when pricing is lower than other caps by >0.5', () => {
    const picks: AllPicks = {
      reporting: {},
      retention: makeCapPicks(3),   // score 4
      expansion: makeCapPicks(3),   // score 4
      pricing: makeCapPicks(0),     // score 1
    }
    const caps: CapKey[] = ['retention', 'expansion', 'pricing']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Pricing')
    expect(combined).toContain('silent NRR killer')
  })

  it('does NOT fire when pricing is not selected', () => {
    const picks = makeAllScenario(1)
    const result = composeRecommendation(['retention', 'expansion'], picks)
    expect(result.sentences.join(' ')).not.toContain('silent NRR killer')
  })

  it('does NOT fire when pricing score is not significantly lower', () => {
    const picks = makeAllScenario(2)
    const result = composeRecommendation(['retention', 'pricing'], picks)
    expect(result.sentences.join(' ')).not.toContain('silent NRR killer')
  })
})

// ─── Sentence budget cap ──────────────────────────────────────────────────────

describe('Sentence budget — max 3 pattern sentences', () => {
  it('never exceeds 3 sentences even when many patterns fire', () => {
    // C fires (low reporting), A fires (always, 2 sentences) → total 3
    const picks: AllPicks = {
      reporting: { q1: 0, q2: 0, q3: 0 }, // score 1 < 3 → Pattern C fires
      retention: makeCapPicks(1),
      expansion: makeCapPicks(1),
      pricing: {},
    }
    const result = composeRecommendation(['reporting', 'retention', 'expansion'], picks)
    expect(result.sentences.length).toBeLessThanOrEqual(3)
  })

  it('priority order: C beats A when budget is tight', () => {
    const picks: AllPicks = {
      reporting: { q1: 0, q2: 0, q3: 0 }, // score 1 < 3
      retention: makeCapPicks(2),
      expansion: {},
      pricing: {},
    }
    const result = composeRecommendation(['reporting', 'retention'], picks)
    // C (priority 1) should appear before A (priority 3)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('NRR Reporting maturity')
  })
})

// ─── Empty selection ──────────────────────────────────────────────────────────

describe('Empty selection', () => {
  it('empty selection returns empty sentences', () => {
    const picks = makeAllScenario(2)
    const result = composeRecommendation([], picks)
    expect(result.sentences).toHaveLength(0)
    expect(result.cta).toBeTruthy()
  })
})

// ─── No unfilled tokens ───────────────────────────────────────────────────────

describe('No unfilled tokens in any combination', () => {
  const combos: Array<{ caps: CapKey[]; desc: string }> = [
    { caps: ['retention'], desc: 'retention only' },
    { caps: ['expansion'], desc: 'expansion only' },
    { caps: ['pricing'], desc: 'pricing only' },
    { caps: ['reporting', 'retention'], desc: 'reporting + retention' },
    { caps: ['retention', 'expansion'], desc: 'retention + expansion' },
    { caps: ['retention', 'expansion', 'pricing'], desc: 'retention + expansion + pricing' },
    { caps: ['reporting', 'retention', 'expansion', 'pricing'], desc: 'all caps' },
    { caps: ['reporting'], desc: 'reporting only' },
  ]

  for (const { caps, desc } of combos) {
    it(`no undefined/null/NaN tokens for: ${desc}`, () => {
      const picks = makeAllScenario(1)
      const result = composeRecommendation(caps, picks)
      expect(noUnfilledTokens(result.sentences)).toBe(true)
      expect(noUnfilledTokens([result.cta.text])).toBe(true)
    })

    it(`no unfilled tokens at scenario 3 (score 4) for: ${desc}`, () => {
      const picks = makeAllScenario(3)
      const result = composeRecommendation(caps, picks)
      expect(noUnfilledTokens(result.sentences)).toBe(true)
    })
  }
})
