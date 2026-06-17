import { Router } from 'express'
import { updateContactWithDiagnostic } from '../lib/hubspot.js'
import { sendDiagnosticEmail } from '../lib/email.js'

const router = Router()

interface DiagnosticAnswerPayload {
  q2: string; q2_label: string; q2_text: string
  q3: string; q3_label: string; q3_text: string
  q4: string; q4_label: string; q4_text: string
  q5: string; q5_label: string; q5_text: string
  q6: string; q6_label: string; q6_text: string
  q7_text: string
}

interface SendDiagnosticBody {
  sessionId: string | null
  contactId: string | null
  email: string
  completedAt: string
  verdictTitle: string
  recommendations: [string, string, string]
  answers: DiagnosticAnswerPayload
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidBody(body: unknown): body is SendDiagnosticBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.email === 'string' &&
    EMAIL_REGEX.test(b.email) &&
    typeof b.completedAt === 'string' &&
    typeof b.verdictTitle === 'string' &&
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

  const { contactId, email, completedAt, verdictTitle, recommendations, answers } = req.body

  const [hubspotResult, emailResult] = await Promise.allSettled([
    contactId
      ? updateContactWithDiagnostic(contactId, { completedAt, verdictTitle, answers })
      : Promise.reject(new Error('No contactId — cannot update HubSpot')),
    sendDiagnosticEmail({ to: email, verdictTitle, recommendations, answers }),
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
