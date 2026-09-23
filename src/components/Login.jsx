import { useState } from 'react'
import { login } from '../lib/supabase'

export default function Login({ onLoggedIn }) {
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
      <div className="w-full max-w-md bg-surface border border-border border-t-4 border-t-brand rounded-2xl p-6 sm:p-10 shadow-sm">
        <img src="/logo.png" alt="Maersk" className="w-12 h-12 mb-4" />
        <div className="font-display text-[22px] font-semibold text-heading mb-1">MaerskPay</div>
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
      </div>
    </div>
  )
}
