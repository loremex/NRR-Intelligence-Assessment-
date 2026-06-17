import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { assessmentReducer, defaultState, loadFromStorage, type CapKey } from './state'

const STORAGE_KEY = 'loremex_assessment_state_v2'

describe('assessmentReducer', () => {
  it('default state has correct shape', () => {
    expect(defaultState.schemaVersion).toBe(2)
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
    expect(state.sessionId).toBeNull() // other fields untouched
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
    expect(state.email).toBe('x@x.com') // preserved
  })

  it('SET_NRR_INPUT initialises nrrInputs and sets field', () => {
    const state = assessmentReducer(defaultState, {
      type: 'SET_NRR_INPUT',
      field: 'expansionPct',
      value: 18,
    })
    expect(state.nrrInputs?.expansionPct).toBe(18)
    expect(state.nrrInputs?.contractionPct).toBeNull()
  })

  it('SET_NRR_INPUT merges into existing nrrInputs', () => {
    const s1 = assessmentReducer(defaultState, {
      type: 'SET_NRR_INPUT',
      field: 'expansionPct',
      value: 18,
    })
    const s2 = assessmentReducer(s1, {
      type: 'SET_NRR_INPUT',
      field: 'churnPct',
      value: 6,
    })
    expect(s2.nrrInputs?.expansionPct).toBe(18)
    expect(s2.nrrInputs?.churnPct).toBe(6)
  })

  it('SKIP_NRR_CALCULATOR sets flag and clears inputs', () => {
    const withInputs = assessmentReducer(defaultState, {
      type: 'SET_NRR_INPUT',
      field: 'expansionPct',
      value: 18,
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

  it('hydrates valid v2 state from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        email: 'test@example.com',
        consent: true,
        sessionId: 'sess-xyz',
      }),
    )
    const state = loadFromStorage()
    expect(state.email).toBe('test@example.com')
    expect(state.sessionId).toBe('sess-xyz')
    expect(state.schemaVersion).toBe(2)
  })

  it('resets on schemaVersion mismatch (old v1 data)', () => {
    localStorage.setItem(
      'loremex_assessment_state_v1',
      JSON.stringify({ schemaVersion: 1, email: 'old@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBeNull()
    expect(state.schemaVersion).toBe(2)
  })

  it('resets on schemaVersion mismatch (wrong version number)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 0, email: 'old@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBeNull()
    expect(state.schemaVersion).toBe(2)
  })

  it('resets on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{')
    const state = loadFromStorage()
    expect(state).toEqual(defaultState)
  })

  it('fills missing fields with defaults during hydration', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 2, email: 'partial@example.com' }),
    )
    const state = loadFromStorage()
    expect(state.email).toBe('partial@example.com')
    expect(state.selectedCapabilities).toEqual([]) // defaulted
    expect(state.picks).toEqual(defaultState.picks) // defaulted
  })
})
