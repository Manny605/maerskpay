import { useState } from 'react'
import { login } from '../lib/appwrite'

export default function Login({ onLoggedIn, onOpenConfig }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Email et mot de passe requis.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      onLoggedIn()
    } catch (e) {
      setError('Connexion échouée : ' + (e.message || 'identifiants invalides'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 sm:p-8 bg-bg">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-10">
        <div className="font-display text-[22px] font-semibold text-heading mb-1">Maersk Telecom</div>
        <div className="text-[11px] text-t3 mb-6">Gestion factures opérateurs — Connexion</div>

        <form onSubmit={submit}>
          <div className="flex flex-col gap-1 mb-3">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="prenom.nom@maersk.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1 mb-3">
            <label className="field-label">Mot de passe</label>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-accent w-full mt-2" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter →'}
          </button>

          {error && <div className="text-red-600 dark:text-red-400 text-[11px] mt-3">{error}</div>}
        </form>

        <button
          type="button"
          onClick={onOpenConfig}
          className="text-t3 hover:text-t2 text-[10px] mt-6 block mx-auto underline underline-offset-2"
        >
          Config avancée
        </button>
      </div>
    </div>
  )
}
