import type { VercelRequest, VercelResponse } from '@vercel/node'

// NOTE: The disk-backed retry queue from server/ is not available in Vercel serverless.
// This endpoint exists as a stub for parity. In v1.1, replace with Upstash QStash status.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const debugKey = process.env.HUBSPOT_DEBUG_KEY
  if (debugKey && req.headers['x-debug-key'] !== debugKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  return res.json({
    count: 0,
    oldest: null,
    items: [],
    note: 'Serverless deployment: in-memory retry queue not available. Check Vercel logs for failure details.',
  })
}
