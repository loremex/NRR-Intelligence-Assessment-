import { vi, describe, it, expect, beforeEach } from 'vitest'

// Single top-level mock — sendFn is shared across all tests.
// We reconfigure it per-test via mockResolvedValueOnce / mockRejectedValueOnce.
const sendFn = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendFn },
  })),
}))

const { sendScorecardEmail } = await import('./email.js')

const PARAMS = {
  to: 'test@example.com',
  pdfBase64: 'dGVzdA==',
  scorecardSummary: {
    overallIntelligence: 3.5,
    weakestCapability: 'Retention Management',
    recommendationSentences: ['Your weakest action capability is Retention Management.'],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = 'test-key'
  process.env.RESEND_FROM_EMAIL = 'onboarding@resend.dev'
  process.env.RESEND_REPLY_TO = 'hello@loremex.ai'
  process.env.VITE_BASE_URL = 'http://localhost:5173'
})

describe('sendScorecardEmail', () => {
  it('returns success and messageId on a good send', async () => {
    sendFn.mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null })
    const result = await sendScorecardEmail(PARAMS)
    expect(result.success).toBe(true)
    expect(result.messageId).toBe('msg-1')
  })

  it('includes PDF attachment in the send call', async () => {
    sendFn.mockResolvedValueOnce({ data: { id: 'msg-2' }, error: null })
    await sendScorecardEmail(PARAMS)
    const callArg = sendFn.mock.calls[0]?.[0] as { attachments: Array<{ content: string }> }
    expect(callArg?.attachments?.[0]?.content).toBe('dGVzdA==')
  })

  it('sends from the configured from address with correct subject', async () => {
    sendFn.mockResolvedValueOnce({ data: { id: 'msg-3' }, error: null })
    await sendScorecardEmail(PARAMS)
    const callArg = sendFn.mock.calls[0]?.[0] as { from: string; replyTo: string; subject: string }
    expect(callArg?.from).toBe('onboarding@resend.dev')
    expect(callArg?.replyTo).toBe('hello@loremex.ai')
    expect(callArg?.subject).toBe('Your NRR Intelligence Scorecard')
  })

  it('does NOT retry on 4xx errors — calls send exactly once', async () => {
    sendFn.mockRejectedValueOnce(Object.assign(new Error('Bad Request'), { statusCode: 400 }))
    await expect(sendScorecardEmail(PARAMS)).rejects.toThrow('Bad Request')
    expect(sendFn).toHaveBeenCalledTimes(1)
  })

  it('retries on 5xx errors, succeeds on third attempt', async () => {
    sendFn
      .mockRejectedValueOnce(Object.assign(new Error('Internal Server Error'), { statusCode: 500 }))
      .mockRejectedValueOnce(Object.assign(new Error('Internal Server Error'), { statusCode: 500 }))
      .mockResolvedValueOnce({ data: { id: 'msg-retry' }, error: null })

    vi.useFakeTimers()
    const promise = sendScorecardEmail(PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise
    vi.useRealTimers()

    expect(result.success).toBe(true)
    expect(sendFn).toHaveBeenCalledTimes(3)
  })

  it('retries on 429 rate limit', async () => {
    sendFn
      .mockRejectedValueOnce(Object.assign(new Error('Too Many Requests'), { statusCode: 429 }))
      .mockResolvedValueOnce({ data: { id: 'msg-429' }, error: null })

    vi.useFakeTimers()
    const promise = sendScorecardEmail(PARAMS)
    await vi.runAllTimersAsync()
    const result = await promise
    vi.useRealTimers()

    expect(result.success).toBe(true)
    expect(sendFn).toHaveBeenCalledTimes(2)
  })

  it('throws a Resend error response as an error', async () => {
    sendFn.mockResolvedValueOnce({
      data: null,
      error: { statusCode: 422, message: 'Validation error' },
    })
    await expect(sendScorecardEmail(PARAMS)).rejects.toThrow('Validation error')
  })
})
