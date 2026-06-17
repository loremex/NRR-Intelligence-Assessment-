// Context files export both a provider component and a hook — disable this rule for the file.
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { NRRMode } from './nrr'

const STORAGE_KEY = 'loremex_assessment_state_v3'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { NRRMode }
export type NRRField = 'startingMRR' | 'expansion' | 'contraction' | 'churn'
export type ActionCapKey = 'retention' | 'expansion' | 'pricing'
export type CapKey = 'measurement' | ActionCapKey

export interface NRRInputs {
  mode: NRRMode
  startingMRR: number | null
  expansion: number | null
  contraction: number | null
  churn: number | null
}

export interface AssessmentState {
  schemaVersion: 3
  sessionId: string | null
  contactId: string | null
  email: string | null
  consent: boolean
  nrrInputs: NRRInputs | null
  nrrCalculatorSkipped: boolean
  selectedCapabilities: CapKey[]
  picks: {
    measurement: Record<string, number | null>
    retention: Record<string, Record<string, number | null>>
    expansion: Record<string, Record<string, number | null>>
    pricing: Record<string, Record<string, number | null>>
  }
  completedSections: string[]
  completedAt: string | null
}

export type AssessmentAction =
  | { type: 'SET_SESSION'; sessionId: string; contactId: string | null }
  | { type: 'SET_EMAIL'; email: string; consent: boolean }
  | { type: 'SET_NRR_INPUT'; field: NRRField; value: number | null }
  | { type: 'SET_NRR_MODE'; mode: NRRMode }
  | { type: 'SKIP_NRR_CALCULATOR' }
  | { type: 'RESET_NRR_CALCULATOR' }
  | { type: 'SET_SELECTED_CAPABILITIES'; capabilities: CapKey[] }
  | { type: 'SET_PICK_MEASUREMENT'; id: string; level: number | null }
  | { type: 'SET_PICK_ACTION'; capKey: ActionCapKey; leverId: string; dim: string; level: number | null }
  | { type: 'COMPLETE_SECTION'; section: string }
  | { type: 'SET_COMPLETED_AT'; completedAt: string }
  | { type: 'RESET_ALL' }

// ─── Default state ────────────────────────────────────────────────────────────

export const defaultState: AssessmentState = {
  schemaVersion: 3,
  sessionId: null,
  contactId: null,
  email: null,
  consent: false,
  nrrInputs: null,
  nrrCalculatorSkipped: false,
  selectedCapabilities: [],
  picks: {
    measurement: {},
    retention: {},
    expansion: {},
    pricing: {},
  },
  completedSections: [],
  completedAt: null,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, sessionId: action.sessionId, contactId: action.contactId }

    case 'SET_EMAIL':
      return { ...state, email: action.email, consent: action.consent }

    case 'SET_NRR_INPUT':
      return {
        ...state,
        nrrInputs: {
          mode: 'dollars',
          startingMRR: null,
          expansion: null,
          contraction: null,
          churn: null,
          ...(state.nrrInputs ?? {}),
          [action.field]: action.value,
        },
      }

    case 'SET_NRR_MODE':
      return {
        ...state,
        nrrInputs: {
          mode: action.mode,
          startingMRR: state.nrrInputs?.startingMRR ?? null,
          expansion: null,
          contraction: null,
          churn: null,
        },
      }

    case 'SKIP_NRR_CALCULATOR':
      return { ...state, nrrCalculatorSkipped: true, nrrInputs: null }

    case 'RESET_NRR_CALCULATOR':
      return { ...state, nrrCalculatorSkipped: false, nrrInputs: null }

    case 'SET_SELECTED_CAPABILITIES':
      return { ...state, selectedCapabilities: action.capabilities }

    case 'SET_PICK_MEASUREMENT':
      return {
        ...state,
        picks: {
          ...state.picks,
          measurement: { ...state.picks.measurement, [action.id]: action.level },
        },
      }

    case 'SET_PICK_ACTION':
      return {
        ...state,
        picks: {
          ...state.picks,
          [action.capKey]: {
            ...state.picks[action.capKey],
            [action.leverId]: {
              ...state.picks[action.capKey][action.leverId],
              [action.dim]: action.level,
            },
          },
        },
      }

    case 'COMPLETE_SECTION':
      if (state.completedSections.includes(action.section)) return state
      return { ...state, completedSections: [...state.completedSections, action.section] }

    case 'SET_COMPLETED_AT':
      if (state.completedAt !== null) return state
      return { ...state, completedAt: action.completedAt }

    case 'RESET_ALL':
      return defaultState
  }
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function loadFromStorage(): AssessmentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as Partial<AssessmentState>
    // Reject any stored state with a mismatched schema version
    if (parsed.schemaVersion !== 3) return defaultState
    return { ...defaultState, ...parsed, schemaVersion: 3 }
  } catch {
    return defaultState
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type AssessmentContextValue = [AssessmentState, Dispatch<AssessmentAction>]

const AssessmentContext = createContext<AssessmentContextValue | null>(null)

export function AssessmentStateProvider({ children }: { children: ReactNode }) {
  const [state, _dispatch] = useReducer(assessmentReducer, undefined, loadFromStorage)

  // Wrap dispatch so RESET_ALL removes the storage key instead of writing defaultState.
  const dispatch = useCallback(
    (action: AssessmentAction) => {
      if (action.type === 'RESET_ALL') {
        localStorage.removeItem(STORAGE_KEY)
      }
      _dispatch(action)
    },
    [_dispatch],
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return (
    <AssessmentContext.Provider value={[state, dispatch]}>
      {children}
    </AssessmentContext.Provider>
  )
}

export function useAssessmentState(): AssessmentContextValue {
  const ctx = useContext(AssessmentContext)
  if (!ctx) throw new Error('useAssessmentState must be used within an AssessmentStateProvider')
  return ctx
}
