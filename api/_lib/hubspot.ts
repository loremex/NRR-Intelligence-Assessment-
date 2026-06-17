import axios, { type AxiosError } from 'axios'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

function getHeaders() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN is not configured')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryable(err: unknown): boolean {
  const status = (err as AxiosError).response?.status
  return !status || status >= 500
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!isRetryable(err)) throw err
      lastErr = err
      if (attempt < maxAttempts) {
        await sleep(1000 * attempt)
      }
    }
  }
  throw lastErr
}

async function searchContactByEmail(email: string): Promise<string | null> {
  return withRetry(async () => {
    const res = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: email }] },
        ],
        properties: ['email', 'hs_object_id'],
        limit: 1,
      },
      { headers: getHeaders() },
    )
    const results = (res.data as { results: Array<{ id: string }> }).results
    return results.length > 0 ? results[0].id : null
  })
}

export interface CreateOrUpdateContactParams {
  email: string
  consent: boolean
  firstTouchSource: string
}

export interface CreateOrUpdateContactResult {
  contactId: string
  isNew: boolean
}

export async function createOrUpdateContact(
  params: CreateOrUpdateContactParams,
): Promise<CreateOrUpdateContactResult> {
  const { email, consent, firstTouchSource } = params
  const properties = {
    email,
    assessment_consent: consent ? 'true' : 'false',
    first_touch_source: firstTouchSource,
    assessment_started_at: Date.now().toString(),
  }

  const existingId = await searchContactByEmail(email)

  if (existingId) {
    await withRetry(() =>
      axios.patch(
        `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${existingId}`,
        { properties },
        { headers: getHeaders() },
      ),
    )
    return { contactId: existingId, isNew: false }
  }

  const res = await withRetry(() =>
    axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
      { properties },
      { headers: getHeaders() },
    ),
  )
  const created = res.data as { id: string }
  return { contactId: created.id, isNew: true }
}

export interface ScorecardData {
  completedAt: string
  overallIntelligence: number | null
  nrr: number | null
  grr: number | null
  distanceToL5: number | null
  reportingMaturity: number | null
  retentionOverall: number | null
  expansionOverall: number | null
  pricingOverall: number | null
  weakestCapability: string | null
  capabilitiesSelected: string[]
  scope: string
}

export async function updateContactWithScorecard(
  contactId: string,
  data: ScorecardData,
): Promise<void> {
  const properties: Record<string, string> = {
    assessment_completed_at: new Date(data.completedAt).getTime().toString(),
    assessment_capabilities_selected: data.capabilitiesSelected.join(', '),
    assessment_scope: data.scope,
  }

  if (data.overallIntelligence !== null) properties.assessment_overall_intelligence = data.overallIntelligence.toString()
  if (data.nrr !== null) properties.assessment_nrr_pct = (data.nrr * 100).toFixed(2)
  if (data.grr !== null) properties.assessment_grr_pct = (data.grr * 100).toFixed(2)
  if (data.distanceToL5 !== null) properties.assessment_distance_to_l5 = data.distanceToL5.toString()
  if (data.reportingMaturity !== null) properties.assessment_reporting_maturity = data.reportingMaturity.toString()
  if (data.retentionOverall !== null) properties.assessment_retention_overall = data.retentionOverall.toString()
  if (data.expansionOverall !== null) properties.assessment_expansion_overall = data.expansionOverall.toString()
  if (data.pricingOverall !== null) properties.assessment_pricing_overall = data.pricingOverall.toString()
  if (data.weakestCapability) properties.assessment_weakest_capability = data.weakestCapability

  await withRetry(() =>
    axios.patch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`,
      { properties },
      { headers: getHeaders() },
    ),
  )
}

export interface DiagnosticAnswerData {
  q1_score: 1 | 2 | 3 | 4; q1_text: string | null
  q2_score: 1 | 2 | 3 | 4; q2_text: string | null
  q3_score: 1 | 2 | 3 | 4; q3_text: string | null
  q4_score: 1 | 2 | 3 | 4; q4_text: string | null
  q5_priority: string; q6_text: string | null
}

export interface DiagnosticData {
  completedAt: string
  maturityStage: string
  weakestBlock: string
  strongestBlock: string
  blockScores: Record<string, 1 | 2 | 3 | 4>
  q5Priority: string
  answers: DiagnosticAnswerData
}

export async function updateContactWithDiagnostic(
  contactId: string,
  data: DiagnosticData,
): Promise<void> {
  const properties: Record<string, string> = {
    nrr_diagnostic_completed_at: new Date(data.completedAt).getTime().toString(),
    nrr_diagnostic_maturity_stage: data.maturityStage,
    nrr_diagnostic_weakest_block: data.weakestBlock,
    nrr_diagnostic_strongest_block: data.strongestBlock,
    nrr_diagnostic_q1_score: data.answers.q1_score.toString(),
    nrr_diagnostic_q2_score: data.answers.q2_score.toString(),
    nrr_diagnostic_q3_score: data.answers.q3_score.toString(),
    nrr_diagnostic_q4_score: data.answers.q4_score.toString(),
    nrr_diagnostic_q5_priority: data.q5Priority,
  }

  if (data.answers.q1_text) properties.nrr_diagnostic_q1_text = data.answers.q1_text
  if (data.answers.q2_text) properties.nrr_diagnostic_q2_text = data.answers.q2_text
  if (data.answers.q3_text) properties.nrr_diagnostic_q3_text = data.answers.q3_text
  if (data.answers.q4_text) properties.nrr_diagnostic_q4_text = data.answers.q4_text
  if (data.answers.q6_text) properties.nrr_diagnostic_q6_text = data.answers.q6_text

  await withRetry(() =>
    axios.patch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`,
      { properties },
      { headers: getHeaders() },
    ),
  )
}
