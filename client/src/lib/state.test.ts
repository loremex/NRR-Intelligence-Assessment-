import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { assessmentReducer, defaultState, loadFromStorage, type CapKey } from './state'

const STORAGE_KEY = 'loremex_assessment_state_v8'

describe('assessmentReducer', () => {
  it('default state has correct shape', () => {
    expect(defaultState.schemaVersion).toBe(8)
    expect(defaultState.email).toBeNull()
    expect(defaultState.sessionId).toBeNull()
    expect(defaultState.selectedCapabilities).toEqual([])
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
    const caps: CapKey[] = ['reporting', 'retention']
    const state = assessmentReducer(defaultState, {
      type: 'SET_SELECTED_CAPABILITIES',
      capabilities: caps,
    })
    expect(state.selectedCapabilities).toEqual(caps)
  })

  it('SET_PICK_SCENARIO sets scenarioIndex for capKey/qId', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_PICK_SCENARIO',
      capKey: 'retention',
      qId: 'q1',
      scenarioIndex: 3,
    })
    expect(state.picks.retention['q1']).toBe(3)
  })

  it('SET_PICK_SCENARIO sets scenarioIndex for reporting/q2', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_PICK_SCENARIO',
      capKey: 'reporting',
      qId: 'q2',
      scenarioIndex: 1,
    })
    expect(state.picks.reporting['q2']).toBe(1)
  })

  it('COMPLETE_SECTION appends and deduplicates', () => {
    const s1 = assessmentReducer(defaultState, { type: 'COMPLETE_SECTION', section: 'reporting' })
    const s2 = assessmentReducer(s1, { type: 'COMPLETE_SECTION', section: 'reporting' })
    expect(s2.completedSections).toEqual(['reporting'])
    const s3 = assessmentReducer(s2, { type: 'COMPLETE_SECTION', section: 'retention' })
    expect(s3.completedSections).toHaveLength(2)
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

  it('hydrates valid v8 state from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 8,
        email: 'test@example.com',
        consent: true,
        sessionId: 'sess-xyz',
      }),
    )
    const state = loadFromStorage()
    expect(state.email).toBe('test@example.com')
    expect(state.sessionId).toBe('sess-xyz')
    expect(state.schemaVersion).toBe(8)
  })

  it('resets on v7 state (old schema)', () => {
    localStorage.setItem(
      'loremex_assessment_state_v7',
      JSON.stringify({ schemaVersion: 7, email: 'old@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBeNull()
    expect(state.schemaVersion).toBe(8)
  })

  it('resets on version mismatch in v8 key', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 7, email: 'old@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBeNull()
    expect(state.schemaVersion).toBe(8)
  })

  it('resets on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{')
    const state = loadFromStorage()
    expect(state).toEqual(defaultState)
  })

  it('fills missing fields with defaults during hydration', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 8, email: 'partial@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBe('partial@example.com')
    expect(state.selectedCapabilities).toEqual([])
    expect(state.picks).toEqual(defaultState.picks)
  })
})

