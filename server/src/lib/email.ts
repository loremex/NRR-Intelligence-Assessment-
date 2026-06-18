import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not configured')
    _resend = new Resend(key)
  }
  return _resend
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface SendScorecardEmailParams {
  to: string
  pdfBase64: string
  scorecardSummary: {
    overallIntelligence: number | null
    weakestCapability: string | null
    recommendationSentences: string[]
  }
  evUplift?: EVEmailData | null
}

export interface SendEmailResult {
  messageId: string | null
  success: boolean
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function isRetryableStatus(status?: number): boolean {
  if (!status) return true  // network error — retry
  return status >= 500 || status === 429
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (!isRetryableStatus(status)) throw err
      lastErr = err
      if (attempt < maxAttempts) {
        await sleep(1000 * Math.pow(2, attempt - 1))
      }
    }
  }
  throw lastErr
}

// ─── HTML template ────────────────────────────────────────────────────────────

function fmtEV(value: number): string {
  if (value >= 1_000_000_000) return `+$${parseFloat((value / 1_000_000_000).toFixed(1))}B`
  if (value >= 10_000_000) return `+$${Math.round(value / 1_000_000)}M`
  if (value >= 1_000_000) return `+$${parseFloat((value / 1_000_000).toFixed(1))}M`
  if (value >= 100_000) return `+$${Math.round(value / 1_000)}K`
  return `+$${Math.round(value).toLocaleString('en-US')}`
}

function buildEVBlock(evUplift: EVEmailData | null | undefined): string {
  if (!evUplift || evUplift.scenarios.length === 0) return ''

  const { scenarios, topOfMarketMessage, startingMRRFormatted } = evUplift
  let inner: string

  if (topOfMarketMessage) {
    const s = scenarios[0]
    inner = `<p style="margin:0 0 8px;font-size:13px;color:#1E293B;line-height:1.6;">${topOfMarketMessage}</p>`
    if (s) {
      inner += `<p style="margin:0;font-size:13px;color:#1E293B;">&#x2022; ${s.label}: ${fmtEV(s.evUplift)} EV preserved</p>`
    }
  } else {
    const rows = scenarios
      .map((s) => `<li>${s.label} (+${s.ppDelta}pp${s.ppCapped ? '+' : ''}): <strong>${fmtEV(s.evUplift)}</strong></li>`)
      .join('\n      ')
    inner = `<p style="margin:0 0 8px;font-size:13px;color:#1E293B;line-height:1.6;">
      At your ${startingMRRFormatted} starting MRR, moving NRR by even a few percentage points could unlock material enterprise value:
    </p>
    <ul style="margin:0 0 8px;padding-left:20px;font-size:13px;color:#1E293B;line-height:1.8;">
      ${rows}
    </ul>`
  }

  return `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border-radius:8px;margin-bottom:24px;border:1px solid #BBF7D0;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 10px;font-size:12px;color:#064E3B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Enterprise Value Impact</p>
                  ${inner}
                  <p style="margin:8px 0 0;font-size:11px;color:#64748B;font-style:italic;">
                    Indicative — based on public SaaS valuation benchmarks. Real EV varies by growth rate, margin, and market conditions.
                  </p>
                </td>
              </tr>
            </table>`
}

