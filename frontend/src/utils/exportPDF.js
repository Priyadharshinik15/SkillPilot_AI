/**
 * exportPDF.js — SkillPilot AI Progress Report
 * Runs entirely in the browser. Triggers a local file download.
 *
 * Fix: jspdf-autotable must be applied via applyPlugin(jsPDF),
 *      then called as doc.autoTable(...) — NOT as a standalone function.
 */
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'

// Apply the plugin once at module load time
applyPlugin(jsPDF)

// ── colours ────────────────────────────────────────────────────────────────
const C = {
  brand:  [79,  70, 229],
  green:  [34, 211, 164],
  yellow: [251, 191, 36],
  red:    [248, 113, 113],
  purple: [167, 139, 250],
  dark:   [15,  17,  23],
  text:   [30,  41,  59],
  muted:  [100, 116, 139],
  light:  [245, 247, 252],
  white:  [255, 255, 255],
}

function masteryColor(v) {
  if (v >= 0.75) return C.green
  if (v >= 0.50) return C.brand
  if (v >= 0.30) return C.yellow
  return C.red
}

function drawBar(doc, x, y, w, h, pct, color) {
  doc.setFillColor(220, 224, 235)
  doc.roundedRect(x, y, w, h, 1, 1, 'F')
  if (pct > 0) {
    doc.setFillColor(...color)
    doc.roundedRect(x, y, Math.max(w * Math.min(pct, 1), 2), h, 1, 1, 'F')
  }
}

function sectionHeader(doc, text, y, pageW = 210) {
  doc.setFillColor(...C.dark)
  doc.rect(14, y, pageW - 28, 7, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), 17, y + 5)
  doc.setTextColor(...C.text)
  return y + 12
}

function checkPage(doc, y, needed = 20) {
  if (y + needed > 280) { doc.addPage(); return 14 }
  return y
}

