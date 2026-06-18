import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { assessmentReducer, defaultState, loadFromStorage, DEFAULT_DIAGNOSTIC_ANSWERS, type CapKey } from './state'
import { computeDiagnosticScores } from '../content/diagnosticTemplates'

const STORAGE_KEY = 'loremex_assessment_state_v6'

describe('assessmentReducer', () => {
  it('default state has correct shape', () => {
    expect(defaultState.schemaVersion).toBe(6)
    expect(defaultState.email).toBeNull()
    expect(defaultState.sessionId).toBeNull()
    expect(defaultState.selectedCapabilities).toEqual([])
    expect(defaultState.preSelectedCapabilities).toEqual([])
    expect(defaultState.diagnosticAnswers).toBeNull()
    expect(defaultState.nrrCalculatorSkipped).toBe(false)
    expect(defaultState.completedSections).toEqual([])
  })

  it('SET_EMAIL updates email and consent', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_EMAIL',
      email: 'test@example.com',
      consent: true,
    })
    expect(state.email).toBe('test@example.com')
    expect(state.consent).toBe(true)
    expect(state.sessionId).toBeNull()
  })

  it('SET_SESSION updates sessionId and contactId only', () => {
    const withEmail = assessmentReducer(defaultState, {
      type: 'SET_EMAIL',
      email: 'x@x.com',
      consent: true,
    })
    const state = assessmentReducer(withEmail, {
      type: 'SET_SESSION',
      sessionId: 'sess-abc',
      contactId: 'hs-123',
    })
    expect(state.sessionId).toBe('sess-abc')
    expect(state.contactId).toBe('hs-123')
    expect(state.email).toBe('x@x.com')
  })

  it('SET_NRR_INPUT initialises nrrInputs in dollars mode by default', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_NRR_INPUT',
      field: 'startingMRR',
      value: 1_000_000,
    })
    expect(state.nrrInputs?.mode).toBe('dollars')
    expect(state.nrrInputs?.startingMRR).toBe(1_000_000)
    expect(state.nrrInputs?.expansion).toBeNull()
  })

  it('SET_NRR_INPUT merges into existing nrrInputs', () => {
    const s1 = assessmentReducer(defaultState, {
      type: 'SET_NRR_INPUT',
      field: 'startingMRR',
      value: 1_000_000,
    })
    const s2 = assessmentReducer(s1, {
      type: 'SET_NRR_INPUT',
      field: 'expansion',
      value: 180_000,
    })
    expect(s2.nrrInputs?.startingMRR).toBe(1_000_000)
    expect(s2.nrrInputs?.expansion).toBe(180_000)
  })

  it('SET_NRR_MODE switches mode and clears component values, keeps startingMRR', () => {
    const withDollarData = assessmentReducer(defaultState, {
      type: 'SET_NRR_INPUT',
      field: 'startingMRR',
      value: 1_000_000,
    })
    const withExpansion = assessmentReducer(withDollarData, {
      type: 'SET_NRR_INPUT',
      field: 'expansion',
      value: 180_000,
    })
    const switched = assessmentReducer(withExpansion, {
      type: 'SET_NRR_MODE',
      mode: 'percentages',
    })
    expect(switched.nrrInputs?.mode).toBe('percentages')
    expect(switched.nrrInputs?.startingMRR).toBe(1_000_000) // preserved
    expect(switched.nrrInputs?.expansion).toBeNull()        // cleared
    expect(switched.nrrInputs?.contraction).toBeNull()      // cleared
    expect(switched.nrrInputs?.churn).toBeNull()            // cleared
  })

  it('SKIP_NRR_CALCULATOR sets flag and clears inputs', () => {
    const withInputs = assessmentReducer(defaultState, {
      type: 'SET_NRR_INPUT',
      field: 'startingMRR',
      value: 1_000_000,
    })
    const state = assessmentReducer(withInputs, { type: 'SKIP_NRR_CALCULATOR' })
    expect(state.nrrCalculatorSkipped).toBe(true)
    expect(state.nrrInputs).toBeNull()
  })

  it('RESET_NRR_CALCULATOR clears skip flag and inputs', () => {
    const skipped = assessmentReducer(defaultState, { type: 'SKIP_NRR_CALCULATOR' })
    const state = assessmentReducer(skipped, { type: 'RESET_NRR_CALCULATOR' })
    expect(state.nrrCalculatorSkipped).toBe(false)
    expect(state.nrrInputs).toBeNull()
  })

  it('SET_SELECTED_CAPABILITIES replaces array', () => {
    const caps: CapKey[] = ['measurement', 'retention']
    const state = assessmentReducer(defaultState, {
      type: 'SET_SELECTED_CAPABILITIES',
      capabilities: caps,
    })
    expect(state.selectedCapabilities).toEqual(caps)
  })

  it('SET_PICK_MEASUREMENT sets level for id', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_PICK_MEASUREMENT',
      id: 'M1',
      level: 3,
    })
    expect(state.picks.measurement['M1']).toBe(3)
  })

  it('SET_PICK_ACTION sets level for capKey/lever/dim', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_PICK_ACTION',
      capKey: 'retention',
      leverId: 'L1',
      dim: 'People',
      level: 4,
    })
    expect(state.picks.retention['L1']?.['People']).toBe(4)
  })

  it('COMPLETE_SECTION appends and deduplicates', () => {
    const s1 = assessmentReducer(defaultState, { type: 'COMPLETE_SECTION', section: 'measurement' })
    const s2 = assessmentReducer(s1, { type: 'COMPLETE_SECTION', section: 'measurement' })
    expect(s2.completedSections).toEqual(['measurement'])
    const s3 = assessmentReducer(s2, { type: 'COMPLETE_SECTION', section: 'retention' })
    expect(s3.completedSections).toHaveLength(2)
  })

  it('SET_DIAGNOSTIC_BLOCK_CHOICE initialises diagnosticAnswers and sets choice (1-5)', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_DIAGNOSTIC_BLOCK_CHOICE',
      block: 'q1_reporting',
      choice: 5,
    })
    expect(state.diagnosticAnswers?.q1_reporting.choice).toBe(5)
    expect(state.diagnosticAnswers?.q2_retention.choice).toBeNull()
  })

  it('SET_DIAGNOSTIC_BLOCK_TEXT sets freeText on a block', () => {
    const s1 = assessmentReducer(defaultState, {
      type: 'SET_DIAGNOSTIC_BLOCK_CHOICE',
      block: 'q2_retention',
      choice: 2,
    })
    const state = assessmentReducer(s1, {
      type: 'SET_DIAGNOSTIC_BLOCK_TEXT',
      block: 'q2_retention',
      text: 'We track renewal dates in a spreadsheet',
    })
    expect(state.diagnosticAnswers?.q2_retention.freeText).toBe('We track renewal dates in a spreadsheet')
  })

  it('SET_DIAGNOSTIC_PRIORITY_CHOICE sets q5 choice', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_DIAGNOSTIC_PRIORITY_CHOICE',
      choice: 'retention',
    })
    expect(state.diagnosticAnswers?.q5_priority.choice).toBe('retention')
  })

  it('SET_DIAGNOSTIC_ANYTHING_ELSE sets q6 freeText', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_DIAGNOSTIC_ANYTHING_ELSE',
      text: 'We recently lost a key account',
    })
    expect(state.diagnosticAnswers?.q6_anything_else.freeText).toBe('We recently lost a key account')
  })

  it('SET_PRE_SELECTED_CAPABILITIES sets array', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_PRE_SELECTED_CAPABILITIES',
      capabilities: ['retention', 'measurement'],
    })
    expect(state.preSelectedCapabilities).toEqual(['retention', 'measurement'])
  })

  it('RESET_ALL returns to exact default state', () => {
    const withData = assessmentReducer(defaultState, {
      type: 'SET_EMAIL',
      email: 'test@example.com',
      consent: true,
    })
    const state = assessmentReducer(withData, { type: 'RESET_ALL' })
    expect(state).toEqual(defaultState)
  })
})