function buildEmailHtml(params: SendScorecardEmailParams, baseUrl: string, calendlyUrl: string): string {
  const { overallIntelligence, weakestCapability, recommendationSentences } = params.scorecardSummary
  const oiText = overallIntelligence !== null ? overallIntelligence.toFixed(2) : '—'
  const rec = recommendationSentences[0] ?? ''
  const evBlock = buildEVBlock(params.evUplift)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your NRR Intelligence Scorecard</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:#002337;padding:20px 32px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;font-family:Georgia,serif;">Loremex</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#002337;font-family:Georgia,serif;">
              Your NRR Intelligence Scorecard is ready
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748B;">
              Here's a summary of your assessment results.
            </p>

            <!-- Summary card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Overall Intelligence</p>
                  <p style="margin:0 0 16px;font-size:28px;font-weight:700;color:#002337;">${oiText}<span style="font-size:16px;color:#64748B;font-weight:400;"> / 5</span></p>
                  ${weakestCapability ? `<p style="margin:0 0 8px;font-size:13px;color:#64748B;">Weakest area: <strong style="color:#1E293B;">${weakestCapability}</strong></p>` : ''}
                  ${rec ? `<p style="margin:0;font-size:13px;color:#1E293B;line-height:1.6;">${rec}</p>` : ''}
                </td>
              </tr>
            </table>

            ${evBlock}
            <p style="margin:0 0 24px;font-size:14px;color:#1E293B;line-height:1.7;">
              Open the attached PDF to see your full scorecard with heatmaps and our recommendation for where to focus.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#2563EB;border-radius:8px;padding:12px 24px;">
                  <a href="${calendlyUrl}" style="font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Book a call with Loremex →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">
              Want to discuss your results? Our team helps PE-backed SaaS leaders move from L3 to L5 across these capabilities.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:12px;color:#94A3B8;">
              Loremex &nbsp;·&nbsp; Chicago, IL &nbsp;·&nbsp;
              <a href="${baseUrl}/unsubscribe" style="color:#94A3B8;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function sendScorecardEmail(params: SendScorecardEmailParams): Promise<SendEmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'ls@loremex.ai'
  const fromName = process.env.RESEND_FROM_NAME ?? 'Loremex Team'
  const from = `${fromName} <${fromEmail}>`
  const replyTo = process.env.RESEND_REPLY_TO ?? 'ls@loremex.com'
  const baseUrl = process.env.VITE_BASE_URL ?? 'http://localhost:5173'
  const calendlyUrl = process.env.CALENDLY_URL ?? 'https://calendly.com/loremex/intro'

  return withRetry(async () => {
    const resend = getResend()
    const html = buildEmailHtml(params, baseUrl, calendlyUrl)

    const result = await resend.emails.send({
      from,
      to: params.to,
      replyTo,
      subject: 'Your NRR Intelligence Scorecard',
      html,
      attachments: [
        {
          filename: 'NRR_Intelligence_Scorecard.pdf',
          content: params.pdfBase64,
        },
      ],
    })

    if (result.error) {
      const err = result.error as { statusCode?: number; message?: string }
      const error = Object.assign(new Error(err.message ?? 'Resend error'), { statusCode: err.statusCode })
      throw error
    }

    return { messageId: result.data?.id ?? null, success: true }
  })
}

// ─── Diagnostic email ─────────────────────────────────────────────────────────

export interface DiagnosticAnswerData {
  q1_score: 1 | 2 | 3 | 4 | 5; q1_text: string | null
  q2_score: 1 | 2 | 3 | 4 | 5; q2_text: string | null
  q3_score: 1 | 2 | 3 | 4 | 5; q3_text: string | null
  q4_score: 1 | 2 | 3 | 4 | 5; q4_text: string | null
  q5_priority: string; q6_text: string | null
}

interface EVEmailScenarioDiag { label: string; ppDelta: number; ppCapped: boolean; evUplift: number }
interface EVEmailDataDiag {
  scenarios: EVEmailScenarioDiag[]
  topOfMarketMessage: string | null
  startingMRRFormatted: string
}

export interface SendDiagnosticEmailParams {
  to: string
  maturityStage: string
  weakestBlock: string
  strongestBlock: string
  blockScores: Record<string, 1 | 2 | 3 | 4 | 5>
  verdictDescription: string
  recommendations: [string, string, string]
  answers: DiagnosticAnswerData
  evUplift: EVEmailDataDiag | null
}

const MATURITY_BG: Record<number, string> = {
  1: '#FEE2E2', 2: '#FEF3C7', 3: '#DCFCE7', 4: '#D1FAE5',
}
const MATURITY_NAME: Record<number, string> = {
  1: 'Reactive', 2: 'Diagnostic', 3: 'Operational', 4: 'Optimized',
}
const BLOCK_NAME: Record<string, string> = {
  reporting: 'NRR Reporting', retention: 'Retention', expansion: 'Expansion', pricing: 'Pricing',
}

