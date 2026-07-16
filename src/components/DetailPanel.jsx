import { useState, useEffect } from 'react'
import { getDatabases, getStorage, getConfig, ID, DOC_LABELS, fmtAmt, STATUS_LABELS, docId } from '../lib/appwrite'

const DOC_PILL = { invoice: 'text-blue-700 bg-blue-50', payment: 'text-green-700 bg-green-50', cheque: 'text-amber-700 bg-amber-50' }

export default function DetailPanel({ op, entry, month, year, invoice, docs: initialDocs, onSaved, onClose }) {
  const [form, setForm] = useState({
    amount:   invoice?.amount   ?? '',
    status:   invoice?.status   ?? 'missing',
    payMode:  invoice?.pay_mode ?? '',
    payDate:  invoice?.pay_date ?? '',
    notes:    invoice?.notes    ?? '',
  })
  const [docs, setDocs]       = useState(initialDocs || [])
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [invoiceId, setInvoiceId] = useState(invoice?.$id || null)

  const cfg = getConfig()
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    setSaving(true)
    const db = getDatabases()
    const payload = {
      operator_id: op.id,
      entry_id:    entry.id,
      month,
      year,
      status:   form.status,
      amount:   parseFloat(form.amount) || null,
      pay_mode: form.payMode || null,
      pay_date: form.payDate || null,
      notes:    form.notes   || null,
    }
    try {
      const id = docId(op.id, entry.id, month, year)
      let saved
      try {
        saved = await db.updateDocument(cfg.databaseId, 'invoices', id, payload)
      } catch (e) {
        if (e.code === 404) saved = await db.createDocument(cfg.databaseId, 'invoices', id, payload)
        else throw e
      }
      setInvoiceId(saved.$id)
      onSaved(saved, docs)
      onClose()
    } catch (e) {
      alert('Erreur enregistrement : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function ensureInvoice() {
    if (invoiceId) return invoiceId
    const db = getDatabases()
    const id = docId(op.id, entry.id, month, year)
    const payload = {
      operator_id: op.id, entry_id: entry.id,
      month, year, status: form.status,
      amount: parseFloat(form.amount) || null,
      pay_mode: form.payMode || null,
      pay_date: form.payDate || null,
      notes: form.notes || null,
    }
    try {
      const saved = await db.createDocument(cfg.databaseId, 'invoices', id, payload)
      setInvoiceId(saved.$id)
      onSaved(saved, docs)
      return saved.$id
    } catch (e) {
      if (e.code === 409) { setInvoiceId(id); return id }
      throw e
    }
  }

  async function handleUpload(e, docType) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const iid = await ensureInvoice()
      const storage = getStorage()
      const db      = getDatabases()
      const fileRes = await storage.createFile(cfg.bucketId, ID.unique(), file)
      const docRec  = await db.createDocument(cfg.databaseId, 'invoice_docs', ID.unique(), {
        invoice_id: iid,
        doc_type:   docType,
        file_name:  file.name,
        file_id:    fileRes.$id,
        file_size:  file.size,
        mime_type:  file.type,
      })
      setDocs(d => [...d, docRec])
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function openDoc(fileId) {
    const storage = getStorage()
    const url = storage.getFileView(cfg.bucketId, fileId)
    window.open(url.toString(), '_blank')
  }

  function downloadDoc(fileId, fileName) {
    const storage = getStorage()
    const url = storage.getFileDownload(cfg.bucketId, fileId)
    const a = document.createElement('a')
    a.href = url.toString(); a.download = fileName; a.target = '_blank'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  async function deleteDoc(docId, fileId) {
    if (!confirm('Supprimer ce document ?')) return
    try {
      const storage = getStorage()
      const db      = getDatabases()
      await storage.deleteFile(cfg.bucketId, fileId)
      await db.deleteDocument(cfg.databaseId, 'invoice_docs', docId)
      setDocs(d => d.filter(x => x.$id !== docId))
    } catch (err) {
      alert('Erreur suppression : ' + err.message)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border-hi rounded-2xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto anim-panelin">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="font-display text-[17px] font-semibold text-navy">
              {op.name} · {entry.company ? `${entry.site} — ${entry.company}` : entry.site}
            </div>
            <div className="text-[11px] text-t3 mt-1">
              {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][month]} {year}
            </div>
          </div>
          <button onClick={onClose} className="text-t3 hover:text-text text-xl leading-none p-1">×</button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="field-label">Montant (MRU)</label>
              <input className="field-input" type="number" placeholder="0.00" step="0.01" min="0"
                value={form.amount} onChange={set('amount')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="field-label">Statut</label>
              <select className="field-input" value={form.status} onChange={set('status')}>
                <option value="missing">Non reçue</option>
                <option value="pending">Reçue — non payée</option>
                <option value="processing">En cours de paiement</option>
                <option value="paid">Payée ✓</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="field-label">Mode de paiement</label>
              <select className="field-input" value={form.payMode} onChange={set('payMode')}>
                <option value="">— Sélectionner —</option>
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="field-label">Date de paiement</label>
              <input className="field-input" type="date" value={form.payDate} onChange={set('payDate')} />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="field-label">Notes</label>
              <textarea className="field-input resize-y min-h-[60px]"
                placeholder="Référence virement, numéro de chèque, remarques…"
                value={form.notes} onChange={set('notes')} />
            </div>
          </div>

          {/* Documents */}
          <div className="mb-4">
            <div className="field-label mb-3">Documents attachés</div>
            {docs.length === 0 ? (
              <div className="text-[11px] text-t3 text-center py-3">Aucun document — uploadez ci-dessous</div>
            ) : (
              <div className="flex flex-col gap-2 mb-2">
                {docs.map(d => (
                  <div key={d.$id} className="flex items-center justify-between px-[10px] py-2 bg-card rounded-lg border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span>📄</span>
                      <span className="text-[11px] text-text truncate max-w-[180px]" title={d.file_name}>{d.file_name}</span>
                      <span className={`text-[9px] px-[6px] py-[1px] rounded-full ${DOC_PILL[d.doc_type]}`}>
                        {DOC_LABELS[d.doc_type]}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openDoc(d.file_id)} className="text-t3 hover:text-text text-xs px-1 py-1 rounded hover:bg-border transition-colors" title="Ouvrir">👁</button>
                      <button onClick={() => downloadDoc(d.file_id, d.file_name)} className="text-t3 hover:text-text text-xs px-1 py-1 rounded hover:bg-border transition-colors" title="Télécharger">↓</button>
                      <button onClick={() => deleteDoc(d.$id, d.file_id)} className="text-red-500 hover:text-red-700 text-xs px-1 py-1 rounded hover:bg-border transition-colors" title="Supprimer">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploading && <div className="text-[11px] text-t3 text-center py-2">Upload en cours…</div>}

            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { type: 'invoice', icon: '📄', label: 'Facture' },
                { type: 'payment', icon: '🧾', label: 'Avis / reçu paiement' },
                { type: 'cheque',  icon: '📋', label: 'Chèque déchargé' },
              ].map(({ type, icon, label }) => (
                <label key={type} className="relative cursor-pointer">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => handleUpload(e, type)} />
                  <div className="flex flex-col items-center justify-center gap-1 py-[10px] px-2 bg-card border border-dashed border-border-hi rounded-lg hover:border-accent hover:bg-accent/5 transition-all text-center">
                    <span className="text-base">{icon}</span>
                    <span className="text-[10px] text-t3">{label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <div className="text-[10px] text-t3">
            {invoice ? 'Modifié : ' + new Date(invoice.$updatedAt).toLocaleString('fr') : 'Nouveau'}
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-accent" onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
