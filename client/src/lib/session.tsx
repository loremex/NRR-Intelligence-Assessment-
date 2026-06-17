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

export interface SessionState {
  email: string | null
  consent: boolean
  sessionId: string | null
  contactId: string | null
}

type SessionAction =
  | { type: 'SET_SESSION'; email: string; consent: boolean; sessionId: string; contactId: string | null }
  | { type: 'CLEAR_SESSION' }

const defaultState: SessionState = {
  email: null,
  consent: false,
  sessionId: null,
  contactId: null,
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
      }
    }
  } catch {
    // ignore malformed storage
  }
  return defaultState
}

function sessionReducer(_state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_SESSION':
      return { email: action.email, consent: action.consent, sessionId: action.sessionId, contactId: action.contactId }
    case 'CLEAR_SESSION':
      return defaultState
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
