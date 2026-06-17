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

export interface PDFLeverRow {
  id: string
  name: string
  dimScores: Record<string, number | null>
  leverAvg: number | null
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
  leverRows?: PDFLeverRow[]
  measurementRows?: PDFMeasurementRow[]
  weakestLevers: Array<{ name: string; score: number | null }>
}

export interface PDFCrossCapRow {
  dim: string
  capScores: Record<string, number | null>
  avg: number | null
}

export interface PDFEVScenario {
  label: string
  ppDelta: number
  ppCapped: boolean
  evUplift: number
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
  evUplift: { scenarios: PDFEVScenario[]; topOfMarketMessage: string | null } | null
  capabilities: PDFCapabilityData[]
  crossCapDims: PDFCrossCapRow[]
  actionCapNames: string[]
  recommendationSentences: string[]
  ctaText: string
  ctaUrl: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = [0, 35, 55] as [number, number, number]
const BLUE = [37, 99, 235] as [number, number, number]
const GRAY: [number, number, number] = [100, 116, 139]
const DARK: [number, number, number] = [30, 41, 59]
const LIGHT: [number, number, number] = [241, 245, 249]
const DIMS = ['People', 'Process', 'Technology', 'Data']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): [number, number, number] {
  if (score === null) return LIGHT
  if (score < 1.5) return [254, 202, 202]
  if (score < 2.5) return [254, 215, 170]
  if (score < 3.5) return [191, 219, 254]
  if (score < 4.5) return [167, 243, 208]
  return [110, 231, 183]
}

function fmtScore(n: number | null): string {
  return n !== null ? n.toFixed(2) : '—'
}

function fmtPct(n: number | null): string {
  return n !== null ? `${(n * 100).toFixed(1)}%` : '—'
}

function fmtEV(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    const mStr = m % 1 === 0 ? m.toFixed(0) : parseFloat(m.toFixed(1)).toString()
    return `+$${mStr}M`
  }
  if (value >= 100_000) return `+$${Math.round(value / 1_000)}K`
  return `+$${Math.round(value).toLocaleString('en-US')}`
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

function footer(doc: jsPDF, page: number, total: number, date: string): void {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text(`Loremex NRR Intelligence Assessment — Generated ${date}`, 14, h - 6)
  doc.text(`Page ${page} of ${total}`, w - 14, h - 6, { align: 'right' })
}

// ─── Main function ────────────────────────────────────────────────────────────

