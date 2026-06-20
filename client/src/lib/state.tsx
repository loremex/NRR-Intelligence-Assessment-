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

const STORAGE_KEY = 'loremex_assessment_state_v8'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { NRRMode }
export type NRRField = 'startingMRR' | 'expansion' | 'contraction' | 'churn'
export type CapKey = 'reporting' | 'retention' | 'expansion' | 'pricing'

export type DiagnosticBlockKey = 'q1_reporting' | 'q2_retention' | 'q3_expansion' | 'q4_pricing'
export type DiagnosticPriority = 'reporting' | 'retention' | 'expansion' | 'pricing'

export interface NRRInputs {
  mode: NRRMode
  startingMRR: number | null
  expansion: number | null
  contraction: number | null
  churn: number | null
}

export interface DiagnosticBlockAnswer {
  choice: 1 | 2 | 3 | 4 | 5 | null
  freeText: string | null
}

export interface DiagnosticAnswers {
  q1_reporting: DiagnosticBlockAnswer
  q2_retention: DiagnosticBlockAnswer
  q3_expansion: DiagnosticBlockAnswer
  q4_pricing: DiagnosticBlockAnswer
  q5_priority: { choice: DiagnosticPriority | null; freeText: string | null }
  q6_anything_else: { freeText: string | null }
}

export const DEFAULT_DIAGNOSTIC_ANSWERS: DiagnosticAnswers = {
  q1_reporting: { choice: null, freeText: null },
  q2_retention: { choice: null, freeText: null },
  q3_expansion: { choice: null, freeText: null },
  q4_pricing: { choice: null, freeText: null },
  q5_priority: { choice: null, freeText: null },
  q6_anything_else: { freeText: null },
}

export interface AssessmentState {
  schemaVersion: 8
  sessionId: string | null
  contactId: string | null
  email: string | null
  consent: boolean
  nrrInputs: NRRInputs | null
  nrrCalculatorSkipped: boolean
  diagnosticAnswers: DiagnosticAnswers | null
  preSelectedCapabilities: CapKey[]
  selectedCapabilities: CapKey[]
  picks: {
    reporting: Record<string, number | null>
    retention: Record<string, number | null>
    expansion: Record<string, number | null>
    pricing: Record<string, number | null>
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
  | { type: 'SET_DIAGNOSTIC_BLOCK_CHOICE'; block: DiagnosticBlockKey; choice: 1 | 2 | 3 | 4 | 5 | null }
  | { type: 'SET_DIAGNOSTIC_BLOCK_TEXT'; block: DiagnosticBlockKey; text: string }
  | { type: 'SET_DIAGNOSTIC_PRIORITY_CHOICE'; choice: DiagnosticPriority | null }
  | { type: 'SET_DIAGNOSTIC_ANYTHING_ELSE'; text: string }
  | { type: 'SET_PRE_SELECTED_CAPABILITIES'; capabilities: CapKey[] }
  | { type: 'SET_SELECTED_CAPABILITIES'; capabilities: CapKey[] }
  | { type: 'SET_PICK_SCENARIO'; capKey: CapKey; qId: string; scenarioIndex: number | null }
  | { type: 'COMPLETE_SECTION'; section: string }
  | { type: 'SET_COMPLETED_AT'; completedAt: string }
  | { type: 'RESET_ALL' }

// ─── Default state ────────────────────────────────────────────────────────────

export const defaultState: AssessmentState = {
  schemaVersion: 8,
  sessionId: null,
  contactId: null,
  email: null,
  consent: false,
  nrrInputs: null,
  nrrCalculatorSkipped: false,
  diagnosticAnswers: null,
  preSelectedCapabilities: [],
  selectedCapabilities: [],
  picks: {
    reporting: {},
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

    case 'SET_DIAGNOSTIC_BLOCK_CHOICE': {
      const current = state.diagnosticAnswers ?? DEFAULT_DIAGNOSTIC_ANSWERS
      return {
        ...state,
        diagnosticAnswers: {
          ...current,
          [action.block]: { ...current[action.block], choice: action.choice },
        },
      }
    }

    case 'SET_DIAGNOSTIC_BLOCK_TEXT': {
      const current = state.diagnosticAnswers ?? DEFAULT_DIAGNOSTIC_ANSWERS
      return {
        ...state,
        diagnosticAnswers: {
          ...current,
          [action.block]: { ...current[action.block], freeText: action.text || null },
        },
      }
    }

    case 'SET_DIAGNOSTIC_PRIORITY_CHOICE': {
      const current = state.diagnosticAnswers ?? DEFAULT_DIAGNOSTIC_ANSWERS
      return {
        ...state,
        diagnosticAnswers: {
          ...current,
          q5_priority: { ...current.q5_priority, choice: action.choice },
        },
      }
    }

    case 'SET_DIAGNOSTIC_ANYTHING_ELSE': {
      const current = state.diagnosticAnswers ?? DEFAULT_DIAGNOSTIC_ANSWERS
      return {
        ...state,
        diagnosticAnswers: {
          ...current,
          q6_anything_else: { freeText: action.text || null },
        },
      }
    }

    case 'SET_PRE_SELECTED_CAPABILITIES':
      return { ...state, preSelectedCapabilities: action.capabilities }

    case 'SET_SELECTED_CAPABILITIES':
      return { ...state, selectedCapabilities: action.capabilities }

    case 'SET_PICK_SCENARIO':
      return {
        ...state,
        picks: {
          ...state.picks,
          [action.capKey]: {
            ...state.picks[action.capKey],
            [action.qId]: action.scenarioIndex,
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
    if (parsed.schemaVersion !== 8) return defaultState
    return { ...defaultState, ...parsed, schemaVersion: 8 }
  } catch {
    return defaultState
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type AssessmentContextValue = [AssessmentState, Dispatch<AssessmentAction>]

const AssessmentContext = createContext<AssessmentContextValue | null>(null)

export function AssessmentStateProvider({ children }: { children: ReactNode }) {
  const [state, _dispatch] = useReducer(assessmentReducer, undefined, loadFromStorage)

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
