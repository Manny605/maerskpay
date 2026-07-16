import { useState, useEffect, useCallback } from 'react'
import { getDatabases, getConfig, Query, OPERATORS, STATUS_LABELS, MONTHS, entryName, fmtAmt } from '../lib/appwrite'
import DetailPanel from '../components/DetailPanel'
import { exportCSV, exportPDF } from '../lib/export'

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
    danger:  'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
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
          <div className="font-display text-xl font-semibold text-navy min-w-[160px] text-center">
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
          { label: 'Non reçues',             value: missing, sub: 'à relancer opérateur',                            color: 'text-red-600' },
          { label: 'Reçues — non payées',    value: pending, sub: 'à régler',                                        color: 'text-amber-600' },
          { label: 'Payées',                 value: paid,    sub: totalAmt > 0 ? fmtAmt(totalAmt)+' MRU' : 'ce mois-ci', color: 'text-green-600' },
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