function buildDiagnosticEmailHtml(params: SendDiagnosticEmailParams, calendlyUrl: string): string {
  const { maturityStage, weakestBlock, strongestBlock, blockScores, verdictDescription, recommendations, answers, evUplift } = params

  const recRows = recommendations
    .map((rec, i) => `
      <tr>
        <td style="padding:0 0 12px;vertical-align:top;">
          <span style="display:inline-block;width:22px;height:22px;background:#2563EB;border-radius:50%;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;flex-shrink:0;vertical-align:top;margin-top:1px;">${i + 1}</span>
          <span style="font-size:13px;color:#1E293B;line-height:1.6;">${rec}</span>
        </td>
      </tr>`)
    .join('')

  const blockOrder = ['reporting', 'retention', 'expansion', 'pricing']
  const blockRows = blockOrder
    .map((b) => {
      const score = blockScores[b] ?? 1
      const bg = MATURITY_BG[score] ?? '#F1F5F9'
      const name = MATURITY_NAME[score] ?? ''
      const displayName = BLOCK_NAME[b] ?? b
      return `<tr>
        <td style="padding:6px 0;font-size:13px;color:#1E293B;">${displayName}${b === weakestBlock ? ' <span style="font-size:10px;color:#DC2626;">▲ Gap</span>' : ''}${b === strongestBlock && b !== weakestBlock ? ' <span style="font-size:10px;color:#16A34A;">★</span>' : ''}</td>
        <td style="padding:6px 8px;text-align:right;"><span style="background:${bg};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${name}</span></td>
      </tr>`
    })
    .join('')

  const evBlock = evUplift && evUplift.scenarios.length > 0 ? buildEVBlock(evUplift as Parameters<typeof buildEVBlock>[0]) : ''

  const freeTextRows = [
    ['NRR Reporting — free text', answers.q1_text],
    ['Retention — free text', answers.q2_text],
    ['Expansion — free text', answers.q3_text],
    ['Pricing — free text', answers.q4_text],
    ['Additional context', answers.q6_text],
  ]
    .filter(([, v]) => v)
    .map(([label, text]) => `
      <tr>
        <td style="padding:0 0 10px;">
          <p style="margin:0 0 2px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">${label}</p>
          <p style="margin:0;font-size:13px;color:#1E293B;font-style:italic;">${text}</p>
        </td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your NRR Diagnostic</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#002337;padding:20px 32px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;font-family:Georgia,serif;">Loremex</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#002337;font-family:Georgia,serif;">
              Your NRR Intelligence Diagnostic
            </h1>
            <p style="margin:0 0 24px;font-size:13px;color:#64748B;font-style:italic;">
              Based on your answers across Reporting, Retention, Expansion, and Pricing.
            </p>

            <!-- Maturity stage -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;margin-bottom:16px;border:1px solid #E2E8F0;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Overall Stage</p>
                  <p style="margin:0;font-size:24px;font-weight:700;color:#002337;font-family:Georgia,serif;">${maturityStage}</p>
                </td>
              </tr>
            </table>

            <!-- Block scores -->
            <p style="margin:0 0 8px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Block Scores</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;margin-bottom:24px;border:1px solid #E2E8F0;">
              <tr><td style="padding:12px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${blockRows}
                </table>
              </td></tr>
            </table>

            <!-- Verdict -->
            <p style="margin:0 0 8px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Verdict</p>
            <p style="margin:0 0 24px;font-size:13px;color:#1E293B;line-height:1.7;">${verdictDescription}</p>

            <!-- Recommendations -->
            <p style="margin:0 0 12px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Where to focus — ${BLOCK_NAME[weakestBlock] ?? weakestBlock}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              ${recRows}
            </table>

            ${evBlock}

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#2563EB;border-radius:8px;padding:12px 24px;">
                  <a href="${calendlyUrl}" style="font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Book a 30-min call with Loremex →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:13px;color:#64748B;line-height:1.6;">
              Want to go deeper? The full NRR Intelligence Assessment gives you a capability-by-capability scorecard with heatmaps and targeted recommendations.
            </p>

            ${freeTextRows ? `
            <!-- Free text answers (sales reference) -->
            <p style="margin:0 0 8px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Additional context from respondent</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border-radius:8px;border:1px solid #FCD34D;margin-bottom:8px;">
              <tr><td style="padding:16px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${freeTextRows}
                </table>
              </td></tr>
            </table>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:12px;color:#94A3B8;">
              Loremex &nbsp;·&nbsp; Chicago, IL
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendDiagnosticEmail(params: SendDiagnosticEmailParams): Promise<SendEmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'ls@loremex.ai'
  const fromName = process.env.RESEND_FROM_NAME ?? 'Loremex Team'
  const from = `${fromName} <${fromEmail}>`
  const replyTo = process.env.RESEND_REPLY_TO ?? 'ls@loremex.com'
  const calendlyUrl = process.env.CALENDLY_URL ?? 'https://calendly.com/loremex/intro'

  return withRetry(async () => {
    const resend = getResend()
    const html = buildDiagnosticEmailHtml(params, calendlyUrl)

    const result = await resend.emails.send({
      from,
      to: params.to,
      replyTo,
      subject: `Your NRR Diagnostic — ${params.maturityStage} Stage`,
      html,
    })

    if (result.error) {
      const err = result.error as { statusCode?: number; message?: string }
      const error = Object.assign(new Error(err.message ?? 'Resend error'), { statusCode: err.statusCode })
      throw error
    }

    return { messageId: result.data?.id ?? null, success: true }
  })
}
