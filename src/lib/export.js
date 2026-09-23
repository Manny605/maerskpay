import { MONTHS, STATUS_LABELS, entryName, fmtAmt } from './supabase'

export function exportCSV(rows, month, year) {
  const headers = ['Opérateur','Site/Entité','Mois','Année','Statut','Montant (MRU)','Mode paiement','Date paiement','Nb documents','Notes']
  const data = rows.map(({ op, e, inv, docs }) => [
    op.name,
    entryName(e),
    MONTHS[month],
    year,
    STATUS_LABELS[inv?.status || 'missing'],
    inv?.amount ?? '',
    inv?.pay_mode ?? '',
    inv?.pay_date ?? '',
    docs.length,
    (inv?.notes ?? '').replace(/,/g, ';'),
  ])
  const csv  = [headers, ...data].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a    = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `factures_${MONTHS[month]}_${year}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// Colonnes disponibles pour la liste "Toutes les factures" — source unique
// utilisée pour le sélecteur de colonnes (Dashboard) et les deux exports.
export const ALL_COLUMNS = [
  { key: 'period',   label: 'Période',        width: 24,
    csv: ({ inv }) => `${MONTHS[inv.month]} ${inv.year}`,
    pdf: ({ inv }) => `${MONTHS[inv.month].slice(0, 3)} ${inv.year}` },
  { key: 'operator', label: 'Opérateur',       width: 30,
    csv: ({ op, inv }) => op?.name ?? inv.operator_id,
    pdf: ({ op, inv }) => op?.name ?? inv.operator_id },
  { key: 'entry',    label: 'Site / Entité',   width: 50,
    csv: ({ e, inv }) => e ? entryName(e) : inv.entry_id,
    pdf: ({ e, inv }) => e ? entryName(e) : inv.entry_id },
  { key: 'status',   label: 'Statut',          width: 26,
    csv: ({ inv }) => STATUS_LABELS[inv.status] ?? inv.status,
    pdf: ({ inv }) => STATUS_LABELS[inv.status] ?? inv.status },
  { key: 'mode',     label: 'Mode paiement',   width: 26,
    csv: ({ inv }) => inv.pay_mode ?? '',
    pdf: ({ inv }) => inv.pay_mode || '—' },
  { key: 'payDate',  label: 'Date paiement',   width: 32,
    csv: ({ inv }) => inv.pay_date ?? '',
    pdf: ({ inv }) => inv.pay_date ? new Date(inv.pay_date).toLocaleDateString('fr') : '—' },
  { key: 'docs',     label: 'Nb documents',    width: 15,
    csv: ({ docs }) => docs.length,
    pdf: ({ docs }) => String(docs.length) },
  { key: 'amount',   label: 'Montant (MRU)',   width: 32,
    csv: ({ inv }) => inv.amount ?? '',
    pdf: ({ inv }) => inv.amount ? fmtAmt(inv.amount) : '—' },
  { key: 'notes',    label: 'Notes',           width: 40,
    csv: ({ inv }) => (inv.notes ?? '').replace(/,/g, ';'),
    pdf: ({ inv }) => inv.notes || '—' },
]

const ALL_COLUMN_KEYS = ALL_COLUMNS.map(c => c.key)

export function exportAllCSV(rows, columnKeys = ALL_COLUMN_KEYS, filePrefix = 'toutes_factures') {
  const cols = ALL_COLUMNS.filter(c => columnKeys.includes(c.key))
  const headers = cols.map(c => c.label)
  const data = rows.map(row => cols.map(c => c.csv(row)))
  const csv  = [headers, ...data].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const a    = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportAllPDF(rows, columnKeys = ALL_COLUMN_KEYS, filePrefix = 'toutes_factures', reportTitle = `Toutes les factures (${rows.length})`) {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('MAERSK — Gestion Factures Télécom', 14, 16)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
    doc.text(`Rapport — ${reportTitle}`, 14, 23)
    doc.text('Généré le : ' + new Date().toLocaleDateString('fr'), 14, 29)
    doc.setTextColor(0)

    const cols   = ALL_COLUMNS.filter(c => columnKeys.includes(c.key))
    const pageW  = 262
    const totalW = cols.reduce((s, c) => s + c.width, 0) || 1
    const colW   = cols.map(c => (c.width / totalW) * pageW)

    let y = 38
    doc.setFillColor(10, 37, 64); doc.setTextColor(255, 255, 255)
    doc.rect(14, y, pageW, 7, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    let x = 16
    cols.forEach((c, i) => { doc.text(c.label, x, y + 5); x += colW[i] })
    y += 9; doc.setFont('helvetica', 'normal'); doc.setTextColor(0)

    rows.forEach((row, idx) => {
      if (y > 185) { doc.addPage(); y = 20 }
      if (idx % 2 === 0) { doc.setFillColor(245, 245, 248); doc.rect(14, y - 2, pageW, 7, 'F') }
      x = 16
      cols.forEach((c, i) => { doc.text(String(c.pdf(row)), x, y + 3); x += colW[i] })
      y += 7
    })

    doc.setFontSize(7); doc.setTextColor(150)
    doc.text('Maersk Mauritanie — Document confidentiel', 14, 200)
    doc.save(`${filePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`)
  })
}

export function exportPDF(rows, month, year, stats) {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('MAERSK — Gestion Factures Télécom', 14, 16)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
    doc.text(`Rapport — ${MONTHS[month]} ${year}`, 14, 23)
    doc.text('Généré le : ' + new Date().toLocaleDateString('fr'), 14, 29)
    doc.setTextColor(0)
    doc.setFontSize(9); doc.setTextColor(80)
    doc.text(`Non reçues: ${stats.missing}   Non payées: ${stats.pending}   Payées: ${stats.paid}`, 14, 36)
    doc.setTextColor(0)

    const cols = ['Opérateur','Site / Entité','Statut','Montant (MRU)','Mode','Date paiement','Docs']
    const colW = [30, 55, 28, 32, 28, 32, 15]
    let y = 46
    doc.setFillColor(30, 30, 35); doc.setTextColor(220, 220, 220)
    doc.rect(14, y, 262, 7, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    let x = 16
    cols.forEach((c, i) => { doc.text(c, x, y + 5); x += colW[i] })
    y += 9; doc.setFont('helvetica', 'normal'); doc.setTextColor(0)

    rows.forEach(({ op, e, inv, docs }, idx) => {
      const s = inv?.status || 'missing'
      if (y > 185) { doc.addPage(); y = 20 }
      if (idx % 2 === 0) { doc.setFillColor(245, 245, 248); doc.rect(14, y - 2, 262, 7, 'F') }
      x = 16
      const vals = [
        op.name, entryName(e), STATUS_LABELS[s],
        inv?.amount ? fmtAmt(inv.amount) : '—',
        inv?.pay_mode || '—',
        inv?.pay_date ? new Date(inv.pay_date).toLocaleDateString('fr') : '—',
        String(docs.length),
      ]
      vals.forEach((v, i) => { doc.text(String(v), x, y + 3); x += colW[i] })
      y += 7
    })

    doc.setFontSize(7); doc.setTextColor(150)
    doc.text('Maersk Mauritanie — Document confidentiel', 14, 200)
    doc.save(`rapport_factures_${MONTHS[month]}_${year}.pdf`)
  })
}
