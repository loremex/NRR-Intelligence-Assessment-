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
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    const mStr = m % 1 === 0 ? m.toFixed(0) : parseFloat(m.toFixed(1)).toString()
    return `+$${mStr}M`
  }
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
  q2: string; q2_label: string; q2_text: string
  q3: string; q3_label: string; q3_text: string
  q4: string; q4_label: string; q4_text: string
  q5: string; q5_label: string; q5_text: string
  q6: string; q6_label: string; q6_text: string
  q7_text: string
}

export interface SendDiagnosticEmailParams {
  to: string
  verdictTitle: string
  recommendations: [string, string, string]
  answers: DiagnosticAnswerData
}

function buildDiagnosticEmailHtml(params: SendDiagnosticEmailParams, calendlyUrl: string): string {
  const { verdictTitle, recommendations, answers } = params

  const recRows = recommendations
    .map((rec, i) => `
      <tr>
        <td style="padding:0 0 10px;vertical-align:top;">
          <span style="display:inline-block;width:22px;height:22px;background:#2563EB;border-radius:50%;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;vertical-align:top;margin-top:1px;">${i + 1}</span>
          <span style="font-size:13px;color:#1E293B;line-height:1.6;">${rec}</span>
        </td>
      </tr>`)
    .join('')

  const qaRows = [
    ['Your biggest NRR challenge', answers.q2_label, answers.q2_text],
    ['Data maturity', answers.q3_label, answers.q3_text],
    ['Team structure', answers.q4_label, answers.q4_text],
    ['Strategic priority', answers.q5_label, answers.q5_text],
    ['Current ARR', answers.q6_label, answers.q6_text],
  ]
    .map(([q, a, note]) => `
      <tr>
        <td style="padding:0 0 10px;">
          <p style="margin:0 0 2px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">${q}</p>
          <p style="margin:0;font-size:13px;color:#1E293B;">${a}${note ? ` <span style="color:#64748B;font-style:italic;">— ${note}</span>` : ''}</p>
        </td>
      </tr>`)
    .join('')

  const q7Row = answers.q7_text
    ? `<tr><td style="padding:0 0 10px;">
        <p style="margin:0 0 2px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Additional context</p>
        <p style="margin:0;font-size:13px;color:#1E293B;font-style:italic;">${answers.q7_text}</p>
      </td></tr>`
    : ''

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
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#002337;font-family:Georgia,serif;">
              Your NRR Diagnostic
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748B;">
              Here's your personalised diagnosis and recommended focus areas.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 6px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Diagnosis</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#002337;font-family:Georgia,serif;line-height:1.3;">${verdictTitle}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px;font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Where to focus</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              ${recRows}
            </table>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#2563EB;border-radius:8px;padding:12px 24px;">
                  <a href="${calendlyUrl}" style="font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Book a call with Loremex →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;color:#64748B;line-height:1.6;">
              Want to go deeper? The full NRR Intelligence Assessment benchmarks you capability-by-capability and produces a detailed PDF scorecard with targeted recommendations.
            </p>
            <p style="margin:0 0 12px;font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Your answers</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;margin-bottom:8px;">
              <tr><td style="padding:16px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${qaRows}
                  ${q7Row}
                </table>
              </td></tr>
            </table>
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
      subject: `Your NRR Diagnostic — ${params.verdictTitle}`,
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
