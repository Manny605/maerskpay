import { useState, useCallback, useEffect } from 'react'
import { getConfig, initClient, getCurrentUser, logout } from './lib/appwrite'
import ConfigScreen from './components/ConfigScreen'
import Login from './components/Login'
import Loading from './components/Loading'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Toast from './components/Toast'

export default function App() {
  const [view, setView] = useState('loading') // 'loading' | 'config' | 'login' | 'app'
  const [tab,  setTab]  = useState('dashboard')
  const [toast, setToast] = useState({ msg: '', type: 'info' })

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type })
  }, [])

  const checkSession = useCallback(async () => {
    try {
      await getCurrentUser()
      setView('app')
    } catch (e) {
      setView('login')
    }
  }, [])

  useEffect(() => {
    const cfg = getConfig()
    if (!cfg) { setView('config'); return }
    try {
      initClient(cfg)
    } catch (e) {
      setView('config')
      return
    }
    checkSession()
  }, [checkSession])

  async function handleLogout() {
    try { await logout() } catch (e) {}
    setView('login')
  }

  if (view === 'loading') return <Loading show text="Chargement…" />
  if (view === 'config')  return <ConfigScreen onConnected={checkSession} onCancel={getConfig() ? () => setView('login') : undefined} />
  if (view === 'login')   return <Login onLoggedIn={() => setView('app')} onOpenConfig={() => setView('config')} />

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      {/* Topbar */}
      <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border flex items-center justify-between px-6 h-[52px]">
        <span className="font-display text-[17px] font-semibold text-navy tracking-tight">
          Maersk Telecom
          <span className="text-t3 text-[11px] font-normal font-sans ml-[10px]">Factures opérateurs</span>
        </span>
        <button className="btn btn-sm" onClick={handleLogout}>Déconnexion</button>
      </div>

      {/* Nav tabs */}
      <div className="flex border-b border-border px-6 bg-surface">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'history',   label: 'Historique' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs border-b-2 -mb-px transition-all ${
              tab === t.id
                ? 'text-navy border-accent font-medium'
                : 'text-t3 border-transparent hover:text-t2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pages */}
      {tab === 'dashboard' && <Dashboard onToast={showToast} />}
      {tab === 'history'   && <History   onToast={showToast} />}

      {/* Toast */}
      <Toast message={toast.msg} type={toast.type} onHide={() => setToast({ msg: '', type: 'info' })} />
    </div>
  )
}
