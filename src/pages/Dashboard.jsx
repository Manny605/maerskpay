import { useState, useEffect, useCallback, useMemo } from 'react'
import { getDatabases, getConfig, Query, OPERATORS, STATUS_LABELS, MONTHS, entryName, fmtAmt } from '../lib/appwrite'
import DetailPanel from '../components/DetailPanel'
import ColumnPicker from '../components/ColumnPicker'
import SortControls from '../components/SortControls'
import { exportCSV, exportPDF, exportAllCSV, exportAllPDF, ALL_COLUMNS } from '../lib/export'

const SORT_FIELDS = [
  { key: 'period',   label: 'Période' },
  { key: 'operator', label: 'Opérateur' },
  { key: 'entry',    label: 'Site / Entité' },
  { key: 'status',   label: 'Statut' },
  { key: 'mode',     label: 'Mode' },
  { key: 'payDate',  label: 'Date paiement' },
  { key: 'docs',     label: 'Docs' },
  { key: 'amount',   label: 'Montant' },
]

const SORT_GETTERS = {
  period:   (r) => r.inv.year * 100 + r.inv.month,
  operator: (r) => r.op?.name ?? r.inv.operator_id,
  entry:    (r) => r.e ? entryName(r.e) : r.inv.entry_id,
  status:   (r) => r.inv.status,
  mode:     (r) => r.inv.pay_mode || '',
  payDate:  (r) => r.inv.pay_date || '',
  docs:     (r) => r.docs.length,
  amount:   (r) => parseFloat(r.inv.amount) || 0,
}

const STATUS_PILL = {
  missing:    'pill-missing',
  pending:    'pill-pending',
  processing: 'pill-processing',
  paid:       'pill-paid',
}

const OP_STRIPE = {
  mauritel: 'bg-mauritel',
  rimatel:  'bg-rimatel',
  mattel:   'bg-mattel',
}
const OP_NAME_COLOR = {
  mauritel: 'text-mauritel',
  rimatel:  'text-rimatel',
  mattel:   'text-mattel',
}

