import { useState } from 'react'
import { initClient, saveConfig, getConfig, unwrap, DEFAULT_CONFIG } from '../lib/supabase'

export default function ConfigScreen({ onConnected, onCancel }) {
  const saved = getConfig() || {}
  const [form, setForm] = useState({
    url:      saved.url      || DEFAULT_CONFIG.url,
    anonKey:  saved.anonKey  || DEFAULT_CONFIG.anonKey,
    bucketId: saved.bucketId || DEFAULT_CONFIG.bucketId,
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function connect() {
    if (!form.url || !form.anonKey || !form.bucketId) {
      setError('Tous les champs sont requis.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const client = initClient(form)
      // Vérifie que l'URL et la clé sont valides (RLS renvoie simplement 0 ligne si non connecté)
      await unwrap(client.from('invoices').select('id').limit(1))
      saveConfig(form)
      onConnected()
    } catch (e) {
      setError('Connexion échouée : ' + (e.message || JSON.stringify(e)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 sm:p-8 bg-bg">
      <div className="w-full max-w-md bg-surface border border-border border-t-4 border-t-brand rounded-2xl p-6 sm:p-10 shadow-sm">
        <img src="/logo.png" alt="Maersk" className="w-12 h-12 mb-4" />
        <div className="font-display text-[22px] font-semibold text-heading mb-1">Maersk Telecom</div>
        <div className="text-[11px] text-t3 mb-6">Gestion factures opérateurs — Configuration Supabase</div>

        <div className="bg-card border border-border rounded-lg p-3 mb-6 text-[11px] text-t3 leading-6">
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-accent">
            supabase.com/dashboard
          </a>{' '}
          → ton projet → <strong className="text-t2">Project Settings → API</strong> pour l'URL et la clé anon.
        </div>

        {[
          { key: 'url',      label: 'Project URL',    ph: 'https://xxxx.supabase.co' },
          { key: 'anonKey',  label: 'Anon key',       ph: 'eyJhbGciOi…' },
          { key: 'bucketId', label: 'Storage bucket', ph: 'maersk-docs' },
        ].map(({ key, label, ph }) => (
          <div key={key} className="flex flex-col gap-1 mb-3">
            <label className="field-label">{label}</label>
            <input
              className="field-input"
              type="text"
              placeholder={ph}
              value={form[key]}
              onChange={set(key)}
              autoComplete="off"
            />
          </div>
        ))}

        <button
          className="btn btn-accent w-full mt-2"
          onClick={connect}
          disabled={loading}
        >
          {loading ? 'Connexion…' : 'Connexion →'}
        </button>

        {error && <div className="text-red-600 dark:text-red-400 text-[11px] mt-3">{error}</div>}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-t3 hover:text-t2 text-[10px] mt-6 block mx-auto underline underline-offset-2"
          >
            ← Retour à la connexion
          </button>
        )}
      </div>
    </div>
  )
}
