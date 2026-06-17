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

export interface SendScorecardEmailParams {
  to: string
  pdfBase64: string
  scorecardSummary: {
    overallIntelligence: number | null
    weakestCapability: string | null
    recommendationSentences: string[]
  }
}

export interface SendEmailResult {
  messageId: string | null
  success: boolean
}

function isRetryableStatus(status?: number): boolean {
  if (!status) return true
  return status >= 500 || status === 429
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (!isRetryableStatus(status)) throw err
      lastErr = err
      if (attempt < maxAttempts) {
        await sleep(1000 * attempt)
      }
    }
  }
  throw lastErr
}

function buildEmailHtml(params: SendScorecardEmailParams, baseUrl: string, calendlyUrl: string): string {
  const { overallIntelligence, weakestCapability, recommendationSentences } = params.scorecardSummary
  const oiText = overallIntelligence !== null ? overallIntelligence.toFixed(2) : '—'
  const rec = recommendationSentences[0] ?? ''

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
        <tr>
          <td style="background:#002337;padding:20px 32px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;font-family:Georgia,serif;">Loremex</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#002337;font-family:Georgia,serif;">
              Your NRR Intelligence Scorecard is ready
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748B;">
              Here's a summary of your assessment results.
            </p>
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
            <p style="margin:0 0 24px;font-size:14px;color:#1E293B;line-height:1.7;">
              Open the attached PDF to see your full scorecard with heatmaps and our recommendation for where to focus.
            </p>
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

export async function sendScorecardEmail(params: SendScorecardEmailParams): Promise<SendEmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'ls@loremex.ai'
  const fromName = process.env.RESEND_FROM_NAME ?? 'Loremex Team'
  const from = `${fromName} <${fromEmail}>`
  const replyTo = process.env.RESEND_REPLY_TO ?? 'ls@loremex.com'
  const baseUrl = process.env.VITE_BASE_URL ?? 'https://assessment.loremex.ai'
  const calendlyUrl = process.env.CALENDLY_URL ?? process.env.VITE_CALENDLY_URL ?? 'https://calendly.com/loremex/intro'

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