describe('loadFromStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('returns defaultState when localStorage is empty', () => {
    const state = loadFromStorage()
    expect(state).toEqual(defaultState)
  })

  it('hydrates valid v6 state from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 6,
        email: 'test@example.com',
        consent: true,
        sessionId: 'sess-xyz',
      }),
    )
    const state = loadFromStorage()
    expect(state.email).toBe('test@example.com')
    expect(state.sessionId).toBe('sess-xyz')
    expect(state.schemaVersion).toBe(6)
  })

  it('resets on v5 state (old schema)', () => {
    localStorage.setItem(
      'loremex_assessment_state_v5',
      JSON.stringify({ schemaVersion: 5, email: 'old@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBeNull()
    expect(state.schemaVersion).toBe(6)
  })

  it('resets on version mismatch in v6 key', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 5, email: 'old@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBeNull()
    expect(state.schemaVersion).toBe(6)
  })

  it('resets on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{')
    const state = loadFromStorage()
    expect(state).toEqual(defaultState)
  })

  it('fills missing fields with defaults during hydration', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 6, email: 'partial@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBe('partial@example.com')
    expect(state.selectedCapabilities).toEqual([])
    expect(state.picks).toEqual(defaultState.picks)
  })
})

describe('computeDiagnosticScores', () => {
  function makeAnswers(q1: 1|2|3|4|5, q2: 1|2|3|4|5, q3: 1|2|3|4|5, q4: 1|2|3|4|5) {
    return {
      ...DEFAULT_DIAGNOSTIC_ANSWERS,
      q1_reporting: { choice: q1 as 1|2|3|4|5, freeText: null },
      q2_retention: { choice: q2 as 1|2|3|4|5, freeText: null },
      q3_expansion: { choice: q3 as 1|2|3|4|5, freeText: null },
      q4_pricing:   { choice: q4 as 1|2|3|4|5, freeText: null },
    }
  }

  it('returns null when any block choice is null', () => {
    expect(computeDiagnosticScores(DEFAULT_DIAGNOSTIC_ANSWERS)).toBeNull()
  })

  it('Q1=2 Q2=1 Q3=3 Q4=2 → weakestBlock=retention, maturityStage=Diagnostic, avg=2.0', () => {
    const result = computeDiagnosticScores(makeAnswers(2, 1, 3, 2))
    expect(result).not.toBeNull()
    expect(result!.weakestBlock).toBe('retention')
    expect(result!.blockScores.retention).toBe(1)
    expect(result!.maturityStage).toBe('Diagnostic')
    expect(result!.overallAvg).toBe(2.0)
  })

  it('Q1=5 Q2=5 Q3=5 Q4=5 → weakestBlock=reporting (tiebreaker), maturityStage=Intelligent', () => {
    const result = computeDiagnosticScores(makeAnswers(5, 5, 5, 5))
    expect(result!.weakestBlock).toBe('reporting')
    expect(result!.maturityStage).toBe('Intelligent')
    expect(result!.overallAvg).toBe(5.0)
  })

  it('Q1=3 Q2=3 Q3=3 Q4=3 → maturityStage=Operational, avg=3.0', () => {
    const result = computeDiagnosticScores(makeAnswers(3, 3, 3, 3))
    expect(result!.maturityStage).toBe('Operational')
    expect(result!.overallAvg).toBe(3.0)
  })

  it('Q1=4 Q2=4 Q3=5 Q4=5 → maturityStage=Intelligent, avg=4.5', () => {
    const result = computeDiagnosticScores(makeAnswers(4, 4, 5, 5))
    expect(result!.maturityStage).toBe('Intelligent')
    expect(result!.overallAvg).toBe(4.5)
  })

  it('Q1=1 Q2=2 Q3=3 Q4=4 → weakestBlock=reporting, blockScores.reporting=1, maturityStage=Diagnostic, avg=2.5', () => {
    const result = computeDiagnosticScores(makeAnswers(1, 2, 3, 4))
    expect(result!.weakestBlock).toBe('reporting')
    expect(result!.blockScores.reporting).toBe(1)
    expect(result!.maturityStage).toBe('Diagnostic')
    expect(result!.overallAvg).toBe(2.5)
  })
})
