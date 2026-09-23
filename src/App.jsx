import { useState, useCallback, useEffect } from 'react'
import { getCurrentUser, logout } from './lib/supabase'
import { getInitialTheme, applyTheme } from './lib/theme'
import Login from './components/Login'
import Loading from './components/Loading'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Toast from './components/Toast'
import ThemeToggle from './components/ThemeToggle'

export default function App() {
  const [view, setView] = useState('loading') // 'loading' | 'login' | 'app'
  const [tab,  setTab]  = useState('dashboard')
  const [toast, setToast] = useState({ msg: '', type: 'info' })
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => { applyTheme(theme) }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

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

  useEffect(() => { checkSession() }, [checkSession])

  async function handleLogout() {
    try { await logout() } catch (e) {}
    setView('login')
  }

  if (view !== 'app') {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} className="fixed top-3 right-3 z-[400] bg-surface shadow-sm" />
        {view === 'loading' && <Loading show text="Chargement…" />}
        {view === 'login'   && <Login onLoggedIn={() => setView('app')} />}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      {/* Topbar */}
      <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-t-[3px] border-t-brand border-b border-border flex items-center justify-between px-3 sm:px-6 h-[52px]">
        <span className="flex items-center gap-2 font-display text-[15px] sm:text-[17px] font-semibold text-heading tracking-tight truncate">
          <img src="/logo.png" alt="" className="w-7 h-7 shrink-0" />
          Maersk Telecom
          <span className="hidden sm:inline text-t3 text-[11px] font-normal font-sans ml-[10px]">Factures opérateurs</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="btn btn-sm" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex border-b border-border px-3 sm:px-6 bg-surface">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'history',   label: 'Historique' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs border-b-2 -mb-px transition-all ${
              tab === t.id
                ? 'text-heading border-accent font-medium'
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
