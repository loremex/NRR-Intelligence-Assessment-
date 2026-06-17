import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import startSessionRouter from './routes/start-session.js'
import { ensureCustomProperties } from './lib/hubspot.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

if (!process.env.HUBSPOT_ACCESS_TOKEN) {
  console.warn('[server] HUBSPOT_ACCESS_TOKEN not set — HubSpot integration will fail')
}

app.use(
  cors({
    origin: process.env.VITE_BASE_URL || 'http://localhost:5173',
    credentials: true,
  }),
)

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/start-session', startSessionRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  ensureCustomProperties().catch((err: unknown) => {
    console.error('[server] ensureCustomProperties failed:', err)
  })
})
