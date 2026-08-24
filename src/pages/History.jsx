import { useState, useEffect, useMemo } from 'react'
import { getDatabases, getConfig, Query, OPERATORS, STATUS_LABELS, MONTHS, entryName, fmtAmt } from '../lib/appwrite'
import ColumnPicker from '../components/ColumnPicker'
import SortControls from '../components/SortControls'
import { exportAllCSV, exportAllPDF, ALL_COLUMNS } from '../lib/export'

const STATUS_PILL = {
  missing: 'pill-missing', pending: 'pill-pending',
  processing: 'pill-processing', paid: 'pill-paid',
}
const OP_COLOR = { mauritel: 'text-mauritel', rimatel: 'text-rimatel', mattel: 'text-mattel' }

const HEADER_COLS = [
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
  period:   (r) => r.row.year * 100 + r.row.month,
  operator: (r) => r.op?.name ?? r.row.operator_id,
  entry:    (r) => r.entry ? entryName(r.entry) : r.row.entry_id,
  status:   (r) => r.row.status,
  mode:     (r) => r.row.pay_mode || '',
  payDate:  (r) => r.row.pay_date || '',
  docs:     (r) => r.docCount,
  amount:   (r) => parseFloat(r.row.amount) || 0,
}

export default function History({ onToast }) {
  const now = new Date()
  const [opFilter,     setOpFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [yearFilter,   setYearFilter]   = useState(now.getFullYear())
  const [search,       setSearch]       = useState('')
  const [sortField,    setSortField]    = useState('period')
  const [sortDir,      setSortDir]      = useState('desc')
  const [sortField2,   setSortField2]   = useState(null)
  const [sortDir2,     setSortDir2]     = useState('asc')
  const [rows,         setRows]         = useState([])
  const [docCounts,    setDocCounts]    = useState({})
  const [loading,      setLoading]      = useState(false)
  const [exportCols,   setExportCols]   = useState(ALL_COLUMNS.map(c => c.key))

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

  // Adapte la forme des lignes de l'historique à celle attendue par lib/export.js
  function toExportRows(list) {
    return list.map(({ row, op, entry, docCount }) => ({
      op, e: entry, inv: row, docs: Array.from({ length: docCount }),
    }))
  }

  function doExportCSV() {
    if (displayRows.length === 0) { onToast('Aucune facture à exporter.', 'info'); return }
    if (exportCols.length === 0) { onToast('Sélectionnez au moins une colonne.', 'info'); return }
    exportAllCSV(toExportRows(displayRows), exportCols, 'historique_factures')
    onToast('Export CSV téléchargé.', 'ok')
  }

  function doExportPDF() {
    if (displayRows.length === 0) { onToast('Aucune facture à exporter.', 'info'); return }
    if (exportCols.length === 0) { onToast('Sélectionnez au moins une colonne.', 'info'); return }
    exportAllPDF(toExportRows(displayRows), exportCols, 'historique_factures', `Historique des factures (${displayRows.length})`)
    onToast('Export PDF téléchargé.', 'ok')
  }

  const displayRows = useMemo(() => {
    let list = rows.map(row => {
      const op    = OPERATORS.find(o => o.id === row.operator_id)
      const entry = op?.entries.find(e => e.id === row.entry_id)
      return { row, op, entry, docCount: docCounts[row.$id] || 0 }
    })

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(({ row, op, entry }) => {
        const haystack = [
          op?.name,
          entry ? entryName(entry) : row.entry_id,
          row.pay_mode,
          row.notes,
          row.amount != null ? String(row.amount) : '',
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    const getter  = SORT_GETTERS[sortField] || SORT_GETTERS.period
    const getter2 = sortField2 ? SORT_GETTERS[sortField2] : null
    list = [...list].sort((a, b) => {
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
    return list
  }, [rows, docCounts, search, sortField, sortDir, sortField2, sortDir2])

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
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
        <input
          type="text"
          className="field-input w-auto min-w-[220px]"
          placeholder="Rechercher (site, notes, mode…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="text-[11px] text-t3">{displayRows.length} facture{displayRows.length !== 1 ? 's' : ''}</span>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <SortControls
            fields={HEADER_COLS}
            sortField={sortField} sortDir={sortDir}
            onFieldChange={key => { setSortField(key); if (sortField2 === key) setSortField2(null) }}
            onDirToggle={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            sortField2={sortField2} sortDir2={sortDir2}
            onField2Change={setSortField2}
            onDir2Toggle={() => setSortDir2(d => d === 'asc' ? 'desc' : 'asc')}
          />
          <ColumnPicker columns={ALL_COLUMNS} selected={exportCols} onToggle={toggleExportCol} />
          <button className="btn btn-sm" onClick={doExportCSV}>↓ CSV</button>
          <button className="btn btn-sm" onClick={doExportPDF}>↓ PDF</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-xs">
          <thead>
            <tr>
              {HEADER_COLS.map(col => (
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
            {displayRows.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-t3 py-8">Aucune facture pour cette période.</td></tr>
            ) : displayRows.map(({ row, op, entry, docCount }) => (
              <tr key={row.$id} className="hover:bg-card border-b border-border">
                <td className="px-3 py-[10px] text-t2">{MONTHS[row.month]} {row.year}</td>
                <td className={`px-3 py-[10px] font-medium ${OP_COLOR[row.operator_id]}`}>{op?.name || row.operator_id}</td>
                <td className="px-3 py-[10px] text-t2">{entry ? entryName(entry) : row.entry_id}</td>
                <td className="px-3 py-[10px]"><span className={`pill ${STATUS_PILL[row.status]}`}>{STATUS_LABELS[row.status]}</span></td>
                <td className="px-3 py-[10px] text-t2">{row.pay_mode ? (row.pay_mode === 'virement' ? '⇄ Virement' : '☑ Chèque') : '—'}</td>
                <td className="px-3 py-[10px] text-t2">{row.pay_date ? new Date(row.pay_date).toLocaleDateString('fr') : '—'}</td>
                <td className="px-3 py-[10px] text-center text-t2">{docCount > 0 ? `📎 ${docCount}` : '—'}</td>
                <td className="px-3 py-[10px] text-right font-mono text-text">{row.amount ? fmtAmt(row.amount)+' MRU' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
