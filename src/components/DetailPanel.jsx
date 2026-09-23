import { useState, useEffect } from 'react'
import { getClient, unwrap, BUCKET, DOC_LABELS, fmtAmt, STATUS_LABELS, docId } from '../lib/supabase'

const DOC_PILL = {
  invoice: 'text-cyan-700 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-500/15',
  payment: 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-500/15',
  cheque:  'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15',
}

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
  const [invoiceId, setInvoiceId] = useState(invoice?.id || null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    setSaving(true)
    const db = getClient()
    const payload = {
      id:          docId(op.id, entry.id, month, year),
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
      const saved = await unwrap(db.from('invoices').upsert(payload).select().single())
      setInvoiceId(saved.id)
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
    const db = getClient()
    const id = docId(op.id, entry.id, month, year)
    const payload = {
      id, operator_id: op.id, entry_id: entry.id,
      month, year, status: form.status,
      amount: parseFloat(form.amount) || null,
      pay_mode: form.payMode || null,
      pay_date: form.payDate || null,
      notes: form.notes || null,
    }
    // ignoreDuplicates : si la facture existe déjà, on ne l'écrase pas (aucune ligne renvoyée)
    const rows = await unwrap(db.from('invoices').upsert(payload, { ignoreDuplicates: true }).select())
    if (rows[0]) onSaved(rows[0], docs)
    setInvoiceId(id)
    return id
  }

  async function handleUpload(e, docType) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const iid = await ensureInvoice()
      const db   = getClient()
      // Chemin ASCII (Supabase refuse accents/espaces) — le nom d'origine reste dans file_name
      const ext  = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
      const path = `${iid}/${crypto.randomUUID()}.${ext}`
      await unwrap(db.storage.from(BUCKET).upload(path, file, { contentType: file.type }))
      const docRec = await unwrap(db.from('invoice_docs').insert({
        invoice_id: iid,
        doc_type:   docType,
        file_name:  file.name,
        file_id:    path,
        file_size:  file.size,
        mime_type:  file.type,
      }).select().single())
      setDocs(d => [...d, docRec])
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // Bucket privé : on génère une URL signée valable 1 h
  async function signedUrl(fileId, opts) {
    const { signedUrl } = await unwrap(getClient().storage.from(BUCKET).createSignedUrl(fileId, 3600, opts))
    return signedUrl
  }

  async function openDoc(fileId) {
    // Ouvre l'onglet tout de suite (sinon bloqué par le navigateur après l'await)
    const win = window.open('', '_blank')
    try {
      win.location.href = await signedUrl(fileId)
    } catch (err) {
      win.close()
      alert('Erreur ouverture : ' + err.message)
    }
  }

  async function downloadDoc(fileId, fileName) {
    try {
      const url = await signedUrl(fileId, { download: fileName })
      const a = document.createElement('a')
      a.href = url; a.download = fileName
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (err) {
      alert('Erreur téléchargement : ' + err.message)
    }
  }

  async function deleteDoc(docId, fileId) {
    if (!confirm('Supprimer ce document ?')) return
    try {
      const db = getClient()
      await unwrap(db.storage.from(BUCKET).remove([fileId]))
      await unwrap(db.from('invoice_docs').delete().eq('id', docId))
      setDocs(d => d.filter(x => x.id !== docId))
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
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border">
          <div>
            <div className="font-display text-[15px] sm:text-[17px] font-semibold text-heading">
              {op.name} · {entry.company ? `${entry.site} — ${entry.company}` : entry.site}
            </div>
            <div className="text-[11px] text-t3 mt-1">
              {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][month]} {year}
            </div>
          </div>
          <button onClick={onClose} className="text-t3 hover:text-text text-xl leading-none p-1">×</button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
            <div className="flex flex-col gap-1 sm:col-span-2">
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
                  <div key={d.id} className="flex items-center justify-between px-[10px] py-2 bg-card rounded-lg border border-border">
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
                      <button onClick={() => deleteDoc(d.id, d.file_id)} className="text-red-500 hover:text-red-700 text-xs px-1 py-1 rounded hover:bg-border transition-colors" title="Supprimer">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploading && <div className="text-[11px] text-t3 text-center py-2">Upload en cours…</div>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
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
        <div className="flex items-center justify-between flex-wrap gap-2 px-4 sm:px-5 py-4 border-t border-border">
          <div className="text-[10px] text-t3">
            {invoice ? 'Modifié : ' + new Date(invoice.updated_at).toLocaleString('fr') : 'Nouveau'}
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
