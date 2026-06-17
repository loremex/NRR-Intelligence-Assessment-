import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { createOrUpdateContact } from './_lib/hubspot'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { email?: unknown; consent?: unknown }

  if (typeof body.email !== 'string' || !isValidEmail(body.email)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }
  if (body.consent !== true) {
    return res.status(400).json({ error: 'Consent is required' })
  }

  const email = body.email.trim().toLowerCase()
  const sessionId = randomUUID()

  try {
    const { contactId } = await createOrUpdateContact({
      email,
      consent: true,
      firstTouchSource: 'assessment',
    })
    return res.json({ sessionId, contactId })
  } catch (err) {
    console.error('[start-session] HubSpot error:', err)
    return res.json({ sessionId, contactId: null, hubspotFailed: true })
  }
}