export function generateScorecardPDF(params: PDFParams): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const date = new Date(params.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Page 1: Cover + Headline tiles + Cross-cap dim view ───────────────────

  navBar(doc, 'NRR Intelligence Assessment')

  let y = 28
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.text('NRR Intelligence Scorecard', 14, y)
  y += 7

  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(`${params.email}   ·   ${date}`, 14, y)
  y += 10

  // Headline tiles
  const tiles = [
    { label: 'NRR', value: fmtPct(params.nrr) },
    { label: 'GRR', value: fmtPct(params.grr) },
    { label: 'Reporting\nMaturity', value: params.reportingMaturity !== null ? `${fmtScore(params.reportingMaturity)}/5` : '—' },
    { label: 'Overall\nIntelligence', value: params.overallIntelligence !== null ? `${fmtScore(params.overallIntelligence)}/5` : '—' },
    { label: 'Distance\nto L5', value: fmtScore(params.distanceToL5) },
  ]

  const tileW = (pageWidth - 28 - 4 * 3) / 5
  tiles.forEach((tile, i) => {
    const tx = 14 + i * (tileW + 3)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(tx, y, tileW, 18, 1.5, 1.5, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.text(tile.label, tx + tileW / 2, y + 5.5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(tile.value, tx + tileW / 2, y + 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
  })
  y += 24

  // Net Movement + disclaimer (only when NRR was calculated)
  if (params.netMovementDollars !== null && params.netMovementPct !== null) {
    const d = params.netMovementDollars
    const p = params.netMovementPct
    const dSign = d >= 0 ? '+' : ''
    const pSign = p >= 0 ? '+' : ''
    const dStr = `${dSign}$${Math.abs(d).toLocaleString('en-US')}`
    const pStr = `${pSign}${(p * 100).toFixed(1)}%`
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(
      `Net Movement: ${dStr} (${pStr})  ·  Based on quarterly figures entered by user`,
      14,
      y,
    )
    y += 6
  }

  // EV Uplift section
  if (params.evUplift && params.evUplift.scenarios.length > 0) {
    doc.setFontSize(10)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.text('Enterprise Value Impact', 14, y)
    doc.setFont('helvetica', 'normal')
    y += 5

    if (params.evUplift.topOfMarketMessage) {
      const msgLines = doc.splitTextToSize(params.evUplift.topOfMarketMessage, pageWidth - 28) as string[]
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      doc.text(msgLines, 14, y)
      y += msgLines.length * 4 + 3
      const s = params.evUplift.scenarios[0]
      if (s) {
        doc.setFontSize(8)
        doc.setTextColor(...DARK)
        doc.text(`${s.label}: ${fmtEV(s.evUplift)} EV preserved`, 14, y)
        y += 5
      }
    } else {
      for (const s of params.evUplift.scenarios) {
        const ppStr = `+${s.ppDelta}pp${s.ppCapped ? '+' : ''}`
        doc.setFontSize(8)
        doc.setTextColor(...DARK)
        doc.text(`${s.label} (${ppStr}): ${fmtEV(s.evUplift)}`, 14, y)
        y += 5
      }
    }

    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.text(
      'Indicative — based on public SaaS valuation benchmarks. Real EV varies by growth rate, margin, and market conditions.',
      14,
      y,
    )
    y += 8
  }

  // Cross-cap dim view
  if (params.crossCapDims.length > 0 && params.actionCapNames.length >= 2) {
    doc.setFontSize(10)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.text('Cross-Capability Dimension View', 14, y)
    doc.setFont('helvetica', 'normal')
    y += 4

    const capKeys = params.capabilities
      .filter((c) => params.actionCapNames.includes(c.name))
      .map((c) => c.key)

    const head = ['Dimension', ...params.actionCapNames, 'Dim Avg', 'Gap to L5']
    const body = params.crossCapDims.map((row) => [
      row.dim,
      ...capKeys.map((k) => fmtScore(row.capScores[k] ?? null)),
      fmtScore(row.avg),
      row.avg !== null ? (5 - row.avg).toFixed(2) : '—',
    ])

    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      theme: 'grid',
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Per-capability heatmap pages ──────────────────────────────────────────

  for (const cap of params.capabilities) {
    doc.addPage()
    navBar(doc, cap.overall !== null ? `Overall: ${fmtScore(cap.overall)} / 5` : '')

    y = 26

    doc.setFontSize(12)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.text(cap.name, 14, y)
    doc.setFont('helvetica', 'normal')
    y += 8

    if (cap.type === 'measurement' && cap.measurementRows) {
      const body = cap.measurementRows.map((r) => {
        const cell = scoreColor(r.score)
        return [
          { content: `${r.id} — ${r.name}` },
          { content: r.score ?? '—', styles: { fillColor: cell, halign: 'center' as const } },
          { content: r.gapToL5 !== null ? r.gapToL5.toFixed(0) : '—', styles: { halign: 'center' as const } },
        ]
      })

      autoTable(doc, {
        startY: y,
        head: [['Category', 'Score', 'Gap to L5']],
        body,
        theme: 'grid',
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: DARK },
        margin: { left: 14, right: 14 },
      })
    } else if (cap.type === 'action' && cap.leverRows) {
      const body = cap.leverRows.map((r) => [
        { content: `${r.id} — ${r.name}` },
        ...DIMS.map((d) => {
          const score = r.dimScores[d] ?? null
          return { content: score !== null ? String(score) : '—', styles: { fillColor: scoreColor(score), halign: 'center' as const } }
        }),
        { content: r.leverAvg !== null ? r.leverAvg.toFixed(2) : '—', styles: { fillColor: scoreColor(r.leverAvg), halign: 'center' as const, fontStyle: 'bold' as const } },
        { content: r.gapToL5 !== null ? r.gapToL5.toFixed(2) : '—', styles: { halign: 'center' as const } },
      ])

      autoTable(doc, {
        startY: y,
        head: [['Lever', ...DIMS, 'Avg', 'Gap']],
        body,
        theme: 'grid',
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: DARK },
        columnStyles: { 0: { cellWidth: 48 } },
        margin: { left: 14, right: 14 },
      })
    }

    y = doc.lastAutoTable.finalY + 8

    if (cap.weakestLevers.length > 0) {
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.setFont('helvetica', 'bold')
      doc.text('3 HIGHEST-IMPACT LEVERS TO ADDRESS', 14, y)
      doc.setFont('helvetica', 'normal')
      y += 4
      cap.weakestLevers.forEach((l, i) => {
        doc.setFontSize(8)
        doc.setTextColor(...DARK)
        doc.text(`${i + 1}.  ${l.name} — score: ${l.score !== null ? l.score.toFixed(2) : '—'}`, 14, y)
        y += 5
      })
    }
  }

  // ── Last page: Recommendation ──────────────────────────────────────────────

  doc.addPage()
  navBar(doc, 'Where to Focus')

  y = 26
  doc.setFontSize(10)
  doc.setTextColor(...BLUE)
  doc.setFont('helvetica', 'bold')
  doc.text('YOUR PRIORITISED RECOMMENDATION', 14, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)

  for (const sentence of params.recommendationSentences) {
    const lines = doc.splitTextToSize(sentence, pageWidth - 28) as string[]
    doc.text(lines, 14, y)
    y += lines.length * 5 + 5
  }

  y += 4
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  const ctaLines = doc.splitTextToSize(params.ctaText, pageWidth - 28) as string[]
  doc.text(ctaLines, 14, y)
  y += ctaLines.length * 4 + 6

  doc.setFontSize(9)
  doc.setTextColor(...BLUE)
  doc.text(`Book a call: ${params.ctaUrl}`, 14, y)

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
