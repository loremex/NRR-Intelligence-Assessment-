import { Router } from 'express'
import { updateContactWithScorecard, type ScorecardData } from '../lib/hubspot.js'
import { sendScorecardEmail } from '../lib/email.js'
import { enqueue } from '../lib/retryQueue.js'

const router = Router()

// ─── Body validation ─────────────────────────────────────────────────────────

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

interface EVEmailScenario {
  label: string
  ppDelta: number
  ppCapped: boolean
  evUplift: number
}

interface EVEmailData {
  scenarios: EVEmailScenario[]
  topOfMarketMessage: string | null
  startingMRRFormatted: string
}

interface CompleteSessionBody {
  sessionId: string | null
  contactId: string | null
  email: string
  completedAt: string
  scorecard: ScorecardPayload
  pdfBase64: string
  evUplift?: EVEmailData | null
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

// ─── Route handler ───────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { contactId, email, completedAt, scorecard, pdfBase64, evUplift } = req.body

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

  // Run HubSpot + email in parallel; neither failure blocks the other
  const [hubspotResult, emailResult] = await Promise.allSettled([
    contactId
      ? updateContactWithScorecard(contactId, scorecardData)
      : Promise.reject(new Error('No contactId — cannot update HubSpot')),
    sendScorecardEmail({ to: email, pdfBase64, scorecardSummary, evUplift: evUplift ?? null }),
  ])

  const hubspotUpdated = hubspotResult.status === 'fulfilled'
  const emailSent =
    emailResult.status === 'fulfilled' && emailResult.value.success

  if (hubspotResult.status === 'rejected') {
    console.error('[complete-session] HubSpot update failed:', hubspotResult.reason)
    if (contactId) {
      enqueue({ type: 'hubspot', payload: { contactId, scorecardData } })
    }
  }

  if (emailResult.status === 'rejected' || !emailSent) {
    const reason = emailResult.status === 'rejected' ? emailResult.reason : 'send returned success=false'
    console.error('[complete-session] Email send failed:', reason)
    enqueue({ type: 'email', payload: { to: email, pdfBase64, scorecardSummary, evUplift: evUplift ?? null } })
  }

  res.json({ hubspotUpdated, emailSent })
})

export default router
