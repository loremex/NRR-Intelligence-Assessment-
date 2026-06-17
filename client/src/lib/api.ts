// In dev: VITE_API_BASE_URL is set (or Vite proxy handles /api → localhost:3001).
// In production (Vercel): same-origin api/ functions, so no base needed.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export interface StartSessionResult {
  sessionId: string
  contactId: string | null
  hubspotFailed?: boolean
}

export async function startSession(params: {
  email: string
  consent: boolean
}): Promise<StartSessionResult> {
  const response = await fetch(`${API_BASE}/api/start-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `Server error ${response.status}`)
  }

  return response.json() as Promise<StartSessionResult>
}

// ─── Scorecard data sent on assessment completion ─────────────────────────────

export interface ScorecardPayload {
  overallIntelligence: number | null
  nrr: number | null
  grr: number | null
  reportingMaturity: number | null
  distanceToL5: number | null
  weakestCapability: string | null
  capabilitiesSelected: string[]
  scope: 'full' | 'action-only' | 'partial' | 'measurement-only'
  capabilityOveralls: Record<string, number | null>
  recommendationSentences: string[]
}

export interface EVEmailScenario {
  label: string
  ppDelta: number
  ppCapped: boolean
  evUplift: number
}

export interface EVEmailData {
  scenarios: EVEmailScenario[]
  topOfMarketMessage: string | null
  startingMRRFormatted: string
}

export interface CompleteSessionPayload {
  sessionId: string | null
  contactId: string | null
  email: string
  completedAt: string
  scorecard: ScorecardPayload
  pdfBase64: string
  evUplift: EVEmailData | null
}

export interface CompleteSessionResult {
  hubspotUpdated: boolean
  emailSent: boolean
}

export async function completeSession(
  payload: CompleteSessionPayload,
): Promise<CompleteSessionResult> {
  const response = await fetch(`${API_BASE}/api/complete-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `Server error ${response.status}`)
  }

  return response.json() as Promise<CompleteSessionResult>
}

// ─── Diagnostic submission ────────────────────────────────────────────────────

export interface DiagnosticAnswerPayload {
  q2: string
  q2_label: string
  q2_text: string
  q3: string
  q3_label: string
  q3_text: string
  q4: string
  q4_label: string
  q4_text: string
  q5: string
  q5_label: string
  q5_text: string
  q6: string
  q6_label: string
  q6_text: string
  q7_text: string
}

export interface DiagnosticPayload {
  sessionId: string | null
  contactId: string | null
  email: string
  completedAt: string
  verdictTitle: string
  recommendations: [string, string, string]
  answers: DiagnosticAnswerPayload
}

export interface DiagnosticResult {
  hubspotUpdated: boolean
  emailSent: boolean
}

export async function sendDiagnostic(payload: DiagnosticPayload): Promise<DiagnosticResult> {
  const response = await fetch(`${API_BASE}/api/send-diagnostic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `Server error ${response.status}`)
  }

  return response.json() as Promise<DiagnosticResult>
}
