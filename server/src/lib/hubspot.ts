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
  return !status || status >= 500 // retry network errors and 5xx; never 4xx
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!isRetryable(err)) throw err
      lastErr = err
      if (attempt < maxAttempts) {
        await sleep(1000 * Math.pow(2, attempt - 1)) // 1s → 2s → 4s
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
    assessment_started_at: Date.now().toString(), // Unix ms — HubSpot datetime format
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

// ─── Custom property bootstrap ─────────────────────────────────────────────

interface HubSpotPropertyDef {
  name: string
  label: string
  type: string
  fieldType: string
  groupName: string
  options?: Array<{ label: string; value: string; hidden: boolean }>
}

const REQUIRED_PROPERTIES: HubSpotPropertyDef[] = [
  {
    name: 'assessment_consent',
    label: 'Assessment Consent',
    type: 'bool',
    fieldType: 'booleancheckbox',
    groupName: 'contactinformation',
    // HubSpot requires explicit true/false options for booleancheckbox
    options: [
      { label: 'Yes', value: 'true', hidden: false },
      { label: 'No', value: 'false', hidden: false },
    ],
  },
  {
    name: 'first_touch_source',
    label: 'First Touch Source',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
  },
  {
    name: 'assessment_started_at',
    label: 'Assessment Started At',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'contactinformation',
  },
]

// ─── Scorecard custom properties ─────────────────────────────────────────────

const SCORECARD_PROPERTIES: HubSpotPropertyDef[] = [
  { name: 'assessment_completed_at', label: 'Assessment Completed At', type: 'datetime', fieldType: 'date', groupName: 'contactinformation' },
  { name: 'assessment_overall_intelligence', label: 'Assessment Overall Intelligence', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_nrr_pct', label: 'Assessment NRR %', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_grr_pct', label: 'Assessment GRR %', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_distance_to_l5', label: 'Assessment Distance to L5', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_reporting_maturity', label: 'Assessment Reporting Maturity', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_retention_overall', label: 'Assessment Retention Overall', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_expansion_overall', label: 'Assessment Expansion Overall', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_pricing_overall', label: 'Assessment Pricing Overall', type: 'number', fieldType: 'number', groupName: 'contactinformation' },
  { name: 'assessment_weakest_capability', label: 'Assessment Weakest Capability', type: 'string', fieldType: 'text', groupName: 'contactinformation' },
  { name: 'assessment_capabilities_selected', label: 'Assessment Capabilities Selected', type: 'string', fieldType: 'text', groupName: 'contactinformation' },
  { name: 'assessment_scope', label: 'Assessment Scope', type: 'string', fieldType: 'text', groupName: 'contactinformation' },
]

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

export async function ensureScorecardProperties(): Promise<void> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) return
  await ensurePropertiesFromList(SCORECARD_PROPERTIES)
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

// ─── Shared property bootstrap helper ────────────────────────────────────────

async function ensurePropertiesFromList(props: HubSpotPropertyDef[]): Promise<void> {
  for (const prop of props) {
    try {
      await axios.get(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts/${prop.name}`, {
        headers: getHeaders(),
      })
    } catch (err) {
      const status = (err as AxiosError).response?.status
      if (status === 404) {
        try {
          await axios.post(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts`, prop, {
            headers: getHeaders(),
          })
          console.log(`[hubspot] Created custom property: ${prop.name}`)
        } catch (createErr) {
          const createStatus = (createErr as AxiosError).response?.status
          if (createStatus === 403) {
            console.error(`[hubspot] 403 creating property "${prop.name}" — check CRM schema write scope`)
          } else {
            console.error(`[hubspot] Failed to create property "${prop.name}":`, createErr)
          }
        }
      } else {
        console.error(`[hubspot] Error checking property "${prop.name}" (status ${status}):`, err)
      }
    }
  }
}

export async function ensureCustomProperties(): Promise<void> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.warn('[hubspot] HUBSPOT_ACCESS_TOKEN not set — skipping property check')
    return
  }
  await ensurePropertiesFromList(REQUIRED_PROPERTIES)
}
