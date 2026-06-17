import { z } from 'zod'

// ─── Leaf schemas ─────────────────────────────────────────────────────────────

const AnswerSchema = z.object({
  level: z.number().int().min(1).max(5),
  text: z.string().min(1),
})

const IntelligenceLadderSchema = z.object({
  level: z.number().int().min(1).max(5),
  name: z.string().min(1),
  subtitle: z.string().min(1),
  description: z.string().min(1),
})

const DimensionSchema = z.object({
  key: z.enum(['People', 'Process', 'Technology', 'Data']),
  label: z.string().min(1),
  description: z.string().min(1),
})

const ThemeSchema = z.object({
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  type: z.enum(['action', 'measurement']),
})

const LevelColorSchema = z.object({
  fill: z.string().min(1),
  label: z.string().min(1),
})

const NRRBandSchema = z.object({
  threshold: z.number(),
  label: z.string().min(1),
  color: z.string().min(1),
  description: z.string().min(1),
})

// ─── Lever schemas ────────────────────────────────────────────────────────────

const MeasurementLeverSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  theme: z.string().min(1),
  weight: z.number().positive(),
  description: z.string().min(1),
  question: z.string().min(1),
  answers: z.array(AnswerSchema).length(5),
})

const DimensionAnswersSchema = z.object({
  People: z.array(AnswerSchema).length(5),
  Process: z.array(AnswerSchema).length(5),
  Technology: z.array(AnswerSchema).length(5),
  Data: z.array(AnswerSchema).length(5),
})

const ActionLeverSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  theme: z.string().min(1),
  weight: z.number().positive(),
  description: z.string().min(1),
  question: z.string().min(1),
  dimensions: DimensionAnswersSchema,
})

// ─── Capability schemas ───────────────────────────────────────────────────────

const MeasurementCapabilitySchema = z.object({
  key: z.literal('measurement'),
  name: z.string().min(1),
  type: z.literal('measurement'),
  tagline: z.string().min(1),
  themes: z.array(z.string()).min(1),
  estimatedMinutes: z.number().positive(),
  recommendedDefault: z.boolean(),
  levers: z.array(MeasurementLeverSchema).min(1),
})

const ActionCapabilitySchema = z.object({
  key: z.enum(['retention', 'expansion', 'pricing']),
  name: z.string().min(1),
  type: z.literal('action'),
  tagline: z.string().min(1),
  themes: z.array(z.string()).min(1),
  estimatedMinutes: z.number().positive(),
  recommendedDefault: z.boolean(),
  levers: z.array(ActionLeverSchema).min(1),
})

const CapabilitySchema = z.discriminatedUnion('type', [
  MeasurementCapabilitySchema,
  ActionCapabilitySchema,
])

// ─── Root schema ──────────────────────────────────────────────────────────────

const RubricSchema = z.object({
  schemaVersion: z.string(),
  generatedAt: z.string(),
  source: z.string(),
  intelligenceLadder: z.array(IntelligenceLadderSchema).length(5),
  dimensions: z.array(DimensionSchema).min(1),
  themes: z.record(z.string(), ThemeSchema),
  levelColors: z.record(z.string(), LevelColorSchema),
  nrrBands: z.array(NRRBandSchema).min(1),
  capabilities: z.array(CapabilitySchema).min(1),
})

// ─── Exports ──────────────────────────────────────────────────────────────────

export type RubricData = z.infer<typeof RubricSchema>
export type Capability = z.infer<typeof CapabilitySchema>
export type MeasurementCapability = z.infer<typeof MeasurementCapabilitySchema>
export type ActionCapability = z.infer<typeof ActionCapabilitySchema>
export type MeasurementLever = z.infer<typeof MeasurementLeverSchema>
export type ActionLever = z.infer<typeof ActionLeverSchema>
export type NRRBand = z.infer<typeof NRRBandSchema>
export type IntelligenceLadderEntry = z.infer<typeof IntelligenceLadderSchema>
export type LevelColor = z.infer<typeof LevelColorSchema>

export function validateRubric(data: unknown): RubricData {
  return RubricSchema.parse(data)
}
