import { useState } from 'react'
import { initClient, saveConfig, getConfig } from '../lib/appwrite'
import { Query } from 'appwrite'

const DEFAULT_CONFIG = {
  endpoint:   'https://fra.cloud.appwrite.io/v1',
  projectId:  '6a541d570015fc3d18cc',
  databaseId: '6a541f6000166ea3785e',
  bucketId:   '6a5431580032f1e6d98c',
}

export default function ConfigScreen({ onConnected, onCancel }) {
  const saved = getConfig() || {}
  const [form, setForm] = useState({
    endpoint:   saved.endpoint   || DEFAULT_CONFIG.endpoint,
    projectId:  saved.projectId  || DEFAULT_CONFIG.projectId,
    databaseId: saved.databaseId || DEFAULT_CONFIG.databaseId,
    bucketId:   saved.bucketId   || DEFAULT_CONFIG.bucketId,
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function connect() {
    if (!form.projectId || !form.databaseId || !form.bucketId) {
      setError('Tous les champs sont requis.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { databases } = initClient(form)
      try {
        await databases.listDocuments(form.databaseId, 'invoices', [Query.limit(1)])
      } catch (e) {
        if (e.code !== 404 && e.code !== 401) throw e
      }
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
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-10">
        <div className="font-display text-[22px] font-semibold text-heading mb-1">Maersk Telecom</div>
        <div className="text-[11px] text-t3 mb-6">Gestion factures opérateurs — Configuration Appwrite</div>

        <div className="bg-card border border-border rounded-lg p-3 mb-6 text-[11px] text-t3 leading-6">
          <a href="https://cloud.appwrite.io" target="_blank" rel="noreferrer" className="text-accent">
            cloud.appwrite.io
          </a>{' '}
          → ton projet → <strong className="text-t2">Settings → General</strong> pour le Project ID.
        </div>

        {[
          { key: 'endpoint',   label: 'Endpoint',          ph: 'https://cloud.appwrite.io/v1' },
          { key: 'projectId',  label: 'Project ID',        ph: '6a541d570015fc3d18cc' },
          { key: 'databaseId', label: 'Database ID',       ph: 'maerskpay-db' },
          { key: 'bucketId',   label: 'Storage Bucket ID', ph: '6a5431580032f1e6d98c' },
        ].map(({ key, label, ph }) => (
          <div key={key} className="flex flex-col gap-1 mb-3">
            <label className="field-label">{label}</label>
            <input
              className="field-input"
              type={key.includes('Key') || key === 'bucketId' ? 'text' : 'text'}
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
