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

export interface PDFV2LeverScore {
  lever: string
  title: string
  score: number | null
  gapToL5: number | null
}

export interface PDFMeasurementRow {
  id: string
  name: string
  score: number | null
  gapToL5: number | null
}

export interface PDFCapabilityData {
  key: string
  name: string
  type: 'measurement' | 'action'
  overall: number | null
  v2LeverScores?: PDFV2LeverScore[]
  measurementRows?: PDFMeasurementRow[]
  weakestLevers: Array<{ name: string; score: number | null }>
}

export interface PDFParams {
  email: string
  generatedAt: string
  nrr: number | null
  grr: number | null
  netMovementDollars: number | null
  netMovementPct: number | null
  reportingMaturity: number | null
  overallIntelligence: number | null
  distanceToL5: number | null
  capabilities: PDFCapabilityData[]
  actionCapNames: string[]
  recommendationSentences: string[]
  ctaText: string
  ctaUrl: string
  diagnosticAnswers: {
    q1_reporting: { choice: 1 | 2 | 3 | 4 | 5 | null; freeText: string | null }
    q2_retention: { choice: 1 | 2 | 3 | 4 | 5 | null; freeText: string | null }
    q3_expansion: { choice: 1 | 2 | 3 | 4 | 5 | null; freeText: string | null }
    q4_pricing: { choice: 1 | 2 | 3 | 4 | 5 | null; freeText: string | null }
    q5_priority: { choice: string | null; freeText: string | null }
    q6_anything_else: { freeText: string | null }
  } | null
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
const Q_LABELS: Record<string, string[]> = {
  q1_reporting: ['No NRR number', 'Not confident', 'Somewhat confident', 'Confident', 'Very confident'],
  q2_retention: ['No way to tell', 'Best guesses', 'Partial view', 'Clear list', 'Real-time signal'],
  q3_expansion: ['No visibility', 'Tribal knowledge', 'Manual review', 'Defined motion', 'Real-time intelligence'],
  q4_pricing: ['No capture', 'Loose link', 'Partial capture', 'Strong alignment', 'Full capture'],
}
const Q_BLOCK_LABELS: Record<string, string> = {
  q1_reporting: 'NRR Reporting',
  q2_retention: 'Revenue Retention',
  q3_expansion: 'Revenue Expansion',
  q4_pricing: 'Pricing Optimization',
}
const Q5_LABELS: Record<string, string> = {
  retention: 'Reduce churn',
  expansion: 'Drive expansion',
  pricing: 'Fix pricing & packaging',
  reporting: 'Build measurement foundation',
}
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

function navBar(doc: jsPDF, rightText = ''): void {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, w, 18, 'F')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Loremex', 14, 12)
  if (rightText) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(rightText, w - 14, 12, { align: 'right' })
  }
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

  const weakestActionCap = params.capabilities
    .filter((c) => c.type === 'action')
    .reduce<PDFCapabilityData | null>((min, c) => {
      if (min === null) return c
      return (c.overall ?? 99) < (min.overall ?? 99) ? c : min
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

  // Section 1: Diagnostic Inputs
  if (params.diagnosticAnswers !== null) {
    y = sectionHeader(doc, 'YOUR DIAGNOSTIC INPUTS', y)

    const diagBody: Array<Array<{ content: string; styles?: Record<string, unknown> }>> = []
    const qKeys = ['q1_reporting', 'q2_retention', 'q3_expansion', 'q4_pricing'] as const
    for (const qk of qKeys) {
      const ans = params.diagnosticAnswers[qk]
      if (ans.choice !== null) {
        const label = Q_LABELS[qk]?.[ans.choice - 1] ?? String(ans.choice)
        diagBody.push([
          { content: Q_BLOCK_LABELS[qk] ?? qk, styles: { fontStyle: 'bold', cellWidth: 55 } },
          { content: label },
        ])
      }
    }

    if (diagBody.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [],
        body: diagBody,
        theme: 'plain',
        bodyStyles: { fontSize: 8, textColor: DARK },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 3
    }

    const q5choice = params.diagnosticAnswers.q5_priority.choice
    const q6text = params.diagnosticAnswers.q6_anything_else.freeText

    if (q5choice) {
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      doc.setFont('helvetica', 'normal')
      const priorityLabel = Q5_LABELS[q5choice] ?? q5choice
      const priorityLine = `Stated priority: ${priorityLabel}`
      if (q6text) {
        const combined = `${priorityLine}  ·  Notes: ${q6text}`
        const splitLines = doc.splitTextToSize(combined, pageWidth - 28) as string[]
        doc.text(splitLines, 14, y)
        y += splitLines.length * 4
      } else {
        doc.text(priorityLine, 14, y)
        y += 4
      }
    } else if (q6text) {
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      const noteLines = doc.splitTextToSize(`Notes: ${q6text}`, pageWidth - 28) as string[]
      doc.text(noteLines, 14, y)
      y += noteLines.length * 4
    }

    y += 6
    thinRule(doc, y)
    y += 5
  }

  // Section 2: Key Metrics
  y = sectionHeader(doc, 'KEY METRICS', y)

  const tiles: Array<{ label: string; value: string }> = [
    { label: 'NRR', value: params.nrr !== null ? `${(params.nrr * 100).toFixed(1)}%` : '—' },
    { label: 'GRR', value: params.grr !== null ? `${(params.grr * 100).toFixed(1)}%` : '—' },
    ...(params.reportingMaturity !== null
      ? [{ label: 'Reporting\nMaturity', value: `${params.reportingMaturity.toFixed(2)}/5` }]
      : []),
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

  const actionCaps = params.capabilities.filter((c) => c.type === 'action')
  const measurementCap = params.capabilities.find((c) => c.type === 'measurement')

  if (actionCaps.length > 0) {
    type BodyCell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> }
    const actionBody: BodyCell[][] = []

    for (const cap of actionCaps) {
      // Group header row
      actionBody.push([
        {
          content: `${cap.name}  (${cap.overall !== null ? cap.overall.toFixed(2) : '—'} / 5)`,
          colSpan: 3,
          styles: {
            fillColor: N800,
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 8,
          },
        },
      ])

      if (cap.v2LeverScores) {
        for (const r of cap.v2LeverScores) {
          actionBody.push([
            r.title,
            {
              content: r.score !== null ? r.score.toFixed(0) : '—',
              styles: {
                fillColor: navyCell(r.score),
                textColor: navyCellText(r.score),
                halign: 'center' as const,
                fontStyle: 'bold' as const,
              },
            },
            {
              content: r.gapToL5 !== null ? `+${r.gapToL5.toFixed(0)} to L5` : '—',
              styles: {
                fillColor: gapCell(r.gapToL5),
                textColor: gapCellText(r.gapToL5),
                halign: 'center' as const,
              },
            },
          ])
        }
      }
    }

    autoTable(doc, {
      startY: y,
      head: [['Lever', 'Score', 'Gap']],
      body: actionBody,
      theme: 'grid',
      headStyles: { fillColor: N600, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: DARK },
      columnStyles: { 0: { cellWidth: 80 } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  if (measurementCap && measurementCap.measurementRows) {
    // Measurement capability — separate table
    autoTable(doc, {
      startY: y,
      head: [['NRR Reporting — Category', 'Score', 'Gap to L5']],
      body: measurementCap.measurementRows.map((r) => {
        const s = r.score
        const gap = r.gapToL5
        return [
          r.name,
          {
            content: s !== null ? s.toFixed(2) : '—',
            styles: {
              fillColor: navyCell(s),
              textColor: navyCellText(s),
              halign: 'center' as const,
              fontStyle: 'bold' as const,
            },
          },
          {
            content: gap !== null ? gap.toFixed(2) : '—',
            styles: {
              fillColor: gapCell(gap),
              textColor: gapCellText(gap),
              halign: 'center' as const,
            },
          },
        ]
      }),
      theme: 'grid',
      headStyles: { fillColor: N600, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: DARK },
      columnStyles: { 0: { cellWidth: 80 } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Section C: Top 3 Highest-Impact Levers Across All Capabilities
  y = sectionHeader(doc, 'TOP 3 HIGHEST-IMPACT LEVERS', y)

  // Collect all v2 lever scores from all action caps, annotated with cap name
  const allLevers: Array<{ title: string; capName: string; score: number | null; gap: number | null }> = []
  for (const cap of actionCaps) {
    if (cap.v2LeverScores) {
      for (const lr of cap.v2LeverScores) {
        allLevers.push({
          title: lr.title,
          capName: cap.name,
          score: lr.score,
          gap: lr.gapToL5,
        })
      }
    }
  }

  // Sort by score ascending (nulls last), take top 3
  const sortedLevers = allLevers
    .filter((l) => l.score !== null)
    .sort((a, b) => (a.score ?? 99) - (b.score ?? 99))
    .slice(0, 3)

  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  for (let i = 0; i < sortedLevers.length; i++) {
    const lv = sortedLevers[i]
    const line = `${i + 1}.  ${lv.title} (${lv.capName}) — score ${lv.score?.toFixed(0) ?? '—'}, gap ${lv.gap?.toFixed(0) ?? '—'} to L5`
    doc.text(line, 14, y)
    y += 5
  }

  // ── Page 3: Recommendation + CTA ─────────────────────────────────────────

  doc.addPage()
  pageStrip(doc, 'PRIORITISED RECOMMENDATION  ·  PAGE 3')

  y = 16

  // Section A: Prioritised Recommendation
  y = sectionHeader(doc, 'YOUR PRIORITISED RECOMMENDATION', y)

  // Para 1 — Structural constraint
  let para1: string
  if (weakestActionCap) {
    para1 = `Your ${weakestActionCap.name} is the lowest-scoring capability (${weakestActionCap.overall?.toFixed(2) ?? '—'}/5). Address this first to establish the foundation for NRR improvement.`
  } else {
    para1 = 'Focus on addressing your lowest-scoring capability to establish the foundation for NRR improvement.'
  }

  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  const para1Lines = doc.splitTextToSize(para1, pageWidth - 28) as string[]
  doc.text(para1Lines, 14, y)
  y += para1Lines.length * 5 + 5

  // Para 2 — Weakest cap + top 3 levers
  if (weakestActionCap) {
    const weakestCapLevers = weakestActionCap.v2LeverScores
      ? [...weakestActionCap.v2LeverScores]
          .filter((l) => l.score !== null)
          .sort((a, b) => (a.score ?? 99) - (b.score ?? 99))
          .slice(0, 3)
      : []

    if (weakestCapLevers.length > 0) {
      const leverNames = weakestCapLevers.map((l) => `${l.title} (${l.score?.toFixed(0) ?? '—'})`)
      let leverList: string
      if (leverNames.length === 1) {
        leverList = leverNames[0]
      } else if (leverNames.length === 2) {
        leverList = `${leverNames[0]} and ${leverNames[1]}`
      } else {
        leverList = `${leverNames[0]}, ${leverNames[1]}, and ${leverNames[2]}`
      }
      const para2 = `Within ${weakestActionCap.name}, the three highest-impact levers are: ${leverList}. Focus on these first before expanding to other levers.`
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

  // ── Footers on all pages ───────────────────────────────────────────────────

  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    footer(doc, i, total, date)
  }

  return doc.output('blob')
}

// ─── Diagnostic PDF ───────────────────────────────────────────────────────────

export interface PDFDiagnosticParams {
  email: string
  generatedAt: string
  maturityStage: string
  weakestBlock: string
  strongestBlock: string
  blockScores: Record<string, 1 | 2 | 3 | 4 | 5>
  verdictDescription: string
  recommendations: [string, string, string]
  q1_text: string | null
  q2_text: string | null
  q3_text: string | null
  q4_text: string | null
  q6_text: string | null
  ctaUrl: string
}

const BLOCK_DISPLAY: Record<string, string> = {
  reporting: 'NRR Reporting', retention: 'Retention', expansion: 'Expansion', pricing: 'Pricing',
}
const MATURITY_LABEL: Record<number, string> = {
  1: 'Reactive', 2: 'Diagnostic', 3: 'Operational', 4: 'Optimized', 5: 'Intelligent',
}

export function generateDiagnosticPDF(params: PDFDiagnosticParams): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const date = new Date(params.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  navBar(doc, 'NRR Intelligence Diagnostic')

  let y = 28
  doc.setFontSize(16)
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.text('Your NRR Intelligence Diagnostic', 14, y)
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(`${params.email}   ·   ${date}`, 14, y)
  y += 10

  // Maturity stage banner
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('OVERALL STAGE', 19, y + 5)
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.text(params.maturityStage, 19, y + 12)
  doc.setFont('helvetica', 'normal')
  y += 20

  // Block scores table
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'bold')
  doc.text('BLOCK SCORES', 14, y)
  doc.setFont('helvetica', 'normal')
  y += 4

  const blockOrder = ['reporting', 'retention', 'expansion', 'pricing']
  const blockBody = blockOrder.map((b) => {
    const score = params.blockScores[b] ?? 1
    const label = MATURITY_LABEL[score] ?? ''
    const displayName = BLOCK_DISPLAY[b] ?? b
    const tag = b === params.weakestBlock ? ' (gap)' : b === params.strongestBlock ? ' (best)' : ''
    return [displayName + tag, score.toString(), label]
  })

  autoTable(doc, {
    startY: y,
    head: [['Block', 'Score (1–5)', 'Stage']],
    body: blockBody,
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255] as [number, number, number], fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 8

  // Verdict
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'bold')
  doc.text('VERDICT', 14, y)
  doc.setFont('helvetica', 'normal')
  y += 4
  doc.setFontSize(8.5)
  doc.setTextColor(...DARK)
  const verdictLines = doc.splitTextToSize(params.verdictDescription, pageWidth - 28) as string[]
  doc.text(verdictLines, 14, y)
  y += verdictLines.length * 4.5 + 8

  // Recommendations
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'bold')
  doc.text(`WHERE TO FOCUS — ${(BLOCK_DISPLAY[params.weakestBlock] ?? params.weakestBlock).toUpperCase()}`, 14, y)
  doc.setFont('helvetica', 'normal')
  y += 5
  params.recommendations.forEach((rec, i) => {
    doc.setFontSize(8)
    doc.setTextColor(...N600)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}.`, 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(rec, pageWidth - 30) as string[]
    doc.text(lines, 20, y)
    y += lines.length * 4.5 + 2
  })
  y += 4

  // Free text answers (sales reference)
  const freeTextEntries = [
    ['NRR Reporting', params.q1_text],
    ['Retention', params.q2_text],
    ['Expansion', params.q3_text],
    ['Pricing', params.q4_text],
    ['Additional context', params.q6_text],
  ].filter(([, v]) => v) as Array<[string, string]>

  if (freeTextEntries.length > 0) {
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text('ADDITIONAL CONTEXT FROM RESPONDENT', 14, y)
    doc.setFont('helvetica', 'normal')
    y += 5
    for (const [label, text] of freeTextEntries) {
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      doc.text(label.toUpperCase(), 14, y)
      y += 4
      doc.setFontSize(8)
      doc.setTextColor(...DARK)
      const lines = doc.splitTextToSize(text, pageWidth - 28) as string[]
      doc.text(lines, 14, y)
      y += lines.length * 4 + 3
    }
    y += 4
  }

  // CTA
  doc.setFontSize(8)
  doc.setTextColor(...N600)
  doc.text(`Book a call: ${params.ctaUrl}`, 14, y)

  // Footers
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
