export default function Loading({ text = 'Chargement…', show }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-bg/80 z-[200] flex flex-col items-center justify-center gap-3">
      <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
      <span className="text-xs text-t3">{text}</span>
    </div>
  )
}