export function exportPDF(learner) {
  if (!learner) throw new Error('No learner data')

  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const now   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  let y = 0

  // ── Cover header ───────────────────────────────────────────────────────
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, pageW, 42, 'F')

  // accent stripe
  doc.setFillColor(...C.brand)
  doc.rect(0, 42, pageW, 1.2, 'F')

  doc.setTextColor(...C.white)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('SkillPilot AI', 14, 16)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 130, 200)
  doc.text('AI CAREER INTELLIGENCE NAVIGATOR', 14, 22)

  doc.setTextColor(...C.white)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Learner Progress Report', 14, 34)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 165, 190)
  doc.text(`${learner.name || 'Learner'}   |   ${now}`, pageW - 14, 34, { align: 'right' })

  y = 52

  // ── Summary cards ──────────────────────────────────────────────────────
  const cards = [
    { label: 'Career Readiness', value: `${learner.readiness ?? 0}%`,           color: C.green  },
    { label: 'Target Role',      value: learner.goal || '—',                     color: C.brand  },
    { label: 'Experience',       value: learner.experience || '—',               color: C.yellow },
    { label: 'Skills Tracked',   value: `${learner.skills?.length ?? 0}`,        color: C.purple },
  ]
  const cW = 43, cH = 20, cGap = 2
  cards.forEach((c, i) => {
    const cx = 14 + i * (cW + cGap)
    doc.setFillColor(...C.light)
    doc.roundedRect(cx, y, cW, cH, 2, 2, 'F')
    doc.setDrawColor(...c.color)
    doc.setLineWidth(0.5)
    doc.roundedRect(cx, y, cW, cH, 2, 2, 'S')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.text(c.label.toUpperCase(), cx + 3, y + 6)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...c.color)
    const val = String(c.value)
    doc.text(val.length > 17 ? val.slice(0, 16) + '…' : val, cx + 3, y + 15)
  })
  y += cH + 12

  // ── 1. Skill Profile ───────────────────────────────────────────────────
  y = sectionHeader(doc, '1.  Skill Profile — Knowledge State', y)

  const skills = learner.skills || []
  skills.forEach(s => {
    y = checkPage(doc, y, 8)
    const mastery  = s.mastery  ?? 0
    const required = s.required ?? 0.7
    const pct      = Math.round(mastery * 100)
    const color    = masteryColor(mastery)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.text)
    doc.text(s.name, 14, y)

    drawBar(doc, 68, y - 3.5, 104, 4, mastery, color)

    // required marker
    const reqX = 68 + 104 * required
    doc.setDrawColor(...C.muted)
    doc.setLineWidth(0.25)
    doc.line(reqX, y - 4.5, reqX, y + 1)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text(`${pct}%`, 176, y)
    doc.setTextColor(...C.muted)
    doc.text(`/${Math.round(required * 100)}%`, 183, y)
    y += 7
  })
  y += 4

  // ── 2. Evidence of Mastery ────────────────────────────────────────────
  y = checkPage(doc, y, 50)
  y = sectionHeader(doc, '2.  Evidence of Mastery', y)

  const em = learner.evidenceOfMastery || {}
  const emRows = [
    ['Course Completion', em.course  ?? 0],
    ['Quiz Performance',  em.quiz    ?? 0],
    ['Coding Exercises',  em.coding  ?? 0],
    ['Projects',          em.project ?? 0],
  ]
  const weighted = Math.round(
    (em.course ?? 0) * 0.2 + (em.quiz ?? 0) * 0.35 +
    (em.coding ?? 0) * 0.25 + (em.project ?? 0) * 0.2
  )

  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Evidence Type', 'Score', 'Visual Bar']],
    body: emRows.map(([label, val]) => [label, `${val}%`, '']),
    headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: C.text },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 18 }, 2: { cellWidth: 108 } },
    didDrawCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const val = (emRows[data.row.index][1]) / 100
        drawBar(doc, data.cell.x + 2, data.cell.y + 2.5, 102, 3, val, C.brand)
      }
    },
  })
  y = doc.lastAutoTable.finalY + 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.green)
  doc.text(`Weighted Mastery Estimate: ${weighted}%`, 14, y)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...C.muted)
  doc.text('Course completion ≠ mastery — score is evidence-weighted across all activity types', 80, y)
  y += 10

  // ── 3. Learning Roadmap ───────────────────────────────────────────────
  y = checkPage(doc, y, 50)
  y = sectionHeader(doc, '3.  Learning Roadmap', y)

  const roadmap = learner.roadmap || []
  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Phase', 'Title', 'Progress', 'Status', 'Skills']],
    body: roadmap.map(p => [
      p.phase || '',
      p.title || '',
      `${p.progress ?? 0}%`,
      p.status === 'locked'      ? 'Locked'       :
      p.status === 'in_progress' ? 'In Progress'  : 'Complete',
      (p.skills || []).join(', '),
    ]),
    headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: C.text },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 86 },
    },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const v = String(data.cell.raw)
        if (v === 'Locked')      data.cell.styles.textColor = C.red
        if (v === 'In Progress') data.cell.styles.textColor = C.brand
        if (v === 'Complete')    data.cell.styles.textColor = C.green
      }
    },
  })
  y = doc.lastAutoTable.finalY + 8

  // ── 4. Top Skill Gaps ─────────────────────────────────────────────────
  const gaps = skills
    .filter(s => s.required > s.mastery)
    .sort((a, b) => (b.required - b.mastery) - (a.required - a.mastery))
    .slice(0, 8)

  if (gaps.length) {
    y = checkPage(doc, y, 50)
    y = sectionHeader(doc, '4.  Top Skill Gaps (Priority Order)', y)
    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Skill', 'Current', 'Required', 'Gap', 'Priority']],
      body: gaps.map((s, i) => [
        s.name,
        `${Math.round(s.mastery * 100)}%`,
        `${Math.round(s.required * 100)}%`,
        `${Math.round((s.required - s.mastery) * 100)}%`,
        i < 2 ? 'High' : i < 5 ? 'Medium' : 'Low',
      ]),
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didParseCell: (data) => {
        if (data.column.index === 4 && data.section === 'body') {
          const v = String(data.cell.raw)
          if (v === 'High')   data.cell.styles.textColor = C.red
          if (v === 'Medium') data.cell.styles.textColor = C.yellow
          if (v === 'Low')    data.cell.styles.textColor = C.green
        }
      },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── 5. Knowledge Decay ────────────────────────────────────────────────
  const decay = learner.decayAlerts || []
  if (decay.length) {
    y = checkPage(doc, y, 40)
    y = sectionHeader(doc, '5.  Knowledge Decay Alerts', y)
    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Skill', 'Days Since Practice', 'Est. Retention', 'Action']],
      body: decay.map(a => [
        a.skill,
        `${a.daysSince} days`,
        `${a.retention}%`,
        a.retention < 40 ? 'Urgent revision needed' : 'Schedule review soon',
      ]),
      headStyles: { fillColor: C.dark, textColor: C.white, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: C.text },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          const v = parseInt(data.cell.raw)
          data.cell.styles.textColor = v < 40 ? C.red : C.yellow
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── 6. AI Path Adaptations ────────────────────────────────────────────
  const adaptations = learner.adaptationHistory || []
  if (adaptations.length) {
    y = checkPage(doc, y, 50)
    y = sectionHeader(doc, '6.  AI Path Adaptations', y)
    adaptations.forEach((a, idx) => {
      y = checkPage(doc, y, 40)
      doc.setFillColor(240, 242, 255)
      doc.roundedRect(14, y, pageW - 28, 6, 1, 1, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.brand)
      doc.text(`Adaptation ${idx + 1}  —  ${a.trigger || ''}`, 17, y + 4.3)
      y += 9

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...C.text)
      const lines = doc.splitTextToSize(a.reason || '', pageW - 30)
      lines.forEach(line => {
        y = checkPage(doc, y, 6)
        doc.text(line, 14, y)
        y += 4.5
      })
      y += 4
    })
  }

  // ── 7. Next Best Action ───────────────────────────────────────────────
  const na = learner.nextAction
  if (na?.title) {
    y = checkPage(doc, y, 35)
    y = sectionHeader(doc, '7.  Next Best Action', y)

    doc.setFillColor(242, 244, 255)
    doc.roundedRect(14, y, pageW - 28, 24, 2, 2, 'F')
    doc.setDrawColor(...C.brand)
    doc.setLineWidth(0.4)
    doc.roundedRect(14, y, pageW - 28, 24, 2, 2, 'S')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.brand)
    doc.text(`${na.title}`, 18, y + 9)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.text)
    const naLines = doc.splitTextToSize(na.reason || '', pageW - 40)
    naLines.slice(0, 2).forEach((line, i) => doc.text(line, 18, y + 16 + i * 4.5))
    y += 30
  }

  // ── Footer on every page ──────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(210, 215, 230)
    doc.setLineWidth(0.2)
    doc.line(14, pageH - 10, pageW - 14, pageH - 10)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.text('SkillPilot AI — Confidential Learner Report', 14, pageH - 5)
    doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 5, { align: 'right' })
    doc.text(now, pageW / 2, pageH - 5, { align: 'center' })
  }

  // ── Download ──────────────────────────────────────────────────────────
  const safeName = (learner.name || 'learner').replace(/\s+/g, '_')
  const dateStr  = new Date().toISOString().slice(0, 10)
  doc.save(`SkillPilot_Report_${safeName}_${dateStr}.pdf`)
}
