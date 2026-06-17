import { describe, it, expect } from 'vitest'
import { isValidEmail } from './validation'

describe('isValidEmail', () => {
  it('accepts a standard valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })

  it('accepts email with subdomain', () => {
    expect(isValidEmail('laura@mail.loremex.ai')).toBe(true)
  })

  it('accepts email with plus addressing', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('rejects string with no @ symbol', () => {
    expect(isValidEmail('notanemail')).toBe(false)
  })

  it('rejects email with no domain after @', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('rejects email with space before @', () => {
    expect(isValidEmail('user @example.com')).toBe(false)
  })

  it('rejects string with only @', () => {
    expect(isValidEmail('@')).toBe(false)
  })
})
