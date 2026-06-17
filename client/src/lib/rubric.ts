import rubricJson from '../content/rubric.json'
import { validateRubric, type RubricData, type Capability, type NRRBand, type LevelColor } from './rubric-schema'

// ─── Validate once at module load ─────────────────────────────────────────────

const fallbackRubric: RubricData = {
  schemaVersion: '0',
  generatedAt: '',
  source: '',
  intelligenceLadder: [],
  dimensions: [],
  themes: {},
  levelColors: {},
  nrrBands: [],
  capabilities: [],
} as unknown as RubricData

let _rubric: RubricData

try {
  _rubric = validateRubric(rubricJson)
} catch (err) {
  if (import.meta.env.DEV) {
    // Fail loud in development so content errors are caught immediately.
    throw new Error(
      `[rubric] rubric.json failed schema validation — fix the content before continuing.\n${String(err)}`,
    )
  }
  console.error('[rubric] Validation error (prod fallback active):', err)
  _rubric = fallbackRubric
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

export function getRubric(): RubricData {
  return _rubric
}

export function getCapabilities(): Capability[] {
  return _rubric.capabilities
}

export function getCapability(key: string): Capability | undefined {
  return _rubric.capabilities.find((c) => c.key === key)
}

export function getNRRBands(): NRRBand[] {
  return _rubric.nrrBands
}

export function getLevelColor(level: number): LevelColor {
  const entry = _rubric.levelColors[String(level)]
  if (!entry) return { fill: '#E2E8F0', label: `L${level}` }
  return entry
}

export type { RubricData, Capability, NRRBand, LevelColor }
