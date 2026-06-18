import { Router } from 'express'
import { updateContactWithDiagnostic } from '../lib/hubspot.js'
import { sendDiagnosticEmail } from '../lib/email.js'

const router = Router()

interface DiagnosticAnswerPayload {
  q1_score: 1 | 2 | 3 | 4 | 5; q1_text: string | null
  q2_score: 1 | 2 | 3 | 4 | 5; q2_text: string | null
  q3_score: 1 | 2 | 3 | 4 | 5; q3_text: string | null
  q4_score: 1 | 2 | 3 | 4 | 5; q4_text: string | null
  q5_priority: string; q6_text: string | null
}

interface EVEmailScenario { label: string; ppDelta: number; ppCapped: boolean; evUplift: number }
interface EVEmailData {
  scenarios: EVEmailScenario[]
  topOfMarketMessage: string | null
  startingMRRFormatted: string
}

interface SendDiagnosticBody {
  sessionId: string | null
  contactId: string | null
  email: string
  completedAt: string
  maturityStage: string
  weakestBlock: string
  strongestBlock: string
  blockScores: Record<string, 1 | 2 | 3 | 4 | 5>
  q5Priority: string
  verdictDescription: string
  recommendations: [string, string, string]
  answers: DiagnosticAnswerPayload
  evUplift: EVEmailData | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidBody(body: unknown): body is SendDiagnosticBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.email === 'string' &&
    EMAIL_REGEX.test(b.email) &&
    typeof b.completedAt === 'string' &&
    typeof b.maturityStage === 'string' &&
    typeof b.weakestBlock === 'string' &&
    typeof b.verdictDescription === 'string' &&
    Array.isArray(b.recommendations) &&
    (b.recommendations as unknown[]).length === 3 &&
    typeof b.answers === 'object' &&
    b.answers !== null
  )
}

router.post('/', async (req, res) => {
  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const {
    contactId, email, completedAt,
    maturityStage, weakestBlock, strongestBlock, blockScores,
    q5Priority, verdictDescription, recommendations, answers, evUplift,
  } = req.body

  const [hubspotResult, emailResult] = await Promise.allSettled([
    contactId
      ? updateContactWithDiagnostic(contactId, {
          completedAt, maturityStage, weakestBlock, strongestBlock,
          blockScores, q5Priority, answers,
        })
      : Promise.reject(new Error('No contactId — cannot update HubSpot')),
    sendDiagnosticEmail({
      to: email, maturityStage, weakestBlock, strongestBlock, blockScores,
      verdictDescription, recommendations, answers, evUplift: evUplift ?? null,
    }),
  ])

  const hubspotUpdated = hubspotResult.status === 'fulfilled'
  const emailSent =
    emailResult.status === 'fulfilled' && emailResult.value.success

  if (hubspotResult.status === 'rejected') {
    console.error('[send-diagnostic] HubSpot update failed:', hubspotResult.reason)
  }

  if (emailResult.status === 'rejected' || !emailSent) {
    const reason = emailResult.status === 'rejected' ? emailResult.reason : 'send returned success=false'
    console.error('[send-diagnostic] Email send failed:', reason)
  }

  res.json({ hubspotUpdated, emailSent })
})

export default router
