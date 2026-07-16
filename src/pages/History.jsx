import { useState, useEffect } from 'react'
import { getDatabases, getConfig, Query, OPERATORS, STATUS_LABELS, MONTHS, entryName, fmtAmt } from '../lib/appwrite'

const STATUS_PILL = {
  missing: 'pill-missing', pending: 'pill-pending',
  processing: 'pill-processing', paid: 'pill-paid',
}
const OP_COLOR = { mauritel: 'text-mauritel', rimatel: 'text-rimatel', mattel: 'text-mattel' }

export default function History({ onToast }) {
  const now = new Date()
  const [opFilter,     setOpFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [yearFilter,   setYearFilter]   = useState(now.getFullYear())
  const [rows,         setRows]         = useState([])
  const [docCounts,    setDocCounts]    = useState({})
  const [loading,      setLoading]      = useState(false)

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i)

  async function load() {
    setLoading(true)
    const cfg = getConfig()
    const db  = getDatabases()
    try {
      const queries = [
        Query.equal('year', yearFilter),
        Query.orderDesc('month'),
        Query.limit(100),
      ]
      if (opFilter)     queries.push(Query.equal('operator_id', opFilter))
      if (statusFilter) queries.push(Query.equal('status', statusFilter))

      const res = await db.listDocuments(cfg.databaseId, 'invoices', queries)
      setRows(res.documents)

      if (res.documents.length > 0) {
        const ids = res.documents.map(r => r.$id)
        const dRes = await db.listDocuments(cfg.databaseId, 'invoice_docs', [
          Query.equal('invoice_id', ids.slice(0, 25)),
          Query.limit(200),
        ])
        const counts = {}
        dRes.documents.forEach(d => { counts[d.invoice_id] = (counts[d.invoice_id] || 0) + 1 })
        setDocCounts(counts)
      } else {
        setDocCounts({})
      }
    } catch (e) {
      onToast('Erreur : ' + e.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [opFilter, statusFilter, yearFilter])

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {loading && (
        <div className="fixed inset-0 bg-bg/80 z-[200] flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
          <span className="text-xs text-t3">Chargement…</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 items-center flex-wrap">
        <span className="text-[11px] text-t3">Filtrer :</span>
        <select className="field-input w-auto" value={opFilter} onChange={e => setOpFilter(e.target.value)}>
          <option value="">Tous les opérateurs</option>
          {OPERATORS.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
        </select>
        <select className="field-input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="field-input w-auto" value={yearFilter} onChange={e => setYearFilter(parseInt(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {['Période','Opérateur','Site / Entité','Statut','Mode','Date paiement','Docs','Montant'].map((h, i) => (
                <th key={i} className="text-left px-3 py-[10px] text-[10px] text-t3 uppercase tracking-widest border-b border-border bg-surface sticky top-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-t3 py-8">Aucune facture pour cette période.</td></tr>
            ) : rows.map(row => {
              const op    = OPERATORS.find(o => o.id === row.operator_id)
              const entry = op?.entries.find(e => e.id === row.entry_id)
              const cnt   = docCounts[row.$id] || 0
              return (
                <tr key={row.$id} className="hover:bg-card border-b border-border">
                  <td className="px-3 py-[10px] text-t2">{MONTHS[row.month]} {row.year}</td>
                  <td className={`px-3 py-[10px] font-medium ${OP_COLOR[row.operator_id]}`}>{op?.name || row.operator_id}</td>
                  <td className="px-3 py-[10px] text-t2">{entry ? entryName(entry) : row.entry_id}</td>
                  <td className="px-3 py-[10px]"><span className={`pill ${STATUS_PILL[row.status]}`}>{STATUS_LABELS[row.status]}</span></td>
                  <td className="px-3 py-[10px] text-t2">{row.pay_mode ? (row.pay_mode === 'virement' ? '⇄ Virement' : '☑ Chèque') : '—'}</td>
                  <td className="px-3 py-[10px] text-t2">{row.pay_date ? new Date(row.pay_date).toLocaleDateString('fr') : '—'}</td>
                  <td className="px-3 py-[10px] text-center text-t2">{cnt > 0 ? `📎 ${cnt}` : '—'}</td>
                  <td className="px-3 py-[10px] text-right font-mono text-text">{row.amount ? fmtAmt(row.amount)+' MRU' : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
