import { useEffect } from 'react'

const COLORS = {
  ok:   'bg-green-50 border-green-300 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-300',
  err:  'bg-red-50 border-red-300 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300',
  info: 'bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-300',
}

export default function Toast({ message, type = 'info', onHide }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onHide, 3000)
    return () => clearTimeout(t)
  }, [message, onHide])

  if (!message) return null

  return (
    <div className={`fixed bottom-5 right-5 z-[300] border rounded-lg px-4 py-[10px] shadow-lg
                     text-xs max-w-xs anim-toastin ${COLORS[type]}`}>
      {message}
    </div>
  )
}
