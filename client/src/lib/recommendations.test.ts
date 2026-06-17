import { describe, it, expect } from 'vitest'
import { composeRecommendation } from './recommendations'
import type { AllPicks } from './scoring'
import type { CapKey } from './state'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAllL(level: number): AllPicks {
  const dims = ['People', 'Process', 'Technology', 'Data']
  const leverIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
  const mIds = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']

  const actionCap: Record<string, Record<string, number | null>> = {}
  leverIds.forEach((id) => {
    actionCap[id] = Object.fromEntries(dims.map((d) => [d, level]))
  })

  const mPicks: Record<string, number | null> = {}
  mIds.forEach((id) => { mPicks[id] = level })

  return {
    measurement: mPicks,
    retention: structuredClone(actionCap),
    expansion: structuredClone(actionCap),
    pricing: structuredClone(actionCap),
  }
}

function makeCapPicks(level: number): Record<string, Record<string, number | null>> {
  const dims = ['People', 'Process', 'Technology', 'Data']
  const leverIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
  const cap: Record<string, Record<string, number | null>> = {}
  leverIds.forEach((id) => {
    cap[id] = Object.fromEntries(dims.map((d) => [d, level]))
  })
  return cap
}


function noUnfilledTokens(sentences: string[]): boolean {
  const combined = sentences.join(' ')
  return !combined.includes('undefined') && !combined.includes('null') && !combined.includes('NaN')
}

// ─── Pattern A ────────────────────────────────────────────────────────────────

describe('Pattern A — weakest cap (always fires for ≥1 action cap)', () => {
  it('fires with 1 action cap (retention only)', () => {
    const picks = makeAllL(3)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Retention')
    expect(combined).toContain('/5')
  })

  it('fires with 3 action caps — identifies weakest', () => {
    const picks: AllPicks = {
      measurement: {},
      retention: makeCapPicks(4),
      expansion: makeCapPicks(2),
      pricing: makeCapPicks(3),
    }
    const caps: CapKey[] = ['retention', 'expansion', 'pricing']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Expansion')
  })

  it('always contributes 2 sentences', () => {
    const picks = makeAllL(3)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    // Pattern A = 2 sentences, others not firing at level 3, so exactly 2
    expect(result.sentences.length).toBe(2)
  })

  it('returns CTA', () => {
    const picks = makeAllL(3)
    const result = composeRecommendation(['retention'], picks)
    expect(result.cta.url).toContain('calendly')
    expect(result.cta.text).toBeTruthy()
  })
})

// ─── Pattern B ────────────────────────────────────────────────────────────────

describe('Pattern B — cross-cap dim weakness', () => {
  it('fires when a dim is weak (<2.5) across caps', () => {
    const picks: AllPicks = {
      measurement: {},
      retention: {
        L1: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L2: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L3: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L4: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L5: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L6: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L7: { People: 4, Process: 4, Technology: 1, Data: 1 },
      },
      expansion: {
        L1: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L2: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L3: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L4: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L5: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L6: { People: 4, Process: 4, Technology: 1, Data: 1 },
        L7: { People: 4, Process: 4, Technology: 1, Data: 1 },
      },
      pricing: {},
    }
    const caps: CapKey[] = ['retention', 'expansion']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toMatch(/Technology|Data/)
    expect(combined).toContain('structural constraint')
  })

  it('does NOT fire with only 1 action cap', () => {
    const picks = makeAllL(1)
    const result = composeRecommendation(['retention'], picks)
    expect(result.sentences.join(' ')).not.toContain('structural constraint')
  })
})

// ─── Pattern C ────────────────────────────────────────────────────────────────

describe('Pattern C — measurement gap', () => {
  it('fires when measurement selected and overall < 3.0', () => {
    const picks: AllPicks = {
      measurement: { M1: 2, M2: 2, M3: 2, M4: 1, M5: 2, M6: 1, M7: 1 },
      retention: makeCapPicks(3),
      expansion: {},
      pricing: {},
    }
    const caps: CapKey[] = ['measurement', 'retention']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('NRR Reporting maturity')
  })

  it('does NOT fire when measurement overall >= 3.0', () => {
    const picks = makeAllL(4)
    const caps: CapKey[] = ['measurement', 'retention']
    const result = composeRecommendation(caps, picks)
    expect(result.sentences.join(' ')).not.toContain('reliable measurement')
  })

  it('does NOT fire when measurement not selected', () => {
    const picks = makeAllL(1)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    expect(result.sentences.join(' ')).not.toContain('reliable measurement')
  })
})

// ─── Pattern D ────────────────────────────────────────────────────────────────

describe('Pattern D — strong baseline', () => {
  it('fires when Overall Intelligence > 3.5', () => {
    const picks = makeAllL(4)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Overall Intelligence')
    expect(combined).toContain('L4–L5 transition')
  })

  it('does NOT fire when Overall Intelligence <= 3.5', () => {
    const picks = makeAllL(3)
    const caps: CapKey[] = ['retention']
    const result = composeRecommendation(caps, picks)
    expect(result.sentences.join(' ')).not.toContain('L4–L5 transition')
  })
})

// ─── Pattern E ────────────────────────────────────────────────────────────────

