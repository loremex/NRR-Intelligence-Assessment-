import type { VercelRequest, VercelResponse } from '@vercel/node'
import { updateContactWithScorecard, type ScorecardData } from './_lib/hubspot'
import { sendScorecardEmail } from './_lib/email'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScorecardPayload {
  overallIntelligence: number | null
  nrr: number | null
  grr: number | null
  reportingMaturity: number | null
  distanceToL5: number | null
  weakestCapability: string | null
  capabilitiesSelected: string[]
  scope: string
  capabilityOveralls: Record<string, number | null>
  recommendationSentences: string[]
}

interface CompleteSessionBody {
  sessionId: string | null
  contactId: string | null
  email: string
  completedAt: string
  scorecard: ScorecardPayload
  pdfBase64: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidBody(body: unknown): body is CompleteSessionBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.email === 'string' &&
    EMAIL_REGEX.test(b.email) &&
    typeof b.completedAt === 'string' &&
    typeof b.pdfBase64 === 'string' &&
    b.pdfBase64.length > 0 &&
    typeof b.scorecard === 'object' &&
    b.scorecard !== null
  )
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isValidBody(req.body)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { contactId, email, completedAt, scorecard, pdfBase64 } = req.body

  const scorecardData: ScorecardData = {
    completedAt,
    overallIntelligence: scorecard.overallIntelligence,
    nrr: scorecard.nrr,
    grr: scorecard.grr,
    distanceToL5: scorecard.distanceToL5,
    reportingMaturity: scorecard.reportingMaturity,
    retentionOverall: scorecard.capabilityOveralls?.retention ?? null,
    expansionOverall: scorecard.capabilityOveralls?.expansion ?? null,
    pricingOverall: scorecard.capabilityOveralls?.pricing ?? null,
    weakestCapability: scorecard.weakestCapability,
    capabilitiesSelected: scorecard.capabilitiesSelected ?? [],
    scope: scorecard.scope ?? 'partial',
  }

  const scorecardSummary = {
    overallIntelligence: scorecard.overallIntelligence,
    weakestCapability: scorecard.weakestCapability,
    recommendationSentences: scorecard.recommendationSentences ?? [],
  }

  // Run HubSpot + email in parallel. On failure: log and continue — user is not blocked.
  // NOTE: Serverless functions are stateless; the disk-backed retry queue from server/
  // is not available here. Failures are logged to Vercel logs for manual follow-up.
  // Revisit with Upstash QStash in v1.1 if volume warrants.
  const [hubspotResult, emailResult] = await Promise.allSettled([
    contactId
      ? updateContactWithScorecard(contactId, scorecardData)
      : Promise.reject(new Error('No contactId — cannot update HubSpot')),
    sendScorecardEmail({ to: email, pdfBase64, scorecardSummary }),
  ])

  const hubspotUpdated = hubspotResult.status === 'fulfilled'
  const emailSent =
    emailResult.status === 'fulfilled' && emailResult.value.success

  if (hubspotResult.status === 'rejected') {
    console.error('[complete-session] HubSpot update failed:', hubspotResult.reason, {
      contactId,
      email,
      completedAt,
    })
  }

  if (emailResult.status === 'rejected' || !emailSent) {
    const reason = emailResult.status === 'rejected' ? emailResult.reason : 'send returned success=false'
    console.error('[complete-session] Email send failed:', reason, { email, completedAt })
  }

  return res.json({ hubspotUpdated, emailSent })
}
