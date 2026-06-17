import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env.local' })

const app = express()
const PORT = process.env.PORT || 3001

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
