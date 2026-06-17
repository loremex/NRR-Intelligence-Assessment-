import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { track } from './analytics'

describe('track (analytics stub)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a page_view event with correct shape', () => {
    track({ name: 'page_view', props: { section_name: 'landing' } })
    expect(console.log).toHaveBeenCalledWith('[analytics]', 'page_view', {
      section_name: 'landing',
    })
  })

  it('logs an email_submitted event (valid: true)', () => {
    track({ name: 'email_submitted', props: { valid: true } })
    expect(console.log).toHaveBeenCalledWith('[analytics]', 'email_submitted', { valid: true })
  })

  it('logs an email_submitted event (valid: false)', () => {
    track({ name: 'email_submitted', props: { valid: false } })
    expect(console.log).toHaveBeenCalledWith('[analytics]', 'email_submitted', { valid: false })
  })

  it('logs a session_started event', () => {
    track({ name: 'session_started', props: { session_id: 'abc-123' } })
    expect(console.log).toHaveBeenCalledWith('[analytics]', 'session_started', {
      session_id: 'abc-123',
    })
  })

  it('never throws even if console.log itself throws', () => {
    vi.spyOn(console, 'log').mockImplementationOnce(() => {
      throw new Error('console is broken')
    })
    expect(() => track({ name: 'page_view', props: { section_name: 'test' } })).not.toThrow()
  })
})
