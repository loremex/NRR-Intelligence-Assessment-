// PDF generation is client-side only using jsPDF.
// The client generates the PDF, converts to base64, and POSTs it to /api/complete-session
// so the server can attach the same bytes to the Resend email — no server-side PDF generation needed.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// jspdf-autotable v5 no longer auto-attaches to the jsPDF prototype in ESM
// environments (window.jsPDF is never set in Vite modules). We use the
// standalone functional API: autoTable(doc, options) instead of doc.autoTable().
// lastAutoTable is still set on the doc instance by the plugin.
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDFV3QuestionRow {
  qId: string
  title: string
  score: number | null
  pickedText: string | null
  gapToL5: number | null
}

export interface PDFCapabilityData {
  key: string
  name: string
  score: number | null
  stage: string
  questions: PDFV3QuestionRow[]
}

export interface PDFParams {
  email: string
  generatedAt: string
  nrr: number | null
  grr: number | null
  netMovementDollars: number | null
  netMovementPct: number | null
  leakDollars: number | null
  expansionDollars: number | null
  reportingMaturity: number | null
  overallIntelligence: number | null
  distanceToL5: number | null
  capabilities: PDFCapabilityData[]
  allCapabilityScores: Array<{ key: string; name: string; score: number | null }>
  recommendationSentences: string[]
  ctaText: string
  ctaUrl: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY: [number, number, number] = [0, 35, 55]
const GRAY: [number, number, number] = [100, 116, 139]
const DARK: [number, number, number] = [30, 41, 59]

// Navy ramp for heat-map cells
const N800: [number, number, number] = [15, 37, 69]    // #0F2545
const N600: [number, number, number] = [31, 58, 95]    // #1F3A5F
const N400: [number, number, number] = [122, 147, 184] // #7A93B8
const N200: [number, number, number] = [197, 210, 228] // #C5D2E4
const N100: [number, number, number] = [232, 237, 245] // #E8EDF5

// Lookup tables
const INTELLIGENCE_STAGE: Record<number, string> = {
  1: 'Ad Hoc', 2: 'Assigned', 3: 'Accountable', 4: 'Optimised', 5: 'Predictive',
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function navyCell(score: number | null): [number, number, number] {
  if (score === null) return [248, 250, 252]
  if (score < 2) return N100
  if (score < 3) return N200
  if (score < 4) return N400
  if (score < 4.5) return N600
  return N800
}

function navyCellText(score: number | null): [number, number, number] {
  if (score === null || score < 3) return [15, 37, 69]
  return [255, 255, 255]
}

// Gap column: reverse — small gap is good (deep navy), large gap is light
function gapCell(gap: number | null): [number, number, number] {
  if (gap === null) return [248, 250, 252]
  if (gap < 1) return N800
  if (gap < 2) return N600
  if (gap < 3) return N400
  if (gap < 4) return N200
  return N100
}

function gapCellText(gap: number | null): [number, number, number] {
  if (gap === null || gap >= 3) return [15, 37, 69]
  return [255, 255, 255]
}

// ─── Page helpers ─────────────────────────────────────────────────────────────

function pageStrip(doc: jsPDF, text: string): void {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...N800)
  doc.rect(0, 0, w, 8, 'F')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(text, 14, 5.8)
}

function sectionHeader(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(8)
  doc.setTextColor(...N400)
  doc.setFont('helvetica', 'bold')
  doc.text(text, 14, y)
  doc.setFont('helvetica', 'normal')
  return y + 5
}

function thinRule(doc: jsPDF, y: number): void {
  const w = doc.internal.pageSize.getWidth()
  doc.setDrawColor(...N200)
  doc.setLineWidth(0.3)
  doc.line(14, y, w - 14, y)
}

function footer(doc: jsPDF, page: number, total: number, date: string): void {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...N200)
  doc.setLineWidth(0.3)
  doc.line(14, h - 10, w - 14, h - 10)
  doc.setFontSize(6.5)
  doc.setTextColor(150, 160, 175)
  doc.setFont('helvetica', 'normal')
  doc.text(`Loremex NRR Intelligence Assessment  ·  Generated ${date}`, 14, h - 6)
  doc.text(`Page ${page} of ${total}`, w - 14, h - 6, { align: 'right' })
}

