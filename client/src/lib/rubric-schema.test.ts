import { describe, it, expect } from 'vitest'
import { validateRubric } from './rubric-schema'
import rubricData from '../content/rubric.json'

describe('validateRubric', () => {
  it('validates the shipped rubric.json cleanly', () => {
    expect(() => validateRubric(rubricData)).not.toThrow()
    const result = validateRubric(rubricData)
    expect(result.capabilities).toHaveLength(4)
    expect(result.nrrBands).toHaveLength(5)
    expect(result.intelligenceLadder).toHaveLength(5)
  })

  it('rejects a rubric with a missing lever weight', () => {
    const mangled = JSON.parse(JSON.stringify(rubricData)) as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (mangled.capabilities as any[])[0].levers[0].weight
    expect(() => validateRubric(mangled)).toThrow()
  })

  it('rejects a rubric with an invalid capability type enum', () => {
    const mangled = JSON.parse(JSON.stringify(rubricData)) as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mangled.capabilities as any[])[0].type = 'invalid_type'
    expect(() => validateRubric(mangled)).toThrow()
  })

  it('rejects a rubric with an empty capabilities array', () => {
    const mangled = JSON.parse(JSON.stringify(rubricData)) as Record<string, unknown>
    mangled.capabilities = []
    expect(() => validateRubric(mangled)).toThrow()
  })

  it('rejects a rubric with a missing dimension key on an action lever', () => {
    const mangled = JSON.parse(JSON.stringify(rubricData)) as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCap = (mangled.capabilities as any[]).find((c) => c.type === 'action')
    if (actionCap?.levers?.[0]?.dimensions) {
      delete actionCap.levers[0].dimensions.People
    }
    expect(() => validateRubric(mangled)).toThrow()
  })

  it('rejects entirely non-object input', () => {
    expect(() => validateRubric(null)).toThrow()
    expect(() => validateRubric('not an object')).toThrow()
    expect(() => validateRubric(42)).toThrow()
  })
})
