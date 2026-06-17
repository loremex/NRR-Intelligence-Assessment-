import { describe, it, expect } from 'vitest'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Diagnostic 1: jsPDF alone produces valid bytes ──────────────────────────

describe('jsPDF baseline', () => {
  it('output("arraybuffer") returns non-empty ArrayBuffer', () => {
    const doc = new jsPDF()
    doc.text('hello', 10, 10)
    const buf = doc.output('arraybuffer')
    expect(buf.byteLength).toBeGreaterThan(0)
  })

  it('PDF starts with magic bytes %PDF', () => {
    const doc = new jsPDF()
    doc.text('hello', 10, 10)
    const buf = doc.output('arraybuffer')
    const header = String.fromCharCode(...new Uint8Array(buf).slice(0, 4))
    expect(header).toBe('%PDF')
  })
})

// ─── Diagnostic 2: side-effect import does NOT attach autoTable ──────────────

describe('jspdf-autotable — side-effect import (broken pattern)', () => {
  it('doc.autoTable is UNDEFINED after side-effect import in ESM — this is the bug', async () => {
    await import('jspdf-autotable')
    const doc = new jsPDF()
    // In Vite ESM, window.jsPDF is never set so applyPlugin never runs
    expect(typeof (doc as { autoTable?: unknown }).autoTable).toBe('undefined')
  })
})

// ─── Diagnostic 3: functional API works correctly ────────────────────────────

describe('autoTable functional API (correct pattern)', () => {
  it('autoTable(doc, options) runs without error', () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Name', 'Score']],
      body: [['Retention', '3.5'], ['Expansion', '2.9']],
    })
    const buf = doc.output('arraybuffer')
    expect(buf.byteLength).toBeGreaterThan(0)
  })

  it('lastAutoTable.finalY is populated after autoTable call', () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Name', 'Score']],
      body: [['Retention', '3.5']],
    })
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
    expect(typeof finalY).toBe('number')
    expect(finalY).toBeGreaterThan(0)
  })

  it('PDF output starts with %PDF magic bytes', () => {
    const doc = new jsPDF()
    autoTable(doc, { head: [['A']], body: [['1']] })
    const buf = doc.output('arraybuffer')
    const header = String.fromCharCode(...new Uint8Array(buf).slice(0, 4))
    expect(header).toBe('%PDF')
  })
})
