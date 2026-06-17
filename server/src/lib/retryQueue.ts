import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const QUEUE_FILE = resolve(import.meta.dirname, '../../.retry-queue.json')
const MAX_ATTEMPTS = 5
const BASE_DELAY_SECONDS = 60

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetryItem {
  id: string
  type: 'hubspot' | 'email'
  payload: unknown
  attempts: number
  nextRetryAt: string
  lastError?: string
}

// ─── In-memory queue ──────────────────────────────────────────────────────────

let queue: RetryItem[] = []

// ─── Disk I/O ─────────────────────────────────────────────────────────────────

export function persist(): void {
  try {
    writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8')
  } catch (err) {
    console.error('[retryQueue] Failed to persist queue:', err)
  }
}

export function hydrate(): void {
  if (!existsSync(QUEUE_FILE)) return
  try {
    const raw = readFileSync(QUEUE_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      queue = parsed as RetryItem[]
      console.log(`[retryQueue] Hydrated ${queue.length} item(s) from disk`)
    }
  } catch (err) {
    console.error('[retryQueue] Failed to hydrate queue:', err)
  }
}

// ─── Queue operations ─────────────────────────────────────────────────────────

export function enqueue(item: Omit<RetryItem, 'id' | 'attempts' | 'nextRetryAt'>): void {
  const entry: RetryItem = {
    ...item,
    id: randomUUID(),
    attempts: 0,
    nextRetryAt: new Date().toISOString(),
  }
  queue.push(entry)
  persist()
  console.log(`[retryQueue] Enqueued ${entry.type} item ${entry.id}`)
}

export function getQueue(): RetryItem[] {
  return [...queue]
}

// ─── Drain ────────────────────────────────────────────────────────────────────

type RetryHandler = (item: RetryItem) => Promise<void>
let hubspotHandler: RetryHandler | null = null
let emailHandler: RetryHandler | null = null

export function registerHandlers(handlers: {
  hubspot: RetryHandler
  email: RetryHandler
}): void {
  hubspotHandler = handlers.hubspot
  emailHandler = handlers.email
}

export async function drain(): Promise<void> {
  const now = Date.now()
  const due = queue.filter((item) => new Date(item.nextRetryAt).getTime() <= now)

  if (due.length === 0) return
  console.log(`[retryQueue] Draining ${due.length} due item(s)`)

  for (const item of due) {
    const handler = item.type === 'hubspot' ? hubspotHandler : emailHandler
    if (!handler) {
      console.warn(`[retryQueue] No handler registered for type "${item.type}" — skipping`)
      continue
    }

    try {
      await handler(item)
      queue = queue.filter((q) => q.id !== item.id)
      console.log(`[retryQueue] Retry succeeded for ${item.type} item ${item.id}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      item.attempts++
      item.lastError = errMsg

      if (item.attempts >= MAX_ATTEMPTS) {
        console.error(
          `[retryQueue] Final failure for ${item.type} item ${item.id} after ${item.attempts} attempts: ${errMsg}`,
          { id: item.id, type: item.type, payload: item.payload },
        )
        queue = queue.filter((q) => q.id !== item.id)
      } else {
        const delaySec = Math.pow(2, item.attempts) * BASE_DELAY_SECONDS
        item.nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString()
        console.warn(
          `[retryQueue] Retry failed for ${item.type} item ${item.id} (attempt ${item.attempts}/${MAX_ATTEMPTS}), next retry in ${delaySec}s`,
        )
      }
    }
  }

  persist()
}