export default function Dashboard({ onToast }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year,  setYear]  = useState(now.getFullYear())
  const [invoiceCache, setInvoiceCache] = useState({})
  const [docsCache,    setDocsCache]    = useState({})
  const [loading, setLoading] = useState(false)
  const [active,  setActive]  = useState(null) // { op, entry }
  const [allRows,    setAllRows]    = useState([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [statusFilter,  setStatusFilter]  = useState('')
  const [opFilter,      setOpFilter]      = useState('')
  const [sortField,     setSortField]     = useState('period')
  const [sortDir,       setSortDir]       = useState('desc')
  const [sortField2,    setSortField2]    = useState(null)
  const [sortDir2,      setSortDir2]      = useState('asc')
  const [exportCols,    setExportCols]    = useState(ALL_COLUMNS.map(c => c.key))

  function cKey(opId, entryId) { return `${opId}__${entryId}__${month}__${year}` }
  function getInv(opId, entryId) { return invoiceCache[cKey(opId, entryId)] || null }
  function getDocs(opId, entryId) { return docsCache[cKey(opId, entryId)] || [] }

  const load = useCallback(async () => {
    setLoading(true)
    const cfg = getConfig()
    const db  = getDatabases()
    const emptyInv = {}, emptyDocs = {}
    OPERATORS.forEach(op => op.entries.forEach(e => {
      emptyInv[`${op.id}__${e.id}__${month}__${year}`]  = null
      emptyDocs[`${op.id}__${e.id}__${month}__${year}`] = []
    }))
    try {
      const res = await db.listDocuments(cfg.databaseId, 'invoices', [
        Query.equal('month', month),
        Query.equal('year',  year),
        Query.limit(25),
      ])
      const ids = []
      res.documents.forEach(doc => {
        const k = `${doc.operator_id}__${doc.entry_id}__${doc.month}__${doc.year}`
        emptyInv[k] = doc
        ids.push(doc.$id)
      })
      if (ids.length > 0) {
        const dRes = await db.listDocuments(cfg.databaseId, 'invoice_docs', [
          Query.equal('invoice_id', ids),
          Query.limit(100),
        ])
        dRes.documents.forEach(d => {
          OPERATORS.forEach(op => op.entries.forEach(e => {
            const k = `${op.id}__${e.id}__${month}__${year}`
            if (emptyInv[k]?.$id === d.invoice_id) {
              emptyDocs[k] = [...(emptyDocs[k] || []), d]
            }
          }))
        })
      }
      setInvoiceCache({ ...emptyInv })
      setDocsCache({ ...emptyDocs })
    } catch (e) {
      if (e.code !== 404) onToast('Erreur chargement : ' + e.message, 'err')
      setInvoiceCache({ ...emptyInv })
      setDocsCache({ ...emptyDocs })
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const loadAll = useCallback(async () => {
    setLoadingAll(true)
    const cfg = getConfig()
    const db  = getDatabases()
    try {
      const res = await db.listDocuments(cfg.databaseId, 'invoices', [
        Query.orderDesc('year'),
        Query.limit(500),
      ])
      const docsByInvoice = {}
      if (res.documents.length > 0) {
        const dRes = await db.listDocuments(cfg.databaseId, 'invoice_docs', [
          Query.equal('invoice_id', res.documents.map(d => d.$id)),
          Query.limit(500),
        ])
        dRes.documents.forEach(d => {
          docsByInvoice[d.invoice_id] = [...(docsByInvoice[d.invoice_id] || []), d]
        })
      }
      const rows = res.documents
        .slice()
        .sort((a, b) => b.year - a.year || b.month - a.month)
        .map(inv => {
          const op = OPERATORS.find(o => o.id === inv.operator_id)
          const e  = op?.entries.find(x => x.id === inv.entry_id)
          return { op, e, inv, docs: docsByInvoice[inv.$id] || [] }
        })
      setAllRows(rows)
    } catch (e) {
      if (e.code !== 404) onToast('Erreur chargement liste globale : ' + e.message, 'err')
      setAllRows([])
    } finally {
      setLoadingAll(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const sortedFilteredRows = useMemo(() => {
    let rows = allRows
    if (statusFilter) rows = rows.filter(r => r.inv.status === statusFilter)
    if (opFilter)     rows = rows.filter(r => r.inv.operator_id === opFilter)
    const getter  = SORT_GETTERS[sortField] || SORT_GETTERS.period
    const getter2 = sortField2 ? SORT_GETTERS[sortField2] : null
    rows = [...rows].sort((a, b) => {
      const va = getter(a), vb = getter(b)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      if (getter2) {
        const va2 = getter2(a), vb2 = getter2(b)
        if (va2 < vb2) return sortDir2 === 'asc' ? -1 : 1
        if (va2 > vb2) return sortDir2 === 'asc' ? 1 : -1
      }
      return 0
    })
    return rows
  }, [allRows, statusFilter, opFilter, sortField, sortDir, sortField2, sortDir2])

  function toggleSort(key) {
    if (sortField === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(key); setSortDir('asc')
      if (sortField2 === key) setSortField2(null)
    }
  }

  function toggleExportCol(key) {
    setExportCols(cols => cols.includes(key) ? cols.filter(k => k !== key) : [...cols, key])
  }

  function changeMonth(delta) {
    setActive(null)
    setMonth(m => {
      let nm = m + delta, ny = year
      if (nm > 11) { nm = 0; ny++ }
      if (nm < 0)  { nm = 11; ny-- }
      setYear(ny)
      return nm
    })
  }

  function handleSaved(savedDoc, newDocs) {
    const k = cKey(active.op.id, active.entry.id)
    setInvoiceCache(c => ({ ...c, [k]: savedDoc }))
    setDocsCache(d => ({ ...d, [k]: newDocs }))
    onToast('Facture enregistrée.', 'ok')
    loadAll()
  }

  // Stats
  let total=0, missing=0, pending=0, paid=0, totalAmt=0
  OPERATORS.forEach(op => op.entries.forEach(e => {
    total++
    const s = getInv(op.id, e.id)?.status || 'missing'
    if (s === 'missing') missing++
    if (s === 'pending') pending++
    if (s === 'paid') { paid++; const a = getInv(op.id, e.id)?.amount; if (a) totalAmt += parseFloat(a) }
  }))

  // Alerts
  const today = new Date()
  const dom = today.getDate()
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear()
  const isOldMonth = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth())
  const alerts = []
  OPERATORS.forEach(op => op.entries.forEach(e => {
    const s = getInv(op.id, e.id)?.status || 'missing'
    const lbl = `${op.name} · ${entryName(e)}`
    if (s === 'missing' && isCurrentMonth && dom > 10)
      alerts.push({ type: 'danger',  msg: `${lbl} — facture ${MONTHS[month]} non reçue (J+${dom})` })
    if (isOldMonth && s !== 'paid')
      alerts.push({ type: 'warning', msg: `${lbl} — ${MONTHS[month]} ${year} : ${STATUS_LABELS[s]}` })
    if (s === 'processing')
      alerts.push({ type: 'info',    msg: `${lbl} — paiement en cours, en attente de confirmation` })
  }))

  const [dismissedAlerts, setDismissedAlerts] = useState([])
  const visibleAlerts = alerts.filter((_, i) => !dismissedAlerts.includes(i))

  const ALERT_STYLE = {
    danger:  'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/25 dark:text-red-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-300',
    info:    'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/25 dark:text-blue-300',
  }

  function doExportCSV() {
    const rows = OPERATORS.flatMap(op => op.entries.map(e => {
      const inv  = getInv(op.id, e.id)
      const docs = getDocs(op.id, e.id)
      return { op, e, inv, docs }
    }))
    exportCSV(rows, month, year)
    onToast('Export CSV téléchargé.', 'ok')
  }

  function doExportPDF() {
    const rows = OPERATORS.flatMap(op => op.entries.map(e => ({
      op, e, inv: getInv(op.id, e.id), docs: getDocs(op.id, e.id)
    })))
    exportPDF(rows, month, year, { total, missing, pending, paid })
    onToast('Export PDF téléchargé.', 'ok')
  }

  function doExportAllCSV() {
    if (sortedFilteredRows.length === 0) { onToast('Aucune facture à exporter.', 'info'); return }
    if (exportCols.length === 0) { onToast('Sélectionnez au moins une colonne.', 'info'); return }
    exportAllCSV(sortedFilteredRows, exportCols)
    onToast('Export CSV (toutes factures) téléchargé.', 'ok')
  }

  function doExportAllPDF() {
    if (sortedFilteredRows.length === 0) { onToast('Aucune facture à exporter.', 'info'); return }
    if (exportCols.length === 0) { onToast('Sélectionnez au moins une colonne.', 'info'); return }
    exportAllPDF(sortedFilteredRows, exportCols)
    onToast('Export PDF (toutes factures) téléchargé.', 'ok')
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {loading && (
        <div className="fixed inset-0 bg-bg/80 z-[200] flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
          <span className="text-xs text-t3">Chargement…</span>
        </div>
      )}

      {/* Month bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button className="btn" onClick={() => changeMonth(-1)}>←</button>
          <div className="font-display text-xl font-semibold text-heading min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </div>
          <button className="btn" onClick={() => changeMonth(1)}>→</button>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={doExportCSV}>↓ CSV</button>
          <button className="btn btn-sm" onClick={doExportPDF}>↓ PDF</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[10px] mb-5">
        {[
          { label: 'Factures du mois',      value: total,   sub: `${MONTHS[month]} ${year}`,                        color: 'text-text' },
          { label: 'Non reçues',             value: missing, sub: 'à relancer opérateur',                            color: 'text-red-600 dark:text-red-400' },
          { label: 'Reçues — non payées',    value: pending, sub: 'à régler',                                        color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Payées',                 value: paid,    sub: totalAmt > 0 ? fmtAmt(totalAmt)+' MRU' : 'ce mois-ci', color: 'text-green-600 dark:text-green-400' },
        ].map(({ label, value, sub, color }, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-4 anim-fadeup" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="text-[10px] text-t3 uppercase tracking-widest mb-1">{label}</div>
            <div className={`font-display text-[28px] font-semibold leading-none ${color}`}>{value}</div>
            <div className="text-[10px] text-t3 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {visibleAlerts.length > 0 && (
        <div className="flex flex-col gap-[6px] mb-5">
          {visibleAlerts.map((a, i) => (
            <div key={i} className={`flex items-center justify-between px-[14px] py-[10px] rounded-lg border anim-fadeup ${ALERT_STYLE[a.type]}`}>
              <span className="text-xs">{a.msg}</span>
              <button onClick={() => setDismissedAlerts(d => [...d, alerts.indexOf(a)])} className="text-t3 hover:text-t2 text-base ml-2">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Operators */}
      <div className="grid grid-cols-3 gap-3">
        {OPERATORS.map((op, oi) => {
          const paidCount = op.entries.filter(e => getInv(op.id, e.id)?.status === 'paid').length
          return (
            <div key={op.id} className="bg-surface border border-border rounded-2xl overflow-hidden anim-fadeup"
              style={{ animationDelay: `${0.08 + oi * 0.06}s` }}>
              <div className={`h-[2px] ${OP_STRIPE[op.id]}`} />
              <div className="flex items-center justify-between px-[14px] py-3 border-b border-border">
                <span className={`font-display text-[15px] font-normal ${OP_NAME_COLOR[op.id]}`}>{op.name}</span>
                <span className="text-[10px] text-t3">{paidCount}/{op.entries.length} payées</span>
              </div>
              <div className="p-2">
                {op.entries.map(entry => {
                  const inv    = getInv(op.id, entry.id)
                  const status = inv?.status || 'missing'
                  const docs   = getDocs(op.id, entry.id)
                  const isActive = active?.op.id === op.id && active?.entry.id === entry.id
                  return (
                    <div key={entry.id}
                      onClick={() => setActive({ op, entry })}
                      className={`flex items-center justify-between px-[10px] py-[9px] rounded-lg cursor-pointer mb-[3px]
                                  border transition-all ${isActive ? 'bg-card border-border-hi' : 'border-transparent hover:bg-card-hover hover:border-border'}`}>
                      <div className="flex flex-col gap-[2px]">
                        <span className="text-xs text-text">{entryName(entry)}</span>
                      </div>
                      <div className="flex items-center gap-[6px]">
                        {docs.length > 0 && <span className="text-[10px] text-t3">📎 {docs.length}</span>}
                        {inv?.amount && <span className="text-[11px] text-t2">{fmtAmt(inv.amount)} MRU</span>}
                        <span className={`pill ${STATUS_PILL[status]}`}>{STATUS_LABELS[status]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* All invoices — exportable list */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mt-5 anim-fadeup">
        <div className="flex items-center justify-between px-[14px] py-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-[15px] font-semibold text-heading">Toutes les factures</span>
            <span className="text-[10px] text-t3">({sortedFilteredRows.length})</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="field-input w-auto" value={opFilter} onChange={e => setOpFilter(e.target.value)}>
              <option value="">Tous les opérateurs</option>
              {OPERATORS.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
            <select className="field-input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            <SortControls
              fields={SORT_FIELDS}
              sortField={sortField} sortDir={sortDir}
              onFieldChange={key => { setSortField(key); if (sortField2 === key) setSortField2(null) }}
              onDirToggle={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              sortField2={sortField2} sortDir2={sortDir2}
              onField2Change={setSortField2}
              onDir2Toggle={() => setSortDir2(d => d === 'asc' ? 'desc' : 'asc')}
            />

            <ColumnPicker columns={ALL_COLUMNS} selected={exportCols} onToggle={toggleExportCol} />

            <button className="btn btn-sm" onClick={doExportAllCSV}>↓ CSV</button>
            <button className="btn btn-sm" onClick={doExportAllPDF}>↓ PDF</button>
          </div>
        </div>

        <div className="overflow-auto max-h-[420px]">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {SORT_FIELDS.map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)}
                    className="text-left px-3 py-[10px] text-[10px] text-t3 uppercase tracking-widest border-b border-border bg-surface sticky top-0 cursor-pointer select-none hover:text-t2">
                    {col.label}
                    {sortField === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                    {sortField2 === col.key && (sortDir2 === 'asc' ? ' ²▲' : ' ²▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingAll ? (
                <tr><td colSpan={8} className="text-center text-t3 py-8">Chargement…</td></tr>
              ) : sortedFilteredRows.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-t3 py-8">Aucune facture enregistrée.</td></tr>
              ) : sortedFilteredRows.map(({ op, e, inv, docs }) => (
                <tr key={inv.$id} className="hover:bg-card border-b border-border">
                  <td className="px-3 py-[10px] text-t2">{MONTHS[inv.month]} {inv.year}</td>
                  <td className={`px-3 py-[10px] font-medium ${OP_NAME_COLOR[inv.operator_id] || ''}`}>{op?.name || inv.operator_id}</td>
                  <td className="px-3 py-[10px] text-t2">{e ? entryName(e) : inv.entry_id}</td>
                  <td className="px-3 py-[10px]"><span className={`pill ${STATUS_PILL[inv.status]}`}>{STATUS_LABELS[inv.status]}</span></td>
                  <td className="px-3 py-[10px] text-t2">{inv.pay_mode ? (inv.pay_mode === 'virement' ? '⇄ Virement' : '☑ Chèque') : '—'}</td>
                  <td className="px-3 py-[10px] text-t2">{inv.pay_date ? new Date(inv.pay_date).toLocaleDateString('fr') : '—'}</td>
                  <td className="px-3 py-[10px] text-center text-t2">{docs.length > 0 ? `📎 ${docs.length}` : '—'}</td>
                  <td className="px-3 py-[10px] text-right font-mono text-text">{inv.amount ? fmtAmt(inv.amount)+' MRU' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {active && (
        <DetailPanel
          op={active.op}
          entry={active.entry}
          month={month}
          year={year}
          invoice={getInv(active.op.id, active.entry.id)}
          docs={getDocs(active.op.id, active.entry.id)}
          onSaved={handleSaved}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}
