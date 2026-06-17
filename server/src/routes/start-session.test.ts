import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

// Hoist mock before importing the route so the module graph sees the stub
vi.mock('../lib/hubspot', () => ({
  createOrUpdateContact: vi.fn(),
  ensureCustomProperties: vi.fn(),
}))

// Import AFTER mock is registered
const { default: startSessionRouter } = await import('./start-session')
const { createOrUpdateContact } = await import('../lib/hubspot')

// Minimal test Express app
const app = express()
app.use(express.json())
app.use('/api/start-session', startSessionRouter)

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

describe('POST /api/start-session', () => {
  it('returns 400 for an invalid email', async () => {
    const res = await fetch(`${baseUrl}/api/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail', consent: true }),
    })
    expect(res.status).toBe(400)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBeTruthy()
  })

  it('returns 400 when consent is false', async () => {
    const res = await fetch(`${baseUrl}/api/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', consent: false }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when consent is missing', async () => {
    const res = await fetch(`${baseUrl}/api/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 200 with sessionId and contactId on a valid request', async () => {
    vi.mocked(createOrUpdateContact).mockResolvedValueOnce({
      contactId: 'hs-test-123',
      isNew: true,
    })

    const res = await fetch(`${baseUrl}/api/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', consent: true }),
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as { sessionId: string; contactId: string }
    expect(data.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(data.contactId).toBe('hs-test-123')
  })

  it('returns 200 with hubspotFailed=true when HubSpot throws', async () => {
    vi.mocked(createOrUpdateContact).mockRejectedValueOnce(new Error('HubSpot timeout'))

    const res = await fetch(`${baseUrl}/api/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', consent: true }),
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      sessionId: string
      contactId: null
      hubspotFailed: boolean
    }
    expect(data.sessionId).toBeTruthy()
    expect(data.contactId).toBeNull()
    expect(data.hubspotFailed).toBe(true)
  })

  it('normalises email to lowercase before calling HubSpot', async () => {
    vi.mocked(createOrUpdateContact).mockResolvedValueOnce({
      contactId: 'hs-456',
      isNew: false,
    })

    await fetch(`${baseUrl}/api/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'User@Example.COM', consent: true }),
    })

    expect(vi.mocked(createOrUpdateContact)).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com' }),
    )
  })
})
