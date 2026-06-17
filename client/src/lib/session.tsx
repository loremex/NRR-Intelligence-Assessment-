// Context files export both a provider component and a hook — disable this rule for the file.
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react'

const STORAGE_KEY = 'loremex_assessment_session_v1'

export type NRRField = 'startingMRR' | 'expansionMRR' | 'contractionMRR' | 'churnMRR'

export interface NRRInputs {
  startingMRR: number | null
  expansionMRR: number | null
  contractionMRR: number | null
  churnMRR: number | null
}

export interface SessionState {
  email: string | null
  consent: boolean
  sessionId: string | null
  contactId: string | null
  nrrInputs: NRRInputs | null
  nrrCalculatorSkipped: boolean
}

type SessionAction =
  | { type: 'SET_SESSION'; email: string; consent: boolean; sessionId: string; contactId: string | null }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_NRR_INPUT'; field: NRRField; value: number | null }
  | { type: 'SKIP_NRR_CALCULATOR' }
  | { type: 'RESET_NRR_CALCULATOR' }

const defaultState: SessionState = {
  email: null,
  consent: false,
  sessionId: null,
  contactId: null,
  nrrInputs: null,
  nrrCalculatorSkipped: false,
}

function loadFromStorage(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SessionState>
      return {
        email: parsed.email ?? null,
        consent: parsed.consent ?? false,
        sessionId: parsed.sessionId ?? null,
        contactId: parsed.contactId ?? null,
        nrrInputs: parsed.nrrInputs ?? null,
        nrrCalculatorSkipped: parsed.nrrCalculatorSkipped ?? false,
      }
    }
  } catch {
    // ignore malformed storage
  }
  return defaultState
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        email: action.email,
        consent: action.consent,
        sessionId: action.sessionId,
        contactId: action.contactId,
      }
    case 'CLEAR_SESSION':
      return defaultState
    case 'SET_NRR_INPUT':
      return {
        ...state,
        nrrInputs: {
          startingMRR: null,
          expansionMRR: null,
          contractionMRR: null,
          churnMRR: null,
          ...state.nrrInputs,
          [action.field]: action.value,
        },
      }
    case 'SKIP_NRR_CALCULATOR':
      return { ...state, nrrCalculatorSkipped: true, nrrInputs: null }
    case 'RESET_NRR_CALCULATOR':
      return { ...state, nrrCalculatorSkipped: false, nrrInputs: null }
  }
}

interface SessionContextValue {
  state: SessionState
  dispatch: Dispatch<SessionAction>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, undefined, loadFromStorage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return <SessionContext.Provider value={{ state, dispatch }}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
