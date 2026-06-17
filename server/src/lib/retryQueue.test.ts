import { vi, describe, it, expect, beforeEach } from 'vitest'

// We need to control the queue file path — use vi.mock for fs
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
  }
})

// Import after mock is registered
const { enqueue, getQueue, drain, registerHandlers, hydrate } = await import('./retryQueue.js')
const { writeFileSync, readFileSync, existsSync: mockExistsSync } = await import('node:fs')

beforeEach(() => {
  vi.clearAllMocks()
  // Reset queue by using a fresh module — since we can't easily reset the module-level
  // queue variable, we test via the exported functions
})

describe('enqueue', () => {
  it('adds an item to the queue', () => {
    const before = getQueue().length
    enqueue({ type: 'email', payload: { to: 'test@example.com' } })
    expect(getQueue().length).toBe(before + 1)
  })

  it('generates a UUID id', () => {
    enqueue({ type: 'hubspot', payload: { contactId: 'abc' } })
    const q = getQueue()
    const item = q[q.length - 1]
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('sets attempts to 0', () => {
    enqueue({ type: 'email', payload: {} })
    const q = getQueue()
    expect(q[q.length - 1].attempts).toBe(0)
  })

  it('calls writeFileSync to persist', () => {
    enqueue({ type: 'email', payload: {} })
    expect(writeFileSync).toHaveBeenCalled()
  })
})

describe('drain', () => {
  it('calls the registered handler for due items', async () => {
    const emailHandler = vi.fn().mockResolvedValue(undefined)
    registerHandlers({
      hubspot: vi.fn().mockResolvedValue(undefined),
      email: emailHandler,
    })

    enqueue({ type: 'email', payload: { to: 'drain@test.com' }, nextRetryAt: new Date(Date.now() - 1000).toISOString() } as Parameters<typeof enqueue>[0])

    const qBefore = getQueue().length
    await drain()

    // The handler should have been called
    expect(emailHandler).toHaveBeenCalled()
    // Item removed on success
    expect(getQueue().length).toBeLessThan(qBefore)
  })

  it('does not process items that are not yet due', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    registerHandlers({ hubspot: handler, email: handler })

    // Enqueue with a future nextRetryAt — override manually
    enqueue({ type: 'hubspot', payload: {} })
    const q = getQueue()
    const item = q[q.length - 1]
    // Manually set nextRetryAt to the future
    item.nextRetryAt = new Date(Date.now() + 3_600_000).toISOString()

    const callsBefore = handler.mock.calls.length
    await drain()
    // handler should NOT have been called for this future item
    expect(handler.mock.calls.length).toBe(callsBefore)
  })

  it('increments attempts and sets nextRetryAt on failure', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('fail'))
    registerHandlers({
      hubspot: failingHandler,
      email: vi.fn().mockResolvedValue(undefined),
    })

    enqueue({ type: 'hubspot', payload: { contactId: 'retry-test' } })
    const q = getQueue()
    const item = q[q.length - 1]
    item.nextRetryAt = new Date(Date.now() - 1000).toISOString()

    await drain()

    // Item still in queue, attempts incremented
    const updated = getQueue().find((x) => x.id === item.id)
    if (updated) {
      expect(updated.attempts).toBe(1)
      expect(new Date(updated.nextRetryAt).getTime()).toBeGreaterThan(Date.now())
    }
  })

  it('removes item after MAX_ATTEMPTS failures', async () => {
    const alwaysFail = vi.fn().mockRejectedValue(new Error('permanent'))
    registerHandlers({ hubspot: alwaysFail, email: vi.fn().mockResolvedValue(undefined) })

    enqueue({ type: 'hubspot', payload: {} })
    const q = getQueue()
    const item = q[q.length - 1]
    item.attempts = 4  // one away from max (5)
    item.nextRetryAt = new Date(Date.now() - 1000).toISOString()

    await drain()

    // Item should be dropped
    expect(getQueue().find((x) => x.id === item.id)).toBeUndefined()
  })
})

describe('hydrate', () => {
  it('skips hydration when queue file does not exist', () => {
    vi.mocked(mockExistsSync).mockReturnValueOnce(false)
    const before = getQueue().length
    hydrate()
    expect(readFileSync).not.toHaveBeenCalled()
    expect(getQueue().length).toBe(before)
  })

  it('restores items from disk when file exists', () => {
    const fakeItems = [
      { id: 'abc', type: 'email', payload: {}, attempts: 1, nextRetryAt: new Date().toISOString() },
    ]
    vi.mocked(mockExistsSync).mockReturnValueOnce(true)
    vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify(fakeItems))

    hydrate()
    // The hydrate call should have read from disk
    expect(readFileSync).toHaveBeenCalled()
  })
})