describe('Pattern E — theme imbalance', () => {
  it('fires when PROVE vs SELL gap > 0.7', () => {
    // L1,L2 = PROVE; L3,L4,L5 = SELL; set PROVE high, SELL low
    const proveSell: Record<string, Record<string, number | null>> = {
      L1: { People: 5, Process: 5, Technology: 5, Data: 5 },
      L2: { People: 5, Process: 5, Technology: 5, Data: 5 },
      L3: { People: 1, Process: 1, Technology: 1, Data: 1 },
      L4: { People: 1, Process: 1, Technology: 1, Data: 1 },
      L5: { People: 1, Process: 1, Technology: 1, Data: 1 },
      L6: { People: 3, Process: 3, Technology: 3, Data: 3 },
      L7: { People: 3, Process: 3, Technology: 3, Data: 3 },
    }
    const picks: AllPicks = {
      measurement: {},
      retention: structuredClone(proveSell),
      expansion: structuredClone(proveSell),
      pricing: {},
    }
    const result = composeRecommendation(['retention', 'expansion'], picks)
    const combined = result.sentences.join(' ')
    expect(combined).toMatch(/PROVE|SELL/)
  })

  it('does NOT fire with only 1 action cap', () => {
    const picks = makeAllL(3)
    const result = composeRecommendation(['retention'], picks)
    expect(result.sentences.join(' ')).not.toMatch(/PROVE levers/)
  })
})

// ─── Pattern F ────────────────────────────────────────────────────────────────

describe('Pattern F — pricing gap', () => {
  it('fires when pricing is lower than other caps by >0.5', () => {
    const picks: AllPicks = {
      measurement: {},
      retention: makeCapPicks(4),
      expansion: makeCapPicks(4),
      pricing: makeCapPicks(2),
    }
    const caps: CapKey[] = ['retention', 'expansion', 'pricing']
    const result = composeRecommendation(caps, picks)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('Pricing')
    expect(combined).toContain('silent NRR killer')
  })

  it('does NOT fire when pricing is not selected', () => {
    const picks = makeAllL(2)
    const result = composeRecommendation(['retention', 'expansion'], picks)
    expect(result.sentences.join(' ')).not.toContain('silent NRR killer')
  })

  it('does NOT fire when pricing score is not significantly lower', () => {
    const picks = makeAllL(3)
    const result = composeRecommendation(['retention', 'pricing'], picks)
    expect(result.sentences.join(' ')).not.toContain('silent NRR killer')
  })
})

// ─── Sentence budget cap ──────────────────────────────────────────────────────

describe('Sentence budget — max 3 pattern sentences', () => {
  it('never exceeds 3 sentences even when many patterns fire', () => {
    // C fires: low measurement, B fires: cross-cap dim weak, A fires: always (2 sentences)
    // That's already 4 sentences → A must be trimmed/dropped
    const picks: AllPicks = {
      measurement: { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1, M6: 1, M7: 1 },
      retention: {
        L1: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L2: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L3: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L4: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L5: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L6: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L7: { People: 1, Process: 1, Technology: 5, Data: 5 },
      },
      expansion: {
        L1: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L2: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L3: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L4: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L5: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L6: { People: 1, Process: 1, Technology: 5, Data: 5 },
        L7: { People: 1, Process: 1, Technology: 5, Data: 5 },
      },
      pricing: {},
    }
    const result = composeRecommendation(['measurement', 'retention', 'expansion'], picks)
    expect(result.sentences.length).toBeLessThanOrEqual(3)
  })

  it('priority order: C beats A when budget is tight', () => {
    const picks: AllPicks = {
      measurement: { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1, M6: 1, M7: 1 },
      retention: makeCapPicks(3),
      expansion: {},
      pricing: {},
    }
    const result = composeRecommendation(['measurement', 'retention'], picks)
    // C (priority 1) should appear before A (priority 3)
    const combined = result.sentences.join(' ')
    expect(combined).toContain('NRR Reporting maturity')
  })
})

// ─── Measurement-only special case ───────────────────────────────────────────

describe('Measurement-only special case', () => {
  it('fires specialized variant when only measurement selected', () => {
    const picks: AllPicks = {
      measurement: { M1: 2, M2: 3, M3: 2, M4: 1, M5: 3, M6: 2, M7: 1 },
      retention: {},
      expansion: {},
      pricing: {},
    }
    const result = composeRecommendation(['measurement'], picks)
    expect(result.sentences.length).toBe(1)
    const s = result.sentences[0]
    expect(s).toContain('NRR Reporting maturity')
    expect(s).toContain('foundation')
  })

  it('measurement-only includes the score', () => {
    const picks: AllPicks = {
      measurement: { M1: 3, M2: 3, M3: 3, M4: 3, M5: 3, M6: 3, M7: 3 },
      retention: {},
      expansion: {},
      pricing: {},
    }
    const result = composeRecommendation(['measurement'], picks)
    expect(result.sentences[0]).toContain('/5')
  })

  it('empty selection returns empty sentences', () => {
    const picks = makeAllL(3)
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
    { caps: ['measurement', 'retention'], desc: 'measurement + retention' },
    { caps: ['retention', 'expansion'], desc: 'retention + expansion' },
    { caps: ['retention', 'expansion', 'pricing'], desc: 'all action caps' },
    { caps: ['measurement', 'retention', 'expansion', 'pricing'], desc: 'all caps' },
    { caps: ['measurement'], desc: 'measurement only' },
  ]

  for (const { caps, desc } of combos) {
    it(`no undefined/null/NaN tokens for: ${desc}`, () => {
      const picks = makeAllL(2)
      const result = composeRecommendation(caps, picks)
      expect(noUnfilledTokens(result.sentences)).toBe(true)
      expect(noUnfilledTokens([result.cta.text])).toBe(true)
    })

    it(`no unfilled tokens at level 4 for: ${desc}`, () => {
      const picks = makeAllL(4)
      const result = composeRecommendation(caps, picks)
      expect(noUnfilledTokens(result.sentences)).toBe(true)
    })
  }
})
