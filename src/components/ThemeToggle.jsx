export default function ThemeToggle({ theme, onToggle, className = '' }) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label="Changer de thème"
      className={`w-8 h-8 flex items-center justify-center rounded-full border border-border
                  bg-card text-t2 hover:text-text hover:border-border-hi transition-all ${className}`}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
