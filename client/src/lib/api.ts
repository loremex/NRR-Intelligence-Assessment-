const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001'

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
