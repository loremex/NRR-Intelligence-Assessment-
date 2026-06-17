import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

vi.mock('../lib/hubspot', () => ({
  updateContactWithScorecard: vi.fn(),
  ensureScorecardProperties: vi.fn(),
  ensureCustomProperties: vi.fn(),
}))

vi.mock('../lib/email', () => ({
  sendScorecardEmail: vi.fn(),
}))

vi.mock('../lib/retryQueue', () => ({
  enqueue: vi.fn(),
  drain: vi.fn(),
  hydrate: vi.fn(),
  persist: vi.fn(),
  registerHandlers: vi.fn(),
  getQueue: vi.fn().mockReturnValue([]),
}))

const { default: completeSessionRouter } = await import('./complete-session')
const { updateContactWithScorecard } = await import('../lib/hubspot')
const { sendScorecardEmail } = await import('../lib/email')
const { enqueue } = await import('../lib/retryQueue')

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use('/api/complete-session', completeSessionRouter)

let server: Server
let baseUrl: string

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port
        baseUrl = `http://localhost:${port}`
        resolve()
      })
    }),
)

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve())
    }),
)

const VALID_BODY = {
  sessionId: 'session-1',
  contactId: 'hs-123',
  email: 'test@example.com',
  completedAt: new Date().toISOString(),
  scorecard: {
    overallIntelligence: 3.2,
    nrr: 1.1,
    grr: 0.9,
    reportingMaturity: 2.5,
    distanceToL5: 1.8,
    weakestCapability: 'Expansion Revenue',
    capabilitiesSelected: ['retention', 'expansion'],
    scope: 'action-only',
    capabilityOveralls: { retention: 3.5, expansion: 2.9 },
    recommendationSentences: ['Your weakest capability is Expansion Revenue.'],
  },
  pdfBase64: 'dGVzdA==',
}

describe('POST /api/complete-session', () => {
  it('returns 400 for missing body fields', async () => {
    const res = await fetch(`${baseUrl}/api/complete-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing pdfBase64', async () => {
    const res = await fetch(`${baseUrl}/api/complete-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, pdfBase64: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 200 with hubspotUpdated and emailSent on success', async () => {
    vi.mocked(updateContactWithScorecard).mockResolvedValueOnce(undefined)
    vi.mocked(sendScorecardEmail).mockResolvedValueOnce({ messageId: 'msg-ok', success: true })

    const res = await fetch(`${baseUrl}/api/complete-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { hubspotUpdated: boolean; emailSent: boolean }
    expect(data.hubspotUpdated).toBe(true)
    expect(data.emailSent).toBe(true)
  })

  it('still returns 200 when HubSpot fails, enqueues retry', async () => {
    vi.mocked(updateContactWithScorecard).mockRejectedValueOnce(new Error('HS timeout'))
    vi.mocked(sendScorecardEmail).mockResolvedValueOnce({ messageId: 'msg-ok', success: true })

    const res = await fetch(`${baseUrl}/api/complete-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { hubspotUpdated: boolean; emailSent: boolean }
    expect(data.hubspotUpdated).toBe(false)
    expect(data.emailSent).toBe(true)
    expect(vi.mocked(enqueue)).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'hubspot' }),
    )
  })

  it('still returns 200 when email fails, enqueues retry', async () => {
    vi.mocked(updateContactWithScorecard).mockResolvedValueOnce(undefined)
    vi.mocked(sendScorecardEmail).mockRejectedValueOnce(new Error('Resend down'))

    const res = await fetch(`${baseUrl}/api/complete-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { hubspotUpdated: boolean; emailSent: boolean }
    expect(data.hubspotUpdated).toBe(true)
    expect(data.emailSent).toBe(false)
    expect(vi.mocked(enqueue)).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'email' }),
    )
  })

  it('does not call updateContactWithScorecard when contactId is null', async () => {
    vi.clearAllMocks()
    vi.mocked(sendScorecardEmail).mockResolvedValueOnce({ messageId: 'msg', success: true })

    const res = await fetch(`${baseUrl}/api/complete-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, contactId: null }),
    })
    expect(res.status).toBe(200)
    expect(vi.mocked(updateContactWithScorecard)).not.toHaveBeenCalled()
  })
})