// ─── Main function ────────────────────────────────────────────────────────────

export function generateScorecardPDF(params: PDFParams): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const date = new Date(params.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Page 1: Executive Summary ─────────────────────────────────────────────

  // Header band — full-width, navy bg, 20mm tall
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('LOREMEX NRR INTELLIGENCE SCORECARD', 14, 13)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${params.email}  ·  ${date}`, pageWidth - 14, 13, { align: 'right' })

  let y = 28

  // Headline insight
  const stage = params.overallIntelligence !== null
    ? (INTELLIGENCE_STAGE[Math.round(Math.max(1, Math.min(5, params.overallIntelligence)))] ?? 'Accountable')
    : null

  const weakestActionCap = params.capabilities.reduce<PDFCapabilityData | null>((min, c) => {
    if (min === null) return c
    return (c.score ?? 99) < (min.score ?? 99) ? c : min
  }, null)

  const structuralConstraint = weakestActionCap?.name ?? null

  const headlineText = `Your NRR Intelligence is at ${stage ?? 'Accountable'} (${params.overallIntelligence?.toFixed(2) ?? '—'}/5). Your structural constraint is ${structuralConstraint ?? 'your lowest-scoring capability'}.`
  doc.setFontSize(10)
  doc.setTextColor(...N800)
  doc.setFont('helvetica', 'bold')
  const headlineLines = doc.splitTextToSize(headlineText, pageWidth - 28) as string[]
  doc.text(headlineLines, 14, y)
  y += headlineLines.length * 5 + 6

  thinRule(doc, y)
  y += 5

  // Section 0: What This Is Costing You
  if (params.leakDollars !== null && params.leakDollars > 0 && params.nrr !== null && params.grr !== null) {
    y = sectionHeader(doc, 'WHAT THIS IS COSTING YOU', y)

    const leak = params.leakDollars
    const nrrPct = (params.nrr * 100).toFixed(1)
    const grrPct = (params.grr * 100).toFixed(1)

    const fmt = (n: number): string => {
      const abs = Math.abs(n)
      if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
      if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`
      return `$${abs.toFixed(0)}`
    }

    let leakVariant: 'V1' | 'V2' | 'V3'
    if (params.nrr < 1.0) leakVariant = 'V1'
    else if (params.grr < 0.9) leakVariant = 'V2'
    else leakVariant = 'V3'

    const leakFmt = fmt(leak)

    const leakCopy: Record<typeof leakVariant, { headline: string; body: string }> = {
      'V1': {
        headline: `Your leak outran expansion this quarter — ${leakFmt} walked out the door.`,
        body: `With NRR at ${nrrPct}%, contraction and churn are outpacing expansion. ${leakFmt} left the base — and net revenue shrank. This isn't a revenue problem. It's a measurement and response problem: the signals were there; the system to catch them wasn't.`,
      },
      'V2': {
        headline: `You retained net positive — but ${leakFmt} left the base before expansion filled the gap.`,
        body: `NRR reads ${nrrPct}% because expansion covered the leak. But GRR is ${grrPct}% — below the 90% threshold that separates companies who are managing churn from those who are tolerating it. The expansion that rescued this quarter may not be there next quarter.`,
      },
      'V3': {
        headline: `You've largely closed the leak — ${leakFmt} left the base this quarter.`,
        body: `With GRR at ${grrPct}%, you've built a retention foundation most companies don't have. The remaining ${leakFmt} is preventable — the question is whether you have the measurement and response capability to catch it before it compounds.`,
      },
    }

    const { headline, body } = leakCopy[leakVariant]

    doc.setFontSize(9.5)
    doc.setTextColor(...N800)
    doc.setFont('helvetica', 'bold')
    const headlineLines = doc.splitTextToSize(headline, pageWidth - 28) as string[]
    doc.text(headlineLines, 14, y)
    y += headlineLines.length * 5 + 2

    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'normal')
    const bodyLines = doc.splitTextToSize(body, pageWidth - 28) as string[]
    doc.text(bodyLines, 14, y)
    y += bodyLines.length * 4.5 + 3

    // Leak amount tile (inline text row)
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text(`Quarterly Leak: `, 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...N800)
    doc.text(leakFmt, 14 + 28, y)
    doc.setTextColor(...GRAY)
    doc.text('  (contraction + churn)', 14 + 28 + 12, y)
    y += 5

    thinRule(doc, y)
    y += 5
  }

  // Section 1: Key Metrics
  y = sectionHeader(doc, 'KEY METRICS', y)

  const tiles: Array<{ label: string; value: string }> = [
    { label: 'NRR', value: params.nrr !== null ? `${(params.nrr * 100).toFixed(1)}%` : '—' },
    { label: 'GRR', value: params.grr !== null ? `${(params.grr * 100).toFixed(1)}%` : '—' },
    { label: 'Overall\nIntelligence', value: params.overallIntelligence !== null ? `${params.overallIntelligence.toFixed(2)}/5` : '—' },
    { label: 'Distance\nto L5', value: params.distanceToL5 !== null ? params.distanceToL5.toFixed(2) : '—' },
  ]

  const tileW = (pageWidth - 28 - (tiles.length - 1) * 3) / tiles.length
  tiles.forEach((tile, i) => {
    const tx = 14 + i * (tileW + 3)
    doc.setFillColor(...N100)
    doc.roundedRect(tx, y, tileW, 18, 1.5, 1.5, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text(tile.label, tx + tileW / 2, y + 5.5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...N800)
    doc.text(tile.value, tx + tileW / 2, y + 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
  })
  y += 22

  if (params.netMovementDollars !== null && params.netMovementPct !== null) {
    const d = params.netMovementDollars
    const p = params.netMovementPct
    const dSign = d >= 0 ? '+' : ''
    const pSign = p >= 0 ? '+' : ''
    const dStr = `${dSign}$${Math.abs(d).toLocaleString('en-US')}`
    const pStr = `${pSign}${(p * 100).toFixed(1)}%`
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Net Movement: ${dStr} (${pStr})  ·  Based on quarterly figures entered by user`,
      14,
      y,
    )
    y += 6
  }

  thinRule(doc, y)
  y += 5

  // ── Page 2: Diagnostic Findings ───────────────────────────────────────────

  doc.addPage()
  pageStrip(doc, 'DIAGNOSTIC FINDINGS  ·  PAGE 2')

  y = 16

  // Section B: Capability Detail (consolidated)
  y = sectionHeader(doc, 'CAPABILITY DETAIL', y)

  if (params.capabilities.length > 0) {
    type BodyCell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> }
    const capBody: BodyCell[][] = []

    for (const cap of params.capabilities) {
      // Group header row
      capBody.push([
        {
          content: `${cap.name}  (${cap.score !== null ? cap.score.toFixed(2) : '—'} / 5  ·  ${cap.stage})`,
          colSpan: 3,
          styles: {
            fillColor: N800,
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 8,
          },
        },
      ])

      for (const q of cap.questions) {
        capBody.push([
          q.title,
          {
            content: q.score !== null ? q.score.toFixed(0) : '—',
            styles: {
              fillColor: navyCell(q.score),
              textColor: navyCellText(q.score),
              halign: 'center' as const,
              fontStyle: 'bold' as const,
            },
          },
          {
            content: q.gapToL5 !== null ? `+${q.gapToL5.toFixed(0)} to L5` : '—',
            styles: {
              fillColor: gapCell(q.gapToL5),
              textColor: gapCellText(q.gapToL5),
              halign: 'center' as const,
            },
          },
        ])
      }
    }

    autoTable(doc, {
      startY: y,
      head: [['Question', 'Score', 'Gap']],
      body: capBody,
      theme: 'grid',
      headStyles: { fillColor: N600, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: DARK },
      columnStyles: { 0: { cellWidth: 80 } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Section C: Top 3 Highest-Impact Questions Across All Capabilities
  y = sectionHeader(doc, 'TOP 3 HIGHEST-IMPACT AREAS TO ADDRESS', y)

  // Collect all question scores, annotated with cap name
  const allQuestions: Array<{ title: string; capName: string; score: number | null; gap: number | null }> = []
  for (const cap of params.capabilities) {
    for (const q of cap.questions) {
      allQuestions.push({
        title: q.title,
        capName: cap.name,
        score: q.score,
        gap: q.gapToL5,
      })
    }
  }

  // Sort by score ascending (nulls last), take top 3
  const sortedQuestions = allQuestions
    .filter((q) => q.score !== null)
    .sort((a, b) => (a.score ?? 99) - (b.score ?? 99))
    .slice(0, 3)

  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  for (let i = 0; i < sortedQuestions.length; i++) {
    const q = sortedQuestions[i]
    const line = `${i + 1}.  ${q.title} (${q.capName}) — score ${q.score?.toFixed(0) ?? '—'}, gap ${q.gap?.toFixed(0) ?? '—'} to L5`
    doc.text(line, 14, y)
    y += 5
  }

  // ── Page 3: Recommendation + CTA ─────────────────────────────────────────

  doc.addPage()
  pageStrip(doc, 'PRIORITISED RECOMMENDATION  ·  PAGE 3')

  y = 16

  // Section A: Maturity Matrix (stacked above recommendation — PDF can't do equal-height two columns cleanly)
  y = sectionHeader(doc, 'MATURITY MATRIX', y)

  const MATRIX_CAP_ORDER = [
    { key: 'reporting', shortName: 'NRR Reporting' },
    { key: 'retention', shortName: 'Retention' },
    { key: 'expansion', shortName: 'Expansion' },
    { key: 'pricing', shortName: 'Pricing Opt.' },
  ]

  const matrixBody = MATRIX_CAP_ORDER.map(({ key, shortName }) => {
    const capScore = params.allCapabilityScores.find((c) => c.key === key)
    const level = capScore?.score != null
      ? Math.max(1, Math.min(5, Math.round(capScore.score)))
      : null

    return [
      shortName,
      ...([1, 2, 3, 4, 5].map((l) => ({
        content: l === level ? 'You' : l === 5 ? '◌' : '',
        styles: {
          halign: 'center' as const,
          fillColor: l === level
            ? [37, 99, 235] as [number, number, number]
            : l === 5
              ? [220, 230, 248] as [number, number, number]
              : [232, 237, 245] as [number, number, number],
          textColor: l === level
            ? [255, 255, 255] as [number, number, number]
            : [100, 120, 160] as [number, number, number],
          fontStyle: 'bold' as const,
        },
      }))),
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Capability', 'L1', 'L2', 'L3', 'L4', 'L5 Frontier']],
    body: matrixBody,
    theme: 'grid',
    headStyles: { fillColor: N800, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    columnStyles: { 0: { cellWidth: 42 } },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 8

  thinRule(doc, y)
  y += 5

  // Section B: Prioritised Recommendation
  y = sectionHeader(doc, 'YOUR PRIORITISED RECOMMENDATION', y)

  // Para 1 — Structural constraint
  let para1: string
  if (weakestActionCap) {
    para1 = `Your ${weakestActionCap.name} is the lowest-scoring capability (${weakestActionCap.score?.toFixed(2) ?? '—'}/5). Address this first to establish the foundation for NRR improvement.`
  } else {
    para1 = 'Focus on addressing your lowest-scoring capability to establish the foundation for NRR improvement.'
  }

  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  const para1Lines = doc.splitTextToSize(para1, pageWidth - 28) as string[]
  doc.text(para1Lines, 14, y)
  y += para1Lines.length * 5 + 5

  // Para 2 — Weakest cap + top 3 questions
  if (weakestActionCap) {
    const weakestCapQuestions = weakestActionCap.questions
      ? [...weakestActionCap.questions]
          .filter((q) => q.score !== null)
          .sort((a, b) => (a.score ?? 99) - (b.score ?? 99))
          .slice(0, 3)
      : []

    if (weakestCapQuestions.length > 0) {
      const questionNames = weakestCapQuestions.map((q) => `${q.title} (${q.score?.toFixed(0) ?? '—'})`)
      let questionList: string
      if (questionNames.length === 1) {
        questionList = questionNames[0]
      } else if (questionNames.length === 2) {
        questionList = `${questionNames[0]} and ${questionNames[1]}`
      } else {
        questionList = `${questionNames[0]}, ${questionNames[1]}, and ${questionNames[2]}`
      }
      const para2 = `Within ${weakestActionCap.name}, the three highest-impact areas are: ${questionList}. Focus on these first before expanding to other areas.`
      const para2Lines = doc.splitTextToSize(para2, pageWidth - 28) as string[]
      doc.text(para2Lines, 14, y)
      y += para2Lines.length * 5 + 5
    }
  }

  // Para 3 — Loremex POV
  const para3 = `Loremex helps PE-backed SaaS leaders move from L3 to L5 across these capabilities. Our methodology focuses on the structural lever first — addressing your weakest capability as the multiplier that unlocks every capability score above it.`
  const para3Lines = doc.splitTextToSize(para3, pageWidth - 28) as string[]
  doc.text(para3Lines, 14, y)
  y += para3Lines.length * 5 + 8

  thinRule(doc, y)
  y += 5

  // Section B: Next Steps
  y = sectionHeader(doc, 'NEXT STEPS', y)
  y += 5

  const nextSteps = [
    { text: `Book a 30-minute walkthrough — ${params.ctaUrl}`, bold: true, color: N600 as [number, number, number] },
    { text: 'Take the full diagnostic with the Loremex team for deeper benchmarking', bold: false, color: DARK },
    { text: 'Share this scorecard with your CRO/CFO for alignment', bold: false, color: DARK },
  ]

  for (const step of nextSteps) {
    doc.setFontSize(8.5)
    doc.setTextColor(...step.color)
    doc.setFont('helvetica', step.bold ? 'bold' : 'normal')
    doc.text(`• ${step.text}`, 14, y)
    y += 6
  }
  doc.setFont('helvetica', 'normal')

  thinRule(doc, y)
  y += 5

  // Section C: AI-Generated Recommendation Sentences
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'bold')
  doc.text('AI-GENERATED RECOMMENDATION', 14, y)
  doc.setFont('helvetica', 'normal')
  y += 4

  for (const sentence of params.recommendationSentences) {
    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(sentence, pageWidth - 28) as string[]
    doc.text(lines, 14, y)
    y += lines.length * 5 + 3
  }

  // m3ter citation
  thinRule(doc, y)
  y += 5

  const m3terText = 'Companies that move from manual, flat pricing to automated, usage-based models run 20–25 points higher on NRR.'
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'italic')
  const m3terLines = doc.splitTextToSize(m3terText, pageWidth - 28) as string[]
  doc.text(m3terLines, 14, y)
  y += m3terLines.length * 4.5 + 2

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Source: m3ter, Net Revenue Retention and SaaS Valuations (2026).', 14, y)
  y += 6

  // Leak ceiling (only when calculator was completed)
  if (params.leakDollars !== null && params.leakDollars > 0) {
    const fmtLeak = (n: number): string => {
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
      if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
      return `$${n.toFixed(0)}`
    }
    const ceilingText = `Your ceiling is bounded by the ${fmtLeak(params.leakDollars)} you're leaking now.`
    doc.setFontSize(7.5)
    doc.setTextColor(...N600)
    doc.setFont('helvetica', 'italic')
    const ceilingLines = doc.splitTextToSize(ceilingText, pageWidth - 28) as string[]
    doc.text(ceilingLines, 14, y)
    doc.setFont('helvetica', 'normal')
    y += ceilingLines.length * 4.5 + 3
  }

  // ── Footers on all pages ───────────────────────────────────────────────────

  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    footer(doc, i, total, date)
  }

  return doc.output('blob')
}

// Convert a Blob to base64 string via FileReader (browser async API)
export function getPDFBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
