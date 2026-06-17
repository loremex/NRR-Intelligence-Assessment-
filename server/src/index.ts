import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import startSessionRouter from './routes/start-session.js'
import completeSessionRouter from './routes/complete-session.js'
import sendDiagnosticRouter from './routes/send-diagnostic.js'
import { ensureCustomProperties, ensureScorecardProperties, updateContactWithScorecard } from './lib/hubspot.js'
import { sendScorecardEmail } from './lib/email.js'
import { hydrate, drain, persist, registerHandlers, getQueue, type RetryItem } from './lib/retryQueue.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

if (!process.env.HUBSPOT_ACCESS_TOKEN) {
  console.warn('[server] HUBSPOT_ACCESS_TOKEN not set — HubSpot integration will fail')
}
if (!process.env.RESEND_API_KEY) {
  console.warn('[server] RESEND_API_KEY not set — email sending will fail')
}

app.use(
  cors({
    origin: process.env.VITE_BASE_URL || 'http://localhost:5173',
    credentials: true,
  }),
)

app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/start-session', startSessionRouter)
app.use('/api/complete-session', completeSessionRouter)
app.use('/api/send-diagnostic', sendDiagnosticRouter)

// Admin debug endpoint — gate with HUBSPOT_DEBUG_KEY header
// WARNING: add proper auth before exposing externally
app.get('/api/retry-queue-status', (req, res) => {
  const debugKey = process.env.HUBSPOT_DEBUG_KEY
  if (debugKey && req.headers['x-debug-key'] !== debugKey) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const items = getQueue()
  const oldest = items.length > 0
    ? items.reduce((a, b) => (a.nextRetryAt < b.nextRetryAt ? a : b)).nextRetryAt
    : null
  res.json({ count: items.length, oldest, items })
})

// ─── Server boot ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)

  // Register retry handlers
  registerHandlers({
    hubspot: async (item: RetryItem) => {
      const { contactId, scorecardData } = item.payload as Parameters<typeof updateContactWithScorecard>[1] extends infer T ? { contactId: string; scorecardData: T } : never
      await updateContactWithScorecard(contactId, scorecardData)
    },
    email: async (item: RetryItem) => {
      const payload = item.payload as Parameters<typeof sendScorecardEmail>[0]
      await sendScorecardEmail(payload)
    },
  })

  // Hydrate queue from disk on boot
  hydrate()

  // Start background drain worker
  const drainInterval = setInterval(() => {
    drain().catch((err: unknown) => console.error('[retryQueue] drain error:', err))
  }, 60_000)

  // Graceful shutdown
  const shutdown = () => {
    clearInterval(drainInterval)
    persist()
    console.log('[server] Shutdown — retry queue persisted')
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  // Bootstrap HubSpot properties
  Promise.all([
    ensureCustomProperties(),
    ensureScorecardProperties(),
  ]).catch((err: unknown) => {
    console.error('[server] ensureCustomProperties failed:', err)
  })
})
