import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { createOrUpdateContact } from '../lib/hubspot'

const router = Router()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

router.post('/', async (req, res) => {
  const body = req.body as { email?: unknown; consent?: unknown }

  if (typeof body.email !== 'string' || !isValidEmail(body.email)) {
    res.status(400).json({ error: 'A valid email address is required' })
    return
  }
  if (body.consent !== true) {
    res.status(400).json({ error: 'Consent is required' })
    return
  }

  const email = body.email.trim().toLowerCase()
  const sessionId = randomUUID()

  try {
    const { contactId } = await createOrUpdateContact({
      email,
      consent: true,
      firstTouchSource: 'assessment',
    })
    res.json({ sessionId, contactId })
  } catch (err) {
    console.error('[start-session] HubSpot error:', err)
    res.json({ sessionId, contactId: null, hubspotFailed: true })
  }
})

export default router
