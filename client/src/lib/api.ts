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

export interface CompleteSessionPayload {
  sessionId: string | null
  contactId: string | null
  email: string
  completedAt: string
  scorecard: ScorecardPayload
  pdfBase64: string
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
