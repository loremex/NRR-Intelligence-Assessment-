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
}

const REQUIRED_PROPERTIES: HubSpotPropertyDef[] = [
  {
    name: 'assessment_consent',
    label: 'Assessment Consent',
    type: 'bool',
    fieldType: 'booleancheckbox',
    groupName: 'contactinformation',
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

export async function ensureCustomProperties(): Promise<void> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.warn('[hubspot] HUBSPOT_ACCESS_TOKEN not set — skipping property check')
    return
  }

  for (const prop of REQUIRED_PROPERTIES) {
    try {
      await axios.get(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts/${prop.name}`, {
        headers: getHeaders(),
      })
      // Property already exists — nothing to do
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
            console.error(
              `[hubspot] 403 creating property "${prop.name}" — check CRM schema write scope on your access token`,
            )
          } else {
            console.error(`[hubspot] Failed to create property "${prop.name}":`, createErr)
          }
          // Server continues — contact creation will surface the real error
        }
      } else {
        console.error(`[hubspot] Error checking property "${prop.name}" (status ${status}):`, err)
      }
    }
  }
}
